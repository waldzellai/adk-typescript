// Effect type utilities for the Google Agent Development Kit (ADK) in TypeScript
// Conservative foundational types for safe property access and validation

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * Safe property access with Effect.fromNullable pattern
 */
export const safePropertyAccess = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): Effect.Effect<T[K], Error, never> => {
  return Effect.fromNullable(obj).pipe(
    Effect.map(o => o[key]),
    Effect.mapError(() => new Error(`Property access failed: ${String(key)} not found`))
  );
};

/**
 * Safe nested property access with multiple keys
 */
export const safeNestedPropertyAccess = <T>(
  obj: unknown,
  ...keys: (string | number)[]
): Effect.Effect<T, Error, never> => {
  return Effect.fromNullable(obj as Record<string, unknown>).pipe(
    Effect.map(o => {
      let current: unknown = o;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') {
          throw new Error(`Property access failed: ${String(key)} not found`);
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current as T;
    }),
    Effect.mapError(e => new Error(`Nested property access failed: ${e.message}`))
  );
};

/**
 * Agent model schema for safe property access
 */
export const AgentModelSchema = Schema.Struct({
  canonicalModel: Schema.Union(
    Schema.String,
    Schema.Struct({
      model: Schema.String
    })
  ),
  generateContentConfig: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  })),
  outputSchema: Schema.optional(Schema.Unknown)
});

/**
 * Live connect config schema
 */
export const LiveConnectConfigSchema = Schema.Struct({
  responseModalities: Schema.optional(Schema.Unknown),
  speechConfig: Schema.optional(Schema.Unknown),
  outputAudioTranscription: Schema.optional(Schema.Unknown)
});

/**
 * Function call schema for safe access
 */
export const FunctionCallSchema = Schema.Struct({
  functionCall: Schema.optional(Schema.Struct({
    id: Schema.optional(Schema.String),
    name: Schema.String,
    args: Schema.optional(Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    }))
  }))
});

/**
 * Tool dictionary schema
 */
export const ToolDictSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    isLongRunning: Schema.optional(Schema.Boolean)
  })
});

/**
 * Session state schema
 */
export const SessionStateSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Union(
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Null,
    Schema.Unknown
  )
});

/**
 * Safe type conversion with validation
 */
export const safeTypeConversion = <A>(
  schema: Schema.Schema<A>,
  input: unknown
): Effect.Effect<A, Error, never> => {
  return Schema.decodeUnknown(schema)(input).pipe(
    Effect.mapError(e => new Error(`Type conversion failed: ${e.message}`))
  );
};

/**
 * Utility to safely extract string from unknown
 */
export const safeString = (input: unknown): Effect.Effect<string, Error, never> => {
  return safeTypeConversion(Schema.String, input);
};

/**
 * Utility to safely extract record from unknown
 */
export const safeRecord = <T>(
  valueSchema: Schema.Schema<T>,
  input: unknown
): Effect.Effect<Record<string, T>, Error, never> => {
  return safeTypeConversion(Schema.Record({
    key: Schema.String,
    value: valueSchema
  }), input) as Effect.Effect<Record<string, T>, Error, never>;
};

/**
 * Utility to safely extract array from unknown
 */
export const safeArray = <T>(
  itemSchema: Schema.Schema<T>,
  input: unknown
): Effect.Effect<T[], Error, never> => {
  return safeTypeConversion(Schema.Array(itemSchema), input) as Effect.Effect<T[], Error, never>;
};

/**
 * Safe property assignment with validation
 */
export const safePropertyAssignment = <T>(
  obj: Record<string, unknown>,
  key: string,
  value: T,
  schema: Schema.Schema<T>
): Effect.Effect<void, Error, never> => {
  return Effect.gen(function* () {
    const validatedValue = yield* safeTypeConversion(schema, value);
    obj[key] = validatedValue;
  });
};

/**
 * Error types for the Effect integration
 */
export class EffectIntegrationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EffectIntegrationError';
  }
}

export class ValidationError extends EffectIntegrationError {
  constructor(message: string, public readonly validationErrors: unknown[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PropertyAccessError extends EffectIntegrationError {
  constructor(message: string, public readonly propertyPath: string) {
    super(message);
    this.name = 'PropertyAccessError';
  }
}