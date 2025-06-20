import { runSimpleEffectExamples } from '../src/google/adk/effect/simple-effects';
import { Effect } from 'effect';

/**
 * Demonstrates the Effect-powered utilities included in this repository.
 */
async function main() {
  await Effect.runPromise(runSimpleEffectExamples);
}

main().catch((err) => {
  console.error('Effect example failed:', err);
});
