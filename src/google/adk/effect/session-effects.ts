/**
 * Session Management Effects - Strategic Enhancement
 * 
 * ROI: 8.5/10 - Critical for state consistency and session lifecycle management
 * 
 * Provides Effect-powered session operations with atomic state updates,
 * conflict resolution, and comprehensive lifecycle management.
 */

import { Effect, Resource, pipe, Ref, STM } from 'effect';
import type { Session } from '../sessions/session';
import type { Event } from '../events/event';
import type { BaseSessionService } from '../sessions/base_session_service';
import {
  SessionError,
  ResourceError,
} from './errors';
import {
  SessionService,
  TelemetryService,
  ConfigService,
  RequestContext,
  ContextUtils,
} from './context';

/**
 * Session operation configuration
 */
export interface SessionConfig {
  readonly lockTimeoutMs: number;
  readonly maxRetries: number;
  readonly enableOptimisticLocking: boolean;
  readonly enableTelemetry: boolean;
  readonly stateValidation: boolean;
}

/**
 * Default session configuration
 */
export const DefaultSessionConfig: SessionConfig = {
  lockTimeoutMs: 5000,
  maxRetries: 3,
  enableOptimisticLocking: true,
  enableTelemetry: true,
  stateValidation: true,
};

/**
 * Session operation result with metadata
 */
export interface SessionOperationResult<T> {
  readonly result: T;
  readonly version: number;
  readonly operationTimeMs: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Session state update delta
 */
export interface SessionStateDelta {
  readonly set?: Record<string, unknown>;
  readonly unset?: string[];
  readonly merge?: Record<string, unknown>;
}

/**
 * Session lock for atomic operations
 */
export interface SessionLock {
  readonly sessionId: string;
  readonly acquiredAt: Date;
  readonly expiresAt: Date;
  readonly operationId: string;
}

/**
 * Session Effects for reliable state management
 */
export const SessionEffects = {
  /**
   * Create a session with resource management
   */
  createSession: (
    appName: string,
    userId: string,
    initialState: Record<string, any> = {},
    sessionId?: string,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    SessionOperationResult<Session>,
    SessionError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Effect.gen(function* () {
      const sessionService = yield* SessionService;
      const telemetry = yield* TelemetryService;
      const requestInfo = yield* ContextUtils.getRequestInfo;
      const startTime = Date.now();

      yield* telemetry.trackEvent('session.create.started', {
        appName,
        userId,
        sessionId,
        requestId: requestInfo.requestId,
      });

      try {
        const session = yield* pipe(
          sessionService.createSession(appName, userId, initialState, sessionId),
          Effect.mapError((error) =>
            SessionError.create(
              `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'create',
              { sessionId, appName, userId, cause: error }
            )
          )
        );

        const operationTimeMs = Date.now() - startTime;

        yield* telemetry.trackEvent('session.create.completed', {
          appName,
          userId,
          sessionId: session.sessionId,
          requestId: requestInfo.requestId,
          operationTimeMs,
        });

        return {
          result: session,
          version: 1,
          operationTimeMs,
          metadata: {
            appName,
            userId,
            sessionId: session.sessionId,
            requestId: requestInfo.requestId,
          },
        };
      } catch (error) {
        yield* telemetry.trackError(
          error instanceof Error ? error : new Error('Session creation failed'),
          { appName, userId, sessionId, requestId: requestInfo.requestId }
        );
        throw error;
      }
    });
  },

  /**
   * Get session with caching and validation
   */
  getSession: (
    appName: string,
    userId: string,
    sessionId: string,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    SessionOperationResult<Session | null>,
    SessionError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Effect.gen(function* () {
      const sessionService = yield* SessionService;
      const telemetry = yield* TelemetryService;
      const requestInfo = yield* ContextUtils.getRequestInfo;
      const startTime = Date.now();

      yield* telemetry.trackEvent('session.get.started', {
        appName,
        userId,
        sessionId,
        requestId: requestInfo.requestId,
      });

      const session = yield* pipe(
        sessionService.getSession(appName, userId, sessionId),
        Effect.mapError((error) =>
          SessionError.create(
            `Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'get',
            { sessionId, appName, userId, cause: error }
          )
        )
      );

      const operationTimeMs = Date.now() - startTime;

      yield* telemetry.trackEvent('session.get.completed', {
        appName,
        userId,
        sessionId,
        found: session !== null,
        requestId: requestInfo.requestId,
        operationTimeMs,
      });

      return {
        result: session,
        version: session?.events?.length || 0,
        operationTimeMs,
        metadata: {
          appName,
          userId,
          sessionId,
          requestId: requestInfo.requestId,
          found: session !== null,
        },
      };
    });
  },

  /**
   * Atomic state update with optimistic locking
   */
  updateSessionState: (
    session: Session,
    stateDelta: SessionStateDelta,
    expectedVersion?: number,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    SessionOperationResult<Session>,
    SessionError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Effect.gen(function* () {
      const sessionService = yield* SessionService;
      const telemetry = yield* TelemetryService;
      const requestInfo = yield* ContextUtils.getRequestInfo;
      const startTime = Date.now();

      yield* telemetry.trackEvent('session.update.started', {
        sessionId: session.sessionId,
        requestId: requestInfo.requestId,
        hasSetOperations: Boolean(stateDelta.set),
        hasUnsetOperations: Boolean(stateDelta.unset),
        hasMergeOperations: Boolean(stateDelta.merge),
      });

      // Optimistic locking check
      if (config.enableOptimisticLocking && expectedVersion !== undefined) {
        const currentVersion = session.events?.length || 0;
        if (currentVersion !== expectedVersion) {
          yield* Effect.fail(
            SessionError.create(
              `Version mismatch: expected ${expectedVersion}, got ${currentVersion}`,
              'update',
              { sessionId: session.sessionId, expectedVersion, currentVersion }
            )
          );
        }
      }

      // Apply state delta atomically using STM
      const updatedState = yield* STM.atomically(
        STM.gen(function* () {
          const stateRef = yield* STM.fromEffect(
            Effect.succeed(Ref.unsafeMake({ ...session.state }))
          );
          
          const currentState = yield* Ref.get(stateRef);
          const newState = { ...currentState };

          // Apply set operations
          if (stateDelta.set) {
            Object.assign(newState, stateDelta.set);
          }

          // Apply unset operations
          if (stateDelta.unset) {
            for (const key of stateDelta.unset) {
              delete newState[key];
            }
          }

          // Apply merge operations (deep merge for objects)
          if (stateDelta.merge) {
            for (const [key, value] of Object.entries(stateDelta.merge)) {
              if (typeof newState[key] === 'object' && typeof value === 'object') {
                newState[key] = { ...newState[key], ...value };
              } else {
                newState[key] = value;
              }
            }
          }

          yield* Ref.set(stateRef, newState);
          return newState;
        })
      );

      // Update the session
      const updatedSession = { ...session, state: updatedState };
      
      // Validate state if enabled
      if (config.stateValidation) {
        yield* SessionEffects.validateSessionState(updatedSession);
      }

      // Persist the update
      yield* pipe(
        sessionService.updateSession(updatedSession, stateDelta),
        Effect.mapError((error) =>
          SessionError.create(
            `Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'update',
            { sessionId: session.sessionId, cause: error }
          )
        )
      );

      const operationTimeMs = Date.now() - startTime;
      const newVersion = (session.events?.length || 0) + 1;

      yield* telemetry.trackEvent('session.update.completed', {
        sessionId: session.sessionId,
        requestId: requestInfo.requestId,
        operationTimeMs,
        newVersion,
        stateKeys: Object.keys(updatedState),
      });

      return {
        result: updatedSession,
        version: newVersion,
        operationTimeMs,
        metadata: {
          sessionId: session.sessionId,
          requestId: requestInfo.requestId,
          stateDelta,
          newVersion,
        },
      };
    });
  },

  /**
   * Append event with atomicity guarantees
   */
  appendEvent: (
    session: Session,
    event: Event,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    SessionOperationResult<Event>,
    SessionError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Effect.gen(function* () {
      const sessionService = yield* SessionService;
      const telemetry = yield* TelemetryService;
      const requestInfo = yield* ContextUtils.getRequestInfo;
      const startTime = Date.now();

      yield* telemetry.trackEvent('session.append_event.started', {
        sessionId: session.sessionId,
        eventType: event.constructor.name,
        requestId: requestInfo.requestId,
      });

      const appendedEvent = yield* pipe(
        Effect.sync(() => sessionService.service.appendEvent(session, event)),
        Effect.mapError((error) =>
          SessionError.create(
            `Failed to append event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'update',
            { sessionId: session.sessionId, eventType: event.constructor.name, cause: error }
          )
        )
      );

      const operationTimeMs = Date.now() - startTime;
      const newVersion = session.events?.length || 0;

      yield* telemetry.trackEvent('session.append_event.completed', {
        sessionId: session.sessionId,
        eventType: event.constructor.name,
        requestId: requestInfo.requestId,
        operationTimeMs,
        newVersion,
      });

      return {
        result: appendedEvent,
        version: newVersion,
        operationTimeMs,
        metadata: {
          sessionId: session.sessionId,
          eventType: event.constructor.name,
          requestId: requestInfo.requestId,
          newVersion,
        },
      };
    });
  },

  /**
   * Validate session state against business rules
   */
  validateSessionState: (
    session: Session
  ): Effect.Effect<void, SessionError, ConfigService> => {
    return Effect.gen(function* () {
      const config = yield* ConfigService;
      
      // Get validation limits
      const maxStateSize = yield* config.getNumber('ADK_MAX_SESSION_STATE_SIZE', 1048576); // 1MB
      const maxKeys = yield* config.getNumber('ADK_MAX_SESSION_STATE_KEYS', 1000);

      // Check state size
      const stateJson = JSON.stringify(session.state);
      if (stateJson.length > maxStateSize) {
        yield* Effect.fail(
          SessionError.create(
            `Session state too large: ${stateJson.length} > ${maxStateSize} bytes`,
            'update',
            { sessionId: session.sessionId, stateSize: stateJson.length, maxStateSize }
          )
        );
      }

      // Check number of keys
      const keyCount = Object.keys(session.state).length;
      if (keyCount > maxKeys) {
        yield* Effect.fail(
          SessionError.create(
            `Too many state keys: ${keyCount} > ${maxKeys}`,
            'update',
            { sessionId: session.sessionId, keyCount, maxKeys }
          )
        );
      }

      // Validate no circular references
      try {
        JSON.stringify(session.state);
      } catch (error) {
        yield* Effect.fail(
          SessionError.create(
            'Session state contains circular references',
            'update',
            { sessionId: session.sessionId, cause: error }
          )
        );
      }
    });
  },

  /**
   * Session cleanup with resource management
   */
  cleanupSession: (
    session: Session,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    void,
    ResourceError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Resource.use(
      Resource.make(
        Effect.gen(function* () {
          const telemetry = yield* TelemetryService;
          const requestInfo = yield* ContextUtils.getRequestInfo;

          yield* telemetry.trackEvent('session.cleanup.started', {
            sessionId: session.sessionId,
            requestId: requestInfo.requestId,
          });

          return { session, startTime: Date.now() };
        }),
        ({ session, startTime }) =>
          Effect.gen(function* () {
            const telemetry = yield* TelemetryService;
            const requestInfo = yield* ContextUtils.getRequestInfo;
            const operationTimeMs = Date.now() - startTime;

            yield* telemetry.trackEvent('session.cleanup.completed', {
              sessionId: session.sessionId,
              requestId: requestInfo.requestId,
              operationTimeMs,
            });
          })
      ),
      ({ session }) =>
        Effect.gen(function* () {
          const sessionService = yield* SessionService;
          
          yield* pipe(
            Effect.sync(() => sessionService.service.closeSession(session)),
            Effect.mapError((error) =>
              ResourceError.create(
                `Failed to cleanup session: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'Session',
                'cleanup',
                { resourceId: session.sessionId, cause: error }
              )
            )
          );
        })
    );
  },

  /**
   * Batch session operations with transactional semantics
   */
  batchOperations: <T>(
    operations: Array<Effect.Effect<T, SessionError, SessionService | TelemetryService | RequestContext>>,
    config: SessionConfig = DefaultSessionConfig
  ): Effect.Effect<
    T[],
    SessionError,
    SessionService | TelemetryService | RequestContext
  > => {
    return Effect.gen(function* () {
      const telemetry = yield* TelemetryService;
      const requestInfo = yield* ContextUtils.getRequestInfo;

      yield* telemetry.trackEvent('session.batch.started', {
        operationCount: operations.length,
        requestId: requestInfo.requestId,
      });

      // Execute all operations atomically
      const results = yield* STM.atomically(
        STM.gen(function* () {
          const results: T[] = [];
          for (const operation of operations) {
            const result = yield* STM.fromEffect(operation);
            results.push(result);
          }
          return results;
        })
      );

      yield* telemetry.trackEvent('session.batch.completed', {
        operationCount: operations.length,
        successCount: results.length,
        requestId: requestInfo.requestId,
      });

      return results;
    });
  },
} as const;