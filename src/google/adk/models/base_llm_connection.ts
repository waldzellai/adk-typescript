// Base LLM connection module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base LLM connection functionality from the Python SDK

import { Content } from './llm_types';
import { LlmResponse } from './llm_response';

/**
 * Base class for language model connections.
 */
export abstract class BaseLlmConnection {
  /**
   * Sends history to the model.
   * 
   * @param contents The content history to send
   */
  abstract sendHistory(contents: Content[]): Promise<void>;

  /**
   * Sends content to the model.
   * 
   * @param content The content to send
   */
  abstract sendContent(content: Content): Promise<void>;

  /**
   * Sends realtime data to the model.
   * 
   * @param data The data to send
   */
  abstract sendRealtime(data: unknown): Promise<void>;

  /**
   * Receives responses from the model.
   * 
   * @returns An async generator yielding responses from the model
   */
  abstract receive(): AsyncGenerator<LlmResponse, void, unknown>;

  /**
   * Closes the connection.
   */
  abstract close(): Promise<void>;
}