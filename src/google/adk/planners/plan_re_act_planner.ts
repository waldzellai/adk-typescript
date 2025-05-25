// Plan-Re-Act planner module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the Plan-Re-Act planner functionality from the Python SDK

import { ReadonlyContext } from '../agents/invocation_context';
import { CallbackContext } from '../agents/invocation_context';
import { LlmRequest } from '../models/llm_types';
import { AdkPart as Part } from '../models/llm_types';
import { BasePlanner } from './base_planner';

// Tags for different parts of the planning process
export const PLANNING_TAG = '/*PLANNING*/';
export const REPLANNING_TAG = '/*REPLANNING*/';
export const REASONING_TAG = '/*REASONING*/';
export const ACTION_TAG = '/*ACTION*/';
export const FINAL_ANSWER_TAG = '/*FINAL_ANSWER*/';

/**
 * Plan-Re-Act planner that constrains the LLM response to generate a plan before any action/observation.
 * 
 * Note: this planner does not require the model to support built-in thinking features or setting the thinking config.
 */
export class PlanReActPlanner extends BasePlanner {
  /**
   * Builds the system instruction to be appended to the LLM request for planning.
   * 
   * @param readonlyContext The readonly context of the invocation
   * @param llmRequest The LLM request (readonly)
   * @returns The planning system instruction
   */
  buildPlanningInstruction(
    _readonlyContext: ReadonlyContext,
    _llmRequest: LlmRequest
  ): string {
    return this.buildNlPlannerInstruction();
  }

  /**
   * Processes the LLM response for planning.
   * 
   * @param callbackContext The callback context of the invocation
   * @param responseParts The LLM response parts (readonly)
   * @returns The processed response parts, or null if no processing is needed
   */
  processPlanningResponse(
    _callbackContext: CallbackContext,
    responseParts: Part[]
  ): Part[] | null {
    if (!responseParts || responseParts.length === 0) {
      return null;
    }

    const preservedParts: Part[] = [];
    let firstFcPartIndex = -1;
    
    // Find the first function call part
    for (let i = 0; i < responseParts.length; i++) {
      // Stop at the first (group of) function calls
      if (responseParts[i].functionCall) {
        // Ignore and filter out function calls with empty names
        if (!responseParts[i].functionCall?.name) {
          continue;
        }
        preservedParts.push(responseParts[i]);
        firstFcPartIndex = i;
        break;
      }

      // Split the response into reasoning and final answer parts
      this.handleNonFunctionCallParts(responseParts[i], preservedParts);
    }

    // Add subsequent function call parts
    if (firstFcPartIndex > 0) {
      let j = firstFcPartIndex + 1;
      while (j < responseParts.length) {
        if (responseParts[j].functionCall) {
          preservedParts.push(responseParts[j]);
          j += 1;
        } else {
          break;
        }
      }
    }

    return preservedParts;
  }

  /**
   * Splits the text by the last occurrence of the separator.
   * 
   * @param text The text to split
   * @param separator The separator to split on
   * @returns A tuple containing the text before the last separator and the text after the last separator
   */
  private splitByLastPattern(text: string, separator: string): [string, string] {
    const index = text.lastIndexOf(separator);
    if (index === -1) {
      return [text, ''];
    }
    return [
      text.substring(0, index + separator.length),
      text.substring(index + separator.length)
    ];
  }

  /**
   * Handles non-function-call parts of the response.
   * 
   * @param responsePart The response part to handle
   * @param preservedParts The mutable list of parts to store the processed parts in
   */
  private handleNonFunctionCallParts(responsePart: Part, preservedParts: Part[]): void {
    if (responsePart.text && responsePart.text.includes(FINAL_ANSWER_TAG)) {
      const [reasoningText, finalAnswerText] = this.splitByLastPattern(
        responsePart.text,
        FINAL_ANSWER_TAG
      );
      
      if (reasoningText) {
        const reasoningPart = { text: reasoningText } as Part;
        this.markAsThought(reasoningPart);
        preservedParts.push(reasoningPart);
      }
      
      if (finalAnswerText) {
        preservedParts.push({ text: finalAnswerText } as Part);
      }
    } else {
      const responseText = responsePart.text || '';
      
      // If the part is a text part with a planning/reasoning/action tag, label it as reasoning
      if (responseText && (
        responseText.startsWith(PLANNING_TAG) ||
        responseText.startsWith(REASONING_TAG) ||
        responseText.startsWith(ACTION_TAG) ||
        responseText.startsWith(REPLANNING_TAG)
      )) {
        this.markAsThought(responsePart);
      }
      
      preservedParts.push(responsePart);
    }
  }

  /**
   * Marks the response part as thought.
   * 
   * @param responsePart The mutable response part to mark as thought
   */
  private markAsThought(responsePart: Part): void {
    if (responsePart.text) {
      (responsePart as any).thought = true;
    }
  }

  /**
   * Builds the NL planner instruction for the Plan-Re-Act planner.
   * 
   * @returns NL planner system instruction
   */
  private buildNlPlannerInstruction(): string {
    const highLevelPreamble = `
When answering the question, try to leverage the available tools to gather the information instead of your memorized knowledge.

Follow this process when answering the question: (1) first come up with a plan in natural language text format; (2) Then use tools to execute the plan and provide reasoning between tool code snippets to make a summary of current state and next step. Tool code snippets and reasoning should be interleaved with each other. (3) In the end, return one final answer.

Follow this format when answering the question: (1) The planning part should be under ${PLANNING_TAG}. (2) The tool code snippets should be under ${ACTION_TAG}, and the reasoning parts should be under ${REASONING_TAG}. (3) The final answer part should be under ${FINAL_ANSWER_TAG}.
`;

    const planningPreamble = `
Below are the requirements for the planning:
The plan is made to answer the user query if following the plan. The plan is coherent and covers all aspects of information from user query, and only involves the tools that are accessible by the agent. The plan contains the decomposed steps as a numbered list where each step should use one or multiple available tools. By reading the plan, you can intuitively know which tools to trigger or what actions to take.
If the initial plan cannot be successfully executed, you should learn from previous execution results and revise your plan. The revised plan should be be under ${REPLANNING_TAG}. Then use tools to follow the new plan.
`;

    const reasoningPreamble = `
Below are the requirements for the reasoning:
The reasoning makes a summary of the current trajectory based on the user query and tool outputs. Based on the tool outputs and plan, the reasoning also comes up with instructions to the next steps, making the trajectory closer to the final answer.
`;

    const finalAnswerPreamble = `
Below are the requirements for the final answer:
The final answer should be precise and follow query formatting requirements. Some queries may not be answerable with the available tools and information. In those cases, inform the user why you cannot process their query and ask for more information.
`;

    // Only contains the requirements for custom tool/libraries.
    const toolCodeWithoutPythonLibrariesPreamble = `
Below are the requirements for the tool code:

**Custom Tools:** The available tools are described in the context and can be directly used.
- Code must be valid self-contained JavaScript snippets with no imports and no references to tools or libraries that are not in the context.
- You cannot use any parameters or fields that are not explicitly defined in the APIs in the context.
- The code snippets should be readable, efficient, and directly relevant to the user query and reasoning steps.
- When using the tools, you should use the library name together with the function name, e.g., vertexSearch.search().
- If libraries are not provided in the context, NEVER write your own code other than the function calls using the provided tools.
`;

    const userInputPreamble = `
VERY IMPORTANT instruction that you MUST follow in addition to the above instructions:

You should ask for clarification if you need more information to answer the question.
You should prefer using the information available in the context instead of repeated tool use.
`;

    return [
      highLevelPreamble,
      planningPreamble,
      reasoningPreamble,
      finalAnswerPreamble,
      toolCodeWithoutPythonLibrariesPreamble,
      userInputPreamble,
    ].join('\n\n');
  }
}