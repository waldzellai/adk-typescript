// Model registry module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the registry functionality from the Python SDK

import { BaseLlm } from './base_llm';
import { Gemini } from './gemini_llm';
import { OpenAiLlm } from './openai_llm';

/**
 * Registry for LLM implementations.
 * Maps model name patterns to LLM implementations.
 */
export class LlmRegistry {
  // Registry mapping regex patterns to LLM class constructors
  private static registry: Map<RegExp, new (options: any) => BaseLlm> = new Map();

  /**
   * Initializes the registry with default implementations.
   */
  static {
    // Register Gemini models
    for (const pattern of Gemini.supportedModels()) {
      LlmRegistry.register(pattern, Gemini);
    }

    // Register OpenAI models
    for (const pattern of OpenAiLlm.supportedModels()) {
      LlmRegistry.register(pattern, OpenAiLlm);
    }
  }

  /**
   * Registers a model pattern with an LLM implementation.
   * 
   * @param pattern Regex pattern for model names
   * @param llmClass LLM class constructor
   */
  static register(pattern: string, llmClass: new (options: any) => BaseLlm): void {
    const regex = new RegExp(`^${pattern}$`);
    LlmRegistry.registry.set(regex, llmClass);
  }

  /**
   * Resolves a model name to an LLM implementation.
   * 
   * @param model Model name
   * @param options Additional options for the LLM constructor
   * @returns An instance of the appropriate LLM implementation
   * @throws Error if no implementation is found for the model
   */
  static resolve(model: string, options: any = {}): BaseLlm {
    for (const [pattern, LlmClass] of LlmRegistry.registry.entries()) {
      if (pattern.test(model)) {
        return new LlmClass({ ...options, model });
      }
    }
    
    throw new Error(`No LLM implementation found for model: ${model}`);
  }

  /**
   * Creates a new LLM instance for the given model.
   * 
   * @param model Model name
   * @param options Additional options for the LLM constructor
   * @returns An instance of the appropriate LLM implementation
   */
  static createLlm(model: string, options: any = {}): BaseLlm {
    return LlmRegistry.resolve(model, options);
  }
}
