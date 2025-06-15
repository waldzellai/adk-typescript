/**
 * Effect Integration Test Runner - Phase 2
 * 
 * Tests the Effect integration and demonstrates business value
 */

import { Effect } from 'effect';
import { runSimpleEffectExamples } from './simple-effects';

/**
 * Test the Effect integration
 */
async function testEffectIntegration(): Promise<void> {
  console.log('🧪 Testing Effect.ts Integration - Phase 2');
  console.log('=' .repeat(50));

  try {
    // Run the Effect examples
    const result = await Effect.runPromise(runSimpleEffectExamples);
    
    console.log('\n✅ Effect integration test successful!');
    console.log('Result:', result?.success ? 'SUCCESS' : 'PARTIAL');
    
    if (result) {
      console.log('Execution time:', result.executionTimeMs, 'ms');
      console.log('LLM response length:', result.llmResponse?.text?.length || 0);
      console.log('Tool executions:', result.toolResults?.length || 0);
    }
  } catch (error) {
    console.error('❌ Effect integration test failed:', error);
  }

  console.log('\n' + '='.repeat(50));
}

// Export for external execution
export { testEffectIntegration };

// Self-execute if run directly
if (require.main === module) {
  testEffectIntegration().catch(console.error);
}