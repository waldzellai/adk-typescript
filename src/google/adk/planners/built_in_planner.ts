// Built-in planner module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the built-in planner functionality from the Python SDK

import { ReadonlyContext } from '../agents/invocation_context';
import { CallbackContext } from '../agents/invocation_context';
import { LlmRequest } from '../models/llm_types';
import { Part } from '../models/llm_types';
import { BasePlanner } from './base_planner';

/**
 * Thinking configuration for models that support built-in thinking features.
 */
export interface ThinkingConfig {
  enabled: boolean;
  // Additional thinking configuration properties can be added here
}

/**
 * The built-in planner that uses model's built-in thinking features.
 */
export class BuiltInPlanner extends BasePlanner {
  /**
   * Config for model built-in thinking features. An error will be returned if this field is set for models that don't support thinking.
   */
  thinkingConfig: ThinkingConfig;

  /**
   * Creates a new BuiltInPlanner.
   * 
   * @param thinkingConfig Config for model built-in thinking features
   */
  constructor(thinkingConfig: ThinkingConfig) {
    super();
    this.thinkingConfig = thinkingConfig;
  }

  /**
   * Applies the thinking config to the LLM request.
   * 
   * @param llmRequest The LLM request to apply the thinking config to
   */
  applyThinkingConfig(llmRequest: LlmRequest): void {
    if (this.thinkingConfig && llmRequest.generationConfig) {
      llmRequest.generationConfig.thinkingConfig = this.thinkingConfig;
    }
  }

  /**
   * Builds the system instruction to be appended to the LLM request for planning.
   * 
   * @param readonlyContext The readonly context of the invocation
   * @param llmRequest The LLM request (readonly)
   * @returns The planning system instruction, or null if no instruction is needed
   */
  buildPlanningInstruction(
    readonlyContext: ReadonlyContext,
    llmRequest: LlmRequest
  ): string | null {
    return null;
  }

  /**
   * Processes the LLM response for planning.
   * 
   * @param callbackContext The callback context of the invocation
   * @param responseParts The LLM response parts (readonly)
   * @returns The processed response parts, or null if no processing is needed
   */
  processPlanningResponse(
    callbackContext: CallbackContext,
    responseParts: Part[]
  ): Part[] | null {
    return null;
  }
}