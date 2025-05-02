// Base LLM processor module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base LLM processor functionality from the Python SDK

import { InvocationContext } from '../../agents/invocation_context';
import { Event } from '../../events/event';
import { LlmRequest } from '../../models/llm_types';
import { LlmResponse } from '../../models/llm_response';

/**
 * Base class for LLM request processors.
 */
export abstract class BaseLlmRequestProcessor {
  /**
   * Runs the processor on the given invocation context and LLM request.
   * 
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request to process
   * @returns An async generator yielding events
   */
  abstract runAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown>;
}

/**
 * Base class for LLM response processors.
 */
export abstract class BaseLlmResponseProcessor {
  /**
   * Runs the processor on the given invocation context and LLM response.
   * 
   * @param invocationContext The invocation context
   * @param llmResponse The LLM response to process
   * @returns An async generator yielding events
   */
  abstract runAsync(
    invocationContext: InvocationContext,
    llmResponse: LlmResponse
  ): AsyncGenerator<Event, void, unknown>;
}