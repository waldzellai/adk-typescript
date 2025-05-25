// Base planner module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base planner functionality from the Python SDK

import { ReadonlyContext } from '../agents/invocation_context';
import { CallbackContext } from '../agents/invocation_context';
import { LlmRequest } from '../models/llm_types';
import { AdkPart as Part } from '../models/llm_types';

/**
 * Abstract base class for all planners.
 * 
 * The planner allows the agent to generate plans for the queries to guide its action.
 */
export abstract class BasePlanner {
  /**
   * Builds the system instruction to be appended to the LLM request for planning.
   * 
   * @param readonlyContext The readonly context of the invocation
   * @param llmRequest The LLM request (readonly)
   * @returns The planning system instruction, or null if no instruction is needed
   */
  abstract buildPlanningInstruction(
    readonlyContext: ReadonlyContext,
    llmRequest: LlmRequest
  ): string | null;

  /**
   * Processes the LLM response for planning.
   * 
   * @param callbackContext The callback context of the invocation
   * @param responseParts The LLM response parts (readonly)
   * @returns The processed response parts, or null if no processing is needed
   */
  abstract processPlanningResponse(
    callbackContext: CallbackContext,
    responseParts: Part[]
  ): Part[] | null;
}