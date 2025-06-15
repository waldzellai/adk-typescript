/**
 * Resource Management Effects - Strategic Enhancement
 * 
 * ROI: 8.0/10 - Critical for preventing resource leaks and ensuring cleanup
 * 
 * Provides Resource.make patterns for managing connections, file handles,
 * and other resources with guaranteed cleanup semantics.
 */

import { Effect, Resource, pipe, Duration, Schedule } from 'effect';
import {
  ResourceError,
  ConfigError,
} from './errors';
import {
  TelemetryService,
  ConfigService,
  RequestContext,
  ContextUtils,
} from './context';

/**
 * Resource configuration for lifecycle management
 */
export interface ResourceConfig {
  readonly acquireTimeoutMs: number;
  readonly releaseTimeoutMs: number;
  readonly maxRetries: number;
  readonly enableTelemetry: boolean;
  readonly enableHealthChecks: boolean;
  readonly healthCheckIntervalMs: number;
}

/**
 * Default resource configuration
 */
export const DefaultResourceConfig: ResourceConfig = {
  acquireTimeoutMs: 10000,
  releaseTimeoutMs: 5000,
  maxRetries: 3,
  enableTelemetry: true,
  enableHealthChecks: true,
  healthCheckIntervalMs: 30000,
};

/**
 * Resource metadata for tracking and observability
 */
export interface ResourceMetadata {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly acquiredAt: Date;
  readonly lastHealthCheck?: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Health check result for resource monitoring
 */
export interface ResourceHealthCheck {
  readonly healthy: boolean;
  readonly lastChecked: Date;
  readonly errorMessage?: string;
  readonly metrics?: Record<string, number>;
}

/**
 * Resource pool for managing multiple instances
 */
export interface ResourcePool<T> {
  readonly acquire: () => Effect.Effect<T, ResourceError, never>;
  readonly release: (resource: T) => Effect.Effect<void, ResourceError, never>;
  readonly healthCheck: (resource: T) => Effect.Effect<ResourceHealthCheck, never, never>;
  readonly size: () => Effect.Effect<number, never, never>;
  readonly available: () => Effect.Effect<number, never, never>;
}

/**
 * Resource Management Effects
 */
export const ResourceManagement = {
  /**
   * Create a managed resource with comprehensive lifecycle management
   */
  createManagedResource: <T>(
    acquire: () => Effect.Effect<T, ResourceError, TelemetryService | RequestContext>,
    release: (resource: T) => Effect.Effect<void, ResourceError, TelemetryService | RequestContext>,
    config: ResourceConfig = DefaultResourceConfig
  ): Resource.Resource<T, ResourceError, TelemetryService | RequestContext> => {
    return Resource.make(
      Effect.gen(function* () {
        const telemetry = yield* TelemetryService;
        const requestInfo = yield* ContextUtils.getRequestInfo;
        const startTime = Date.now();

        yield* telemetry.trackEvent('resource.acquire.started', {
          requestId: requestInfo.requestId,
        });

        const resource = yield* pipe(
          acquire(),
          Effect.timeout(Duration.millis(config.acquireTimeoutMs)),
          Effect.mapError((error) => {
            if (error._tag === 'TimeoutException') {
              return ResourceError.create(
                `Resource acquisition timed out after ${config.acquireTimeoutMs}ms`,
                'Unknown',
                'acquire',
                { timeoutMs: config.acquireTimeoutMs }
              );
            }
            return error as ResourceError;
          })
        );

        const acquisitionTimeMs = Date.now() - startTime;

        yield* telemetry.trackEvent('resource.acquire.completed', {
          requestId: requestInfo.requestId,
          acquisitionTimeMs,
        });

        return resource;
      }),
      (resource) =>
        Effect.gen(function* () {
          const telemetry = yield* TelemetryService;
          const requestInfo = yield* ContextUtils.getRequestInfo;
          const startTime = Date.now();

          yield* telemetry.trackEvent('resource.release.started', {
            requestId: requestInfo.requestId,
          });

          yield* pipe(
            release(resource),
            Effect.timeout(Duration.millis(config.releaseTimeoutMs)),
            Effect.retry(Schedule.recurs(config.maxRetries)),
            Effect.mapError((error) => {
              if (error._tag === 'TimeoutException') {
                return ResourceError.create(
                  `Resource release timed out after ${config.releaseTimeoutMs}ms`,
                  'Unknown',
                  'release',
                  { timeoutMs: config.releaseTimeoutMs }
                );
              }
              return error as ResourceError;
            }),
            Effect.catchAll((error) =>
              // Log release errors but don't throw to avoid masking original errors
              Effect.gen(function* () {
                yield* telemetry.trackError(
                  new Error(`Resource release failed: ${error.message}`),
                  { requestId: requestInfo.requestId, errorType: error._tag }
                );
              })
            )
          );

          const releaseTimeMs = Date.now() - startTime;

          yield* telemetry.trackEvent('resource.release.completed', {
            requestId: requestInfo.requestId,
            releaseTimeMs,
          });
        })
    );
  },

  /**
   * Create a connection pool with health monitoring
   */
  createConnectionPool: <T>(
    createConnection: () => Effect.Effect<T, ResourceError, TelemetryService>,
    destroyConnection: (connection: T) => Effect.Effect<void, ResourceError, TelemetryService>,
    healthCheck: (connection: T) => Effect.Effect<ResourceHealthCheck, never, never>,
    poolConfig: {
      minSize: number;
      maxSize: number;
      acquireTimeoutMs: number;
      healthCheckIntervalMs: number;
    }
  ): Effect.Effect<ResourcePool<T>, ResourceError, TelemetryService | ConfigService> => {
    return Effect.gen(function* () {
      const telemetry = yield* TelemetryService;
      const config = yield* ConfigService;

      // Pool state management
      const availableConnections: T[] = [];
      const activeConnections = new Set<T>();
      const connectionHealth = new Map<T, ResourceHealthCheck>();

      // Initialize minimum connections
      for (let i = 0; i < poolConfig.minSize; i++) {
        const connection = yield* createConnection();
        availableConnections.push(connection);
      }

      yield* telemetry.trackEvent('connection_pool.initialized', {
        minSize: poolConfig.minSize,
        maxSize: poolConfig.maxSize,
      });

      // Health check scheduler
      const scheduleHealthChecks = Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(poolConfig.healthCheckIntervalMs));
        
        const allConnections = [...availableConnections, ...activeConnections];
        for (const connection of allConnections) {
          const health = yield* healthCheck(connection);
          connectionHealth.set(connection, health);
          
          if (!health.healthy) {
            yield* telemetry.trackEvent('connection_pool.unhealthy_connection', {
              errorMessage: health.errorMessage,
            });
            
            // Remove unhealthy connection
            const availableIndex = availableConnections.indexOf(connection);
            if (availableIndex >= 0) {
              availableConnections.splice(availableIndex, 1);
              yield* destroyConnection(connection);
            }
          }
        }
      });

      // Start health check scheduler in background
      Effect.runFork(
        pipe(
          scheduleHealthChecks,
          Effect.repeat(Schedule.spaced(Duration.millis(poolConfig.healthCheckIntervalMs)))
        )
      );

      const pool: ResourcePool<T> = {
        acquire: () =>
          Effect.gen(function* () {
            const startTime = Date.now();

            // Try to get from available connections
            if (availableConnections.length > 0) {
              const connection = availableConnections.pop()!;
              activeConnections.add(connection);
              
              yield* telemetry.trackEvent('connection_pool.acquire_existing', {
                availableCount: availableConnections.length,
                activeCount: activeConnections.size,
              });
              
              return connection;
            }

            // Create new connection if under max size
            if (activeConnections.size < poolConfig.maxSize) {
              const connection = yield* createConnection();
              activeConnections.add(connection);
              
              yield* telemetry.trackEvent('connection_pool.acquire_new', {
                availableCount: availableConnections.length,
                activeCount: activeConnections.size,
              });
              
              return connection;
            }

            // Wait for connection to become available
            yield* Effect.fail(
              ResourceError.create(
                'Connection pool exhausted',
                'ConnectionPool',
                'acquire',
                { maxSize: poolConfig.maxSize, activeCount: activeConnections.size }
              )
            );
          }),

        release: (connection) =>
          Effect.gen(function* () {
            if (activeConnections.has(connection)) {
              activeConnections.delete(connection);
              
              // Check if connection is healthy before returning to pool
              const health = yield* healthCheck(connection);
              
              if (health.healthy && availableConnections.length < poolConfig.minSize) {
                availableConnections.push(connection);
                
                yield* telemetry.trackEvent('connection_pool.release_to_pool', {
                  availableCount: availableConnections.length,
                  activeCount: activeConnections.size,
                });
              } else {
                yield* destroyConnection(connection);
                
                yield* telemetry.trackEvent('connection_pool.release_destroy', {
                  healthy: health.healthy,
                  availableCount: availableConnections.length,
                  activeCount: activeConnections.size,
                });
              }
            }
          }),

        healthCheck: (connection) => healthCheck(connection),

        size: () => Effect.succeed(availableConnections.length + activeConnections.size),

        available: () => Effect.succeed(availableConnections.length),
      };

      return pool;
    });
  },

  /**
   * File handle resource with automatic cleanup
   */
  createFileResource: (
    filePath: string,
    mode: 'read' | 'write' | 'append' = 'read',
    config: ResourceConfig = DefaultResourceConfig
  ): Resource.Resource<any, ResourceError, TelemetryService | RequestContext> => {
    return ResourceManagement.createManagedResource(
      () =>
        Effect.gen(function* () {
          const telemetry = yield* TelemetryService;
          const requestInfo = yield* ContextUtils.getRequestInfo;

          yield* telemetry.trackEvent('file.open', {
            filePath,
            mode,
            requestId: requestInfo.requestId,
          });

          // In a real implementation, you'd use fs.promises.open
          const handle = yield* Effect.tryPromise({
            try: async () => {
              // Simulate file opening
              return { filePath, mode, opened: true };
            },
            catch: (error) =>
              ResourceError.create(
                `Failed to open file: ${filePath}`,
                'FileHandle',
                'acquire',
                { filePath, mode, cause: error }
              ),
          });

          return handle;
        }),
      (handle) =>
        Effect.gen(function* () {
          const telemetry = yield* TelemetryService;
          const requestInfo = yield* ContextUtils.getRequestInfo;

          yield* telemetry.trackEvent('file.close', {
            filePath: (handle as any).filePath,
            requestId: requestInfo.requestId,
          });

          yield* Effect.tryPromise({
            try: async () => {
              // Simulate file closing
              (handle as any).opened = false;
            },
            catch: (error) =>
              ResourceError.create(
                `Failed to close file: ${(handle as any).filePath}`,
                'FileHandle',
                'release',
                { filePath: (handle as any).filePath, cause: error }
              ),
          });
        }),
      config
    );
  },

  /**
   * Temporary resource with automatic cleanup after timeout
   */
  createTemporaryResource: <T>(
    acquire: () => Effect.Effect<T, ResourceError, TelemetryService>,
    release: (resource: T) => Effect.Effect<void, ResourceError, TelemetryService>,
    maxLifetimeMs: number
  ): Resource.Resource<T, ResourceError, TelemetryService | RequestContext> => {
    return Resource.make(
      Effect.gen(function* () {
        const telemetry = yield* TelemetryService;
        const requestInfo = yield* ContextUtils.getRequestInfo;

        yield* telemetry.trackEvent('temporary_resource.acquire', {
          maxLifetimeMs,
          requestId: requestInfo.requestId,
        });

        const resource = yield* acquire();

        // Schedule automatic cleanup
        Effect.runFork(
          pipe(
            Effect.sleep(Duration.millis(maxLifetimeMs)),
            Effect.andThen(
              Effect.gen(function* () {
                yield* telemetry.trackEvent('temporary_resource.auto_cleanup', {
                  maxLifetimeMs,
                  requestId: requestInfo.requestId,
                });
                yield* release(resource);
              })
            )
          )
        );

        return resource;
      }),
      (resource) =>
        Effect.gen(function* () {
          const telemetry = yield* TelemetryService;
          const requestInfo = yield* ContextUtils.getRequestInfo;

          yield* telemetry.trackEvent('temporary_resource.release', {
            requestId: requestInfo.requestId,
          });

          yield* release(resource);
        })
    );
  },

  /**
   * Resource with retry logic for flaky acquire operations
   */
  createRetryableResource: <T>(
    acquire: () => Effect.Effect<T, ResourceError, TelemetryService>,
    release: (resource: T) => Effect.Effect<void, ResourceError, TelemetryService>,
    retryConfig: {
      maxRetries: number;
      baseDelayMs: number;
      maxDelayMs: number;
    }
  ): Resource.Resource<T, ResourceError, TelemetryService | RequestContext> => {
    return Resource.make(
      pipe(
        acquire(),
        Effect.retry(
          pipe(
            Schedule.exponential(Duration.millis(retryConfig.baseDelayMs)),
            Schedule.intersect(Schedule.recurs(retryConfig.maxRetries)),
            Schedule.intersect(
              Schedule.recurWhile(() => true) // Always retry ResourceErrors
            )
          )
        )
      ),
      release
    );
  },
} as const;