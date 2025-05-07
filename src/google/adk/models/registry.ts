// Model registry module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the registry functionality from the Python SDK

import { BaseLlm, LlmRequest } from './base_llm';
import { GeminiLlm } from './gemini_llm';
import { OpenAiLlm } from './openai_llm';

/**
 * Registry for LLM implementations.
 * Maps model name patterns to LLM implementations.
 */
export class LlmRegistry {
  // Registry mapping regex patterns to LLM class constructors
  private static registry: Map<RegExp, new (options: { model: string; } & LlmRequest) => BaseLlm> = new Map();

  /**
   * Initializes the registry with default implementations.
   */
  static {
    // Register Gemini models
    for (const pattern of GeminiLlm.supportedModels()) {
      LlmRegistry.register(pattern, GeminiLlm);
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
  static register(pattern: string, llmClass: new (options: { model: string; } & LlmRequest) => BaseLlm): void {
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
  static resolve(model: string, options?: LlmRequest): BaseLlm {
    for (const [pattern, LlmClass] of LlmRegistry.registry.entries()) {
      if (pattern.test(model)) {
        // Provide default for contents if options or options.contents is undefined
        const constructorOptions = {
          ...options,
          model,
          contents: options?.contents ?? [],
        };
        return new LlmClass(constructorOptions);
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
  static createLlm(model: string, options: LlmRequest): BaseLlm {
    return LlmRegistry.resolve(model, options);
  }
}
