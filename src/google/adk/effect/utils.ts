// Effect utility functions for conservative integration patterns
// Focus on safe execution and error handling

import { Effect } from 'effect';
import { Schema } from '@effect/schema';

/**
 * Conservative wrapper for unsafe operations
 */
export const safeExecute = <T>(
  operation: () => T,
  errorMessage?: string
): Effect.Effect<T, Error, never> => {
  return Effect.try({
    try: operation,
    catch: (error) => new Error(errorMessage || `Safe execution failed: ${error}`)
  });
};

/**
 * Conservative async wrapper
 */
export const safeExecuteAsync = <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Effect.Effect<T, Error, never> => {
  return Effect.tryPromise({
    try: operation,
    catch: (error) => new Error(errorMessage || `Safe async execution failed: ${error}`)
  });
};

/**
 * Conservative null/undefined check with default
 */
export const getOrDefault = <T>(
  value: T | null | undefined,
  defaultValue: T
): Effect.Effect<T, never, never> => {
  return Effect.succeed(value ?? defaultValue);
};

/**
 * Conservative property check with Effect
 */
export const hasProperty = <T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): Effect.Effect<boolean, never, never> => {
  return Effect.succeed(key in obj);
};

/**
 * Conservative type guard with Effect
 */
export const isTypeOf = (
  value: unknown,
  typeName: string
): Effect.Effect<boolean, never, never> => {
  return Effect.succeed(typeof value === typeName);
};

/**
 * Conservative schema validation with fallback
 */
export const validateOrDefault = <A>(
  schema: Schema.Schema<A>,
  input: unknown,
  defaultValue: A
): Effect.Effect<A, never, never> => {
  return Schema.decodeUnknown(schema)(input).pipe(
    Effect.orElse(() => Effect.succeed(defaultValue))
  );
};

/**
 * Conservative array operation
 */
export const safeArrayAccess = <T>(
  array: T[],
  index: number
): Effect.Effect<T | undefined, never, never> => {
  return Effect.succeed(array[index]);
};

/**
 * Conservative object key extraction
 */
export const safeKeys = (
  obj: Record<string, unknown>
): Effect.Effect<string[], never, never> => {
  return Effect.succeed(Object.keys(obj));
};

/**
 * Conservative value extraction with type checking
 */
export const extractWithTypeCheck = <T>(
  obj: Record<string, unknown>,
  key: string,
  typeCheck: (value: unknown) => value is T
): Effect.Effect<T | undefined, never, never> => {
  return Effect.gen(function* () {
    const value = obj[key];
    if (typeCheck(value)) {
      return value;
    }
    return undefined;
  });
};

/**
 * Type guards for common cases
 */
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number';
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isObject = (value: unknown): value is Record<string, unknown> => 
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);

/**
 * Conservative logging wrapper
 */
export const safeLogAndReturn = <T>(
  value: T,
  message?: string
): Effect.Effect<T, never, never> => {
  return Effect.gen(function* (_) {
    if (message) {
      console.log(message, value);
    }
    return value;
  });
};

/**
 * Conservative error recovery
 */
export const recoverWithDefault = <T, E>(
  effect: Effect.Effect<T, E, never>,
  defaultValue: T
): Effect.Effect<T, never, never> => {
  return effect.pipe(
    Effect.orElse(() => Effect.succeed(defaultValue))
  );
};