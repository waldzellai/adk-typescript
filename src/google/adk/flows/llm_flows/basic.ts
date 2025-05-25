// Basic LLM processor module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the basic LLM processor functionality from the Python SDK

import { InvocationContext } from '../../agents/invocation_context';
import { Event } from '../../events/event';
import { LlmRequest, AdkGenerationConfig } from '../../models/llm_types';
import { BaseLlmRequestProcessor } from './_base_llm_processor';

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

    llmRequest.model = typeof (agent as any).canonicalModel === 'string'
      ? (agent as any).canonicalModel
      : (agent as any).canonicalModel.model;
    
    llmRequest.generationConfig = (agent as any).generateContentConfig
      ? {...(agent as any).generateContentConfig}
      : {} as AdkGenerationConfig;
    
    if ((agent as any).outputSchema) {
      // @ts-ignore: 'llmRequest.setOutputSchema' is of type 'unknown'.
      llmRequest.setOutputSchema((agent as any).outputSchema);
    }

    // Initialize liveConnectConfig if it's not already present
    if (!llmRequest.liveConnectConfig) {
      llmRequest.liveConnectConfig = {};
    }

    // @ts-ignore: 'llmRequest.liveConnectConfig' is of type 'unknown'.
    llmRequest.liveConnectConfig.responseModalities =
      invocationContext.runConfig.responseModalities;
    
    // @ts-ignore: 'llmRequest.liveConnectConfig' is of type 'unknown'.
    llmRequest.liveConnectConfig.speechConfig =
      invocationContext.runConfig.speechConfig;
    
    // @ts-ignore: 'llmRequest.liveConnectConfig' is of type 'unknown'.
    llmRequest.liveConnectConfig.outputAudioTranscription =
      invocationContext.runConfig.outputAudioTranscription;

    // TODO: handle tool append here, instead of in BaseTool.processLlmRequest.
  }
}

/**
 * Exports the request processor instance.
 */
export const requestProcessor = new BasicLlmRequestProcessor();