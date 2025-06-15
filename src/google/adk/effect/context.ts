/**
 * ADK Effect Context System - Strategic Enhancement
 * 
 * ROI: 8.5/10 - Enables powerful dependency injection and service composition
 * 
 * Provides Context.Tag definitions and Layer implementations for core ADK services,
 * enabling clean dependency injection and testability.
 */

import { Context, Layer, Effect } from 'effect';
import type { BaseLlm } from '../models/base_llm';
import type { BaseSessionService } from '../sessions/base_session_service';
import type { BaseTool } from '../tools/base_tool';

/**
 * Core service contexts for dependency injection
 */

/**
 * LLM Service Context - Manages model connections and requests
 */
export interface LlmService {
  readonly model: BaseLlm;
  readonly modelName: string;
  readonly generateContent: (
    request: any
  ) => Effect.Effect<any, any, never>;
  readonly generateContentStream: (
    request: any
  ) => Effect.Effect<AsyncGenerator<any>, any, never>;
}

export const LlmService = Context.GenericTag<LlmService>('ADK/LlmService');

/**
 * Session Service Context - Manages session state and lifecycle
 */
export interface SessionService {
  readonly service: BaseSessionService;
  readonly createSession: (
    appName: string,
    userId: string,
    state?: Record<string, any>,
    sessionId?: string
  ) => Effect.Effect<any, any, never>;
  readonly getSession: (
    appName: string,
    userId: string,
    sessionId: string
  ) => Effect.Effect<any | null, any, never>;
  readonly updateSession: (
    session: any,
    stateDelta: Record<string, any>
  ) => Effect.Effect<void, any, never>;
}

export const SessionService = Context.GenericTag<SessionService>('ADK/SessionService');

/**
 * Tool Registry Context - Manages available tools and their execution
 */
export interface ToolRegistry {
  readonly tools: Map<string, BaseTool>;
  readonly register: (tool: BaseTool) => Effect.Effect<void, any, never>;
  readonly get: (toolName: string) => Effect.Effect<BaseTool, any, never>;
  readonly execute: (
    toolName: string,
    args: Record<string, unknown>,
    context: any
  ) => Effect.Effect<unknown, any, never>;
}

export const ToolRegistry = Context.GenericTag<ToolRegistry>('ADK/ToolRegistry');

/**
 * Telemetry Context - Observability and metrics
 */
export interface TelemetryService {
  readonly trackEvent: (
    eventName: string,
    properties?: Record<string, unknown>
  ) => Effect.Effect<void, never, never>;
  readonly trackMetric: (
    metricName: string,
    value: number,
    tags?: Record<string, string>
  ) => Effect.Effect<void, never, never>;
  readonly trackError: (
    error: Error,
    context?: Record<string, unknown>
  ) => Effect.Effect<void, never, never>;
  readonly startTimer: (
    operationName: string
  ) => Effect.Effect<() => Effect.Effect<void, never, never>, never, never>;
}

export const TelemetryService = Context.GenericTag<TelemetryService>('ADK/TelemetryService');

/**
 * Configuration Context - Environment and runtime configuration
 */
export interface ConfigService {
  readonly getString: (key: string, defaultValue?: string) => Effect.Effect<string, any, never>;
  readonly getNumber: (key: string, defaultValue?: number) => Effect.Effect<number, any, never>;
  readonly getBoolean: (key: string, defaultValue?: boolean) => Effect.Effect<boolean, any, never>;
  readonly getObject: <T>(key: string, defaultValue?: T) => Effect.Effect<T, any, never>;
}

export const ConfigService = Context.GenericTag<ConfigService>('ADK/ConfigService');

/**
 * Request Context - Per-request state and tracing
 */
export interface RequestContext {
  readonly requestId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export const RequestContext = Context.GenericTag<RequestContext>('ADK/RequestContext');

/**
 * Layer implementations for common configurations
 */

/**
 * Creates a default telemetry service layer
 */
export const DefaultTelemetryLayer = Layer.succeed(
  TelemetryService,
  TelemetryService.of({
    trackEvent: (eventName, properties) =>
      Effect.sync(() => {
        console.log(`[TELEMETRY] Event: ${eventName}`, properties);
      }),
    trackMetric: (metricName, value, tags) =>
      Effect.sync(() => {
        console.log(`[TELEMETRY] Metric: ${metricName} = ${value}`, tags);
      }),
    trackError: (error, context) =>
      Effect.sync(() => {
        console.error(`[TELEMETRY] Error:`, error, context);
      }),
    startTimer: (operationName) =>
      Effect.sync(() => {
        const startTime = Date.now();
        return () =>
          Effect.sync(() => {
            const duration = Date.now() - startTime;
            console.log(`[TELEMETRY] Timer: ${operationName} took ${duration}ms`);
          });
      }),
  })
);

/**
 * Creates a configuration service layer from environment variables
 */
export const EnvironmentConfigLayer = Layer.succeed(
  ConfigService,
  ConfigService.of({
    getString: (key, defaultValue) =>
      Effect.sync(() => process.env[key] ?? defaultValue ?? ''),
    getNumber: (key, defaultValue) =>
      Effect.sync(() => {
        const value = process.env[key];
        return value ? Number(value) : defaultValue ?? 0;
      }),
    getBoolean: (key, defaultValue) =>
      Effect.sync(() => {
        const value = process.env[key];
        return value ? value.toLowerCase() === 'true' : defaultValue ?? false;
      }),
    getObject: (key, defaultValue) =>
      Effect.sync(() => {
        const value = process.env[key];
        return value ? JSON.parse(value) : defaultValue;
      }),
  })
);

/**
 * Creates a request context layer with a generated request ID
 */
export const createRequestContextLayer = (options: {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Layer.Layer<RequestContext, never, never> => {
  return Layer.succeed(
    RequestContext,
    RequestContext.of({
      requestId: crypto.randomUUID(),
      userId: options.userId,
      sessionId: options.sessionId,
      timestamp: new Date(),
      metadata: options.metadata ?? {},
    })
  );
};

/**
 * Complete service layer combining all core services
 */
export const CoreServicesLayer = Layer.mergeAll(
  DefaultTelemetryLayer,
  EnvironmentConfigLayer
);

/**
 * Utility functions for working with contexts
 */
export const ContextUtils = {
  /**
   * Extracts request context information for logging
   */
  getRequestInfo: Effect.gen(function* () {
    const requestCtx = yield* RequestContext;
    return {
      requestId: requestCtx.requestId,
      userId: requestCtx.userId,
      sessionId: requestCtx.sessionId,
      timestamp: requestCtx.timestamp.toISOString(),
    };
  }),

  /**
   * Adds telemetry tracking to any effect
   */
  withTelemetry: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    operationName: string,
    metadata?: Record<string, unknown>
  ): Effect.Effect<A, E, R | TelemetryService> => {
    return Effect.gen(function* () {
      const telemetry = yield* TelemetryService;
      const endTimer = yield* telemetry.startTimer(operationName);
      
      yield* telemetry.trackEvent(`${operationName}.started`, metadata);
      
      try {
        const result = yield* effect;
        yield* telemetry.trackEvent(`${operationName}.completed`, metadata);
        yield* endTimer;
        return result;
      } catch (error) {
        yield* telemetry.trackEvent(`${operationName}.failed`, metadata);
        yield* telemetry.trackError(error as Error, metadata);
        yield* endTimer;
        throw error;
      }
    });
  },
} as const;