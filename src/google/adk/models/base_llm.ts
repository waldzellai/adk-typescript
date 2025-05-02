// Base LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base LLM functionality from the Python SDK

import { LlmRequest } from './llm_types';
import { LlmResponse } from './llm_response';
import { BaseLlmConnection } from './base_llm_connection';

/**
 * Base class for language models.
 */
export abstract class BaseLlm {
  /**
   * Model name.
   */
  model: string;

  /**
   * Creates a new BaseLlm.
   * 
   * @param model The model name
   */
  constructor(model: string) {
    this.model = model;
  }

  /**
   * Generates content from the model.
   * 
   * @param request The request to the model
   * @param stream Whether to stream the response
   * @returns The response from the model
   */
  abstract generateContent(
    request: LlmRequest,
    stream?: boolean
  ): Promise<LlmResponse>;

  /**
   * Generates content from the model asynchronously.
   * 
   * @param request The request to the model
   * @param stream Whether to stream the response
   * @returns An async generator yielding responses from the model
   */
  abstract generateContentAsync(
    request: LlmRequest,
    stream?: boolean
  ): AsyncGenerator<LlmResponse, void, unknown>;

  /**
   * Connects to the model for live interaction.
   * 
   * @param request The request to the model
   * @returns A connection to the model
   */
  abstract connect(request: LlmRequest): Promise<BaseLlmConnection>;
}