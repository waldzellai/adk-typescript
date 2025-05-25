// Built-in code execution tool for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the built_in_code_execution_tool.py from the Python SDK

import { BaseTool } from './base_tool';
import { ToolContext } from './tool_context';
import { LlmRequest } from '../models/llm_request';

/**
 * A built-in code execution tool that is automatically invoked by Gemini 2 models.
 * 
 * This tool operates internally within the model and does not require or perform
 * local code execution.
 */
export class BuiltInCodeExecutionTool extends BaseTool {
  /**
   * Creates a new BuiltInCodeExecutionTool.
   */
  constructor() {
    // Name and description are not used because this is a model built-in tool
    super('code_execution', 'code_execution');
  }

  /**
   * Processes an LLM request to add code execution capability.
   * 
   * @param toolContext The tool context
   * @param llmRequest The LLM request to process
   */
  async processLlmRequest(toolContext: ToolContext, llmRequest: LlmRequest): Promise<void> {
    if (llmRequest.model && llmRequest.model.startsWith('gemini-2')) {
      // Ensure config exists
      llmRequest.generationConfig = llmRequest.generationConfig || {};
      
      // Add code execution tool to the request
      // Note: This is a simplified implementation as the TypeScript SDK might not
      // have the exact same structure as the Python SDK
      if (!llmRequest.tools) {
        llmRequest.tools = [];
      }
      
      // Add code execution tool if not already present
      const hasCodeExecution = llmRequest.tools.some(tool => 
        'functionDeclarations' in tool && 
        tool.functionDeclarations?.some(fn => fn.name === 'code_execution')
      );
      
      if (!hasCodeExecution) {
        llmRequest.tools.push({
          functionDeclarations: [{
            name: 'code_execution',
            description: 'Execute code within the model',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          }]
        });
      }
    } else {
      throw new Error(`Code execution tool is not supported for model ${llmRequest.model}`);
    }
  }
}

/**
 * Singleton instance of the built-in code execution tool.
 */
export const builtInCodeExecution = new BuiltInCodeExecutionTool();
