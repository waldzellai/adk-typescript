/**
 * ADK Effect Error Hierarchy - Strategic Enhancement
 * 
 * ROI: 9.5/10 - Critical for production reliability
 * 
 * Provides a standardized, typed error system using Effect's Data.TaggedError
 * for comprehensive error handling across LLM operations, tool execution,
 * and session management.
 */

import { Data } from 'effect';

/**
 * Base ADK error with enhanced context and traceability
 */
export interface AdkError {
  readonly _tag: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}

/**
 * LLM-specific errors with detailed context
 */
export class LlmError extends Data.TaggedError('LlmError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly modelName?: string;
  readonly requestId?: string;
  readonly tokenCount?: number;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}> {
  static create(
    message: string,
    options: {
      modelName?: string;
      requestId?: string;
      tokenCount?: number;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ): LlmError {
    return new LlmError({
      message,
      timestamp: new Date(),
      ...options,
    });
  }
}

/**
 * Rate limiting specific error
 */
export class LlmRateLimitError extends Data.TaggedError('LlmRateLimitError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly retryAfter?: number;
  readonly requestsPerMinute?: number;
  readonly context?: Record<string, unknown>;
}> {
  static create(
    message: string,
    options: {
      retryAfter?: number;
      requestsPerMinute?: number;
      context?: Record<string, unknown>;
    } = {}
  ): LlmRateLimitError {
    return new LlmRateLimitError({
      message,
      timestamp: new Date(),
      ...options,
    });
  }
}

/**
 * Model-specific errors (quota, availability, etc.)
 */
export class LlmModelError extends Data.TaggedError('LlmModelError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly modelName: string;
  readonly errorCode?: string;
  readonly available?: boolean;
  readonly context?: Record<string, unknown>;
}> {
  static create(
    message: string,
    modelName: string,
    options: {
      errorCode?: string;
      available?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ): LlmModelError {
    return new LlmModelError({
      message,
      timestamp: new Date(),
      modelName,
      ...options,
    });
  }
}

/**
 * Tool execution errors with comprehensive context
 */
export class ToolError extends Data.TaggedError('ToolError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly toolName: string;
  readonly phase: 'initialization' | 'execution' | 'cleanup';
  readonly args?: Record<string, unknown>;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}> {
  static create(
    message: string,
    toolName: string,
    phase: 'initialization' | 'execution' | 'cleanup',
    options: {
      args?: Record<string, unknown>;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ): ToolError {
    return new ToolError({
      message,
      timestamp: new Date(),
      toolName,
      phase,
      ...options,
    });
  }
}

/**
 * Tool timeout specific error
 */
export class ToolTimeoutError extends Data.TaggedError('ToolTimeoutError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly toolName: string;
  readonly timeoutMs: number;
  readonly elapsedMs?: number;
  readonly context?: Record<string, unknown>;
}> {
  static create(
    message: string,
    toolName: string,
    timeoutMs: number,
    options: {
      elapsedMs?: number;
      context?: Record<string, unknown>;
    } = {}
  ): ToolTimeoutError {
    return new ToolTimeoutError({
      message,
      timestamp: new Date(),
      toolName,
      timeoutMs,
      ...options,
    });
  }
}

/**
 * Session management errors
 */
export class SessionError extends Data.TaggedError('SessionError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly sessionId?: string;
  readonly operation: 'create' | 'get' | 'update' | 'delete' | 'list';
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}> {
  static create(
    message: string,
    operation: 'create' | 'get' | 'update' | 'delete' | 'list',
    options: {
      sessionId?: string;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ): SessionError {
    return new SessionError({
      message,
      timestamp: new Date(),
      operation,
      ...options,
    });
  }
}

/**
 * Configuration and setup errors
 */
export class ConfigError extends Data.TaggedError('ConfigError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly configKey?: string;
  readonly expectedType?: string;
  readonly actualValue?: unknown;
  readonly context?: Record<string, unknown>;
}> {
  static create(
    message: string,
    options: {
      configKey?: string;
      expectedType?: string;
      actualValue?: unknown;
      context?: Record<string, unknown>;
    } = {}
  ): ConfigError {
    return new ConfigError({
      message,
      timestamp: new Date(),
      ...options,
    });
  }
}

/**
 * Resource management errors
 */
export class ResourceError extends Data.TaggedError('ResourceError')<{
  readonly message: string;
  readonly timestamp: Date;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly operation: 'acquire' | 'release' | 'cleanup';
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}> {
  static create(
    message: string,
    resourceType: string,
    operation: 'acquire' | 'release' | 'cleanup',
    options: {
      resourceId?: string;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ): ResourceError {
    return new ResourceError({
      message,
      timestamp: new Date(),
      resourceType,
      operation,
      ...options,
    });
  }
}

/**
 * Union type of all ADK errors for pattern matching
 */
export type AdkErrorTypes =
  | LlmError
  | LlmRateLimitError
  | LlmModelError
  | ToolError
  | ToolTimeoutError
  | SessionError
  | ConfigError
  | ResourceError;

/**
 * Error recovery strategies
 */
export const ErrorRecoveryStrategies = {
  /**
   * Exponential backoff for rate limits
   */
  exponentialBackoff: (attempt: number, baseDelayMs: number = 1000): number => {
    return Math.min(baseDelayMs * Math.pow(2, attempt), 30000);
  },

  /**
   * Linear backoff for temporary failures
   */
  linearBackoff: (attempt: number, delayMs: number = 1000): number => {
    return delayMs * attempt;
  },

  /**
   * Jittered delay to prevent thundering herd
   */
  jitteredDelay: (baseDelayMs: number): number => {
    return baseDelayMs + Math.random() * baseDelayMs * 0.1;
  },
} as const;