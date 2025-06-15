// Effect utilities index for the Google Agent Development Kit (ADK) in TypeScript
// Phase 1 & 2 Combined: Conservative foundation + Strategic enhancements

// Phase 1: Conservative Effect integration patterns
export * from './types';
export * from './utils';

// Phase 2: Strategic Enhancement patterns
export * from './simple-effects';

// Re-export key Effect primitives for convenience
export {
  Effect,
  Data,
  pipe,
} from 'effect';
