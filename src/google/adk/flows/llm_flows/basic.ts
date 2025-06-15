// Basic LLM processor module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the basic LLM processor functionality from the Python SDK

import { InvocationContext } from '../../agents/invocation_context';
import { Event } from '../../events/event';
import { LlmRequest, AdkGenerationConfig } from '../../models/llm_types';
import { BaseLlmRequestProcessor } from './_base_llm_processor';
import { Effect } from 'effect';
import { 
  safePropertyAccess, 
  hasProperty,
  isObject,
  isString
} from '../../effect';

/**
 * Handles basic information to build the LLM request.
 */
class BasicLlmRequestProcessor extends BaseLlmRequestProcessor {
  /**
   * Runs the processor on the given invocation context and LLM request.
   * 
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request to process
   * @returns An async generator yielding events
   */
  async *runAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown> {
    const agent = invocationContext.agent;
    
    if (!agent || !('canonicalModel' in agent)) {
      return;
    }

    // Conservative Effect-based safe property access
    const processAgent = Effect.gen(function* (_) {
      // Safe access to canonicalModel
      const canonicalModel = yield* safePropertyAccess(agent, 'canonicalModel' as keyof typeof agent);
      
      if (isString(canonicalModel)) {
        llmRequest.model = canonicalModel;
      } else if (isObject(canonicalModel) && 'model' in canonicalModel) {
        const modelValue = yield* safePropertyAccess(canonicalModel, 'model' as keyof typeof canonicalModel);
        if (isString(modelValue)) {
          llmRequest.model = modelValue;
        }
      }

      // Safe access to generateContentConfig
      const hasGenerateConfig = yield* hasProperty(agent, 'generateContentConfig');
      if (hasGenerateConfig) {
        const generateConfig = yield* safePropertyAccess(agent, 'generateContentConfig' as keyof typeof agent);
        if (isObject(generateConfig)) {
          llmRequest.generationConfig = {...generateConfig} as AdkGenerationConfig;
        } else {
          llmRequest.generationConfig = {} as AdkGenerationConfig;
        }
      } else {
        llmRequest.generationConfig = {} as AdkGenerationConfig;
      }

      // Safe access to outputSchema
      const hasOutputSchema = yield* hasProperty(agent, 'outputSchema');
      if (hasOutputSchema) {
        const outputSchema = yield* safePropertyAccess(agent, 'outputSchema' as keyof typeof agent);
        if (outputSchema && typeof (llmRequest as { setOutputSchema?: (schema: unknown) => void }).setOutputSchema === 'function') {
          (llmRequest as { setOutputSchema: (schema: unknown) => void }).setOutputSchema(outputSchema);
        }
      }

      // Initialize liveConnectConfig safely
      if (!llmRequest.liveConnectConfig) {
        llmRequest.liveConnectConfig = {};
      }

      // Safe assignment to liveConnectConfig properties
      const liveConfig = llmRequest.liveConnectConfig as Record<string, unknown>;
      liveConfig.responseModalities = invocationContext.runConfig.responseModalities;
      liveConfig.speechConfig = invocationContext.runConfig.speechConfig;
      liveConfig.outputAudioTranscription = invocationContext.runConfig.outputAudioTranscription;

      return void 0;
    });

    // Execute the Effect-based processing with error recovery
    Effect.runSync(
      processAgent.pipe(
        Effect.orElse(() => Effect.succeed(void 0))
      )
    );

    // TODO: handle tool append here, instead of in BaseTool.processLlmRequest.
  }
}

/**
 * Exports the request processor instance.
 */
export const requestProcessor = new BasicLlmRequestProcessor();