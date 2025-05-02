// Basic LLM processor module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the basic LLM processor functionality from the Python SDK

import { InvocationContext } from '../../agents/invocation_context';
import { Event } from '../../events/event';
import { LlmRequest, GenerationConfig } from '../../models/llm_types';
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

    llmRequest.model = typeof agent.canonicalModel === 'string'
      ? agent.canonicalModel
      : agent.canonicalModel.model;
    
    llmRequest.generationConfig = agent.generateContentConfig
      ? {...agent.generateContentConfig}
      : {} as GenerationConfig;
    
    if (agent.outputSchema) {
      llmRequest.setOutputSchema(agent.outputSchema);
    }

    if (llmRequest.liveConnectConfig) {
      llmRequest.liveConnectConfig.responseModalities = 
        invocationContext.runConfig.responseModalities;
      
      llmRequest.liveConnectConfig.speechConfig = 
        invocationContext.runConfig.speechConfig;
      
      llmRequest.liveConnectConfig.outputAudioTranscription = 
        invocationContext.runConfig.outputAudioTranscription;
    }

    // TODO: handle tool append here, instead of in BaseTool.processLlmRequest.

    // Generator requires yield statement in function body
    if (false) {
      yield {} as Event;
    }
  }
}

/**
 * Exports the request processor instance.
 */
export const requestProcessor = new BasicLlmRequestProcessor();