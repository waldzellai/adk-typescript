// Base tool module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base tool functionality from the Python SDK

import { FunctionDeclaration, LlmRequest, Tool } from '../models/llm_types';
import { ToolContext } from './tool_context';

/**
 * The base class for all tools.
 */
export abstract class BaseTool implements Tool {
  /**
   * The name of the tool.
   */
  name: string;

  /**
   * The description of the tool.
   */
  description: string;

  /**
   * Whether the tool is a long running operation, which typically returns a
   * resource id first and finishes the operation later.
   */
  isLongRunning: boolean = false;

  /**
   * The function declarations of the tool.
   */
  functionDeclarations: FunctionDeclaration[] = [];

  /**
   * Creates a new BaseTool.
   * 
   * @param name The name of the tool
   * @param description The description of the tool
   * @param isLongRunning Whether the tool is a long running operation
   */
  constructor(name: string, description: string, isLongRunning: boolean = false) {
    this.name = name;
    this.description = description;
    this.isLongRunning = isLongRunning;
  }

  /**
   * Gets the OpenAPI specification of this tool in the form of a FunctionDeclaration.
   * 
   * NOTE
   * - Required if subclass uses the default implementation of
   *   `processLlmRequest` to add function declaration to LLM request.
   * - Otherwise, can be skipped, e.g., for a built-in GoogleSearch tool for Gemini.
   * 
   * @returns The FunctionDeclaration of this tool, or null if it doesn't need to be added to LlmRequest.config
   */
  protected getDeclaration(): FunctionDeclaration | null {
    return null;
  }

  /**
   * Runs the tool with the given arguments and context.
   * 
   * NOTE
   * - Required if this tool needs to run at the client side.
   * - Otherwise, can be skipped, e.g., for a built-in GoogleSearch tool for Gemini.
   * 
   * @param args The LLM-filled arguments
   * @param toolContext The context of the tool
   * @returns The result of running the tool
   */
  async runAsync(
    _args: Record<string, unknown>,
    _toolContext: ToolContext
  ): Promise<unknown> {
    throw new Error(`${this.constructor.name}.runAsync is not implemented`);
  }

  /**
   * Processes the outgoing LLM request for this tool.
   * 
   * Use cases:
   * - Most common use case is adding this tool to the LLM request.
   * - Some tools may just preprocess the LLM request before it's sent out.
   * 
   * @param toolContext The context of the tool
   * @param llmRequest The outgoing LLM request, mutable by this method
   */
  async processLlmRequest(
    toolContext: ToolContext,
    llmRequest: LlmRequest
  ): Promise<void> {
    const functionDeclaration = this.getDeclaration();
    if (!functionDeclaration) {
      return;
    }

    // Add tool to the request's tools dictionary - ensure it exists
    if (!('toolsDict' in llmRequest)) {
      (llmRequest as LlmRequest & { toolsDict: Record<string, Tool> }).toolsDict = {};
    }
    (llmRequest as LlmRequest & { toolsDict: Record<string, Tool> }).toolsDict[this.name] = this;

    // Add function declaration to the tools array
    const toolWithFunctionDeclarations = findToolWithFunctionDeclarations(llmRequest);
    
    if (toolWithFunctionDeclarations) {
      if (!toolWithFunctionDeclarations.functionDeclarations) {
        toolWithFunctionDeclarations.functionDeclarations = [];
      }
      toolWithFunctionDeclarations.functionDeclarations.push(functionDeclaration);
    } else {
      // Create a new tools array if needed
      if (!llmRequest.generationConfig) {
        llmRequest.generationConfig = {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          candidateCount: 1,
          maxOutputTokens: 1024
        };
      }
      
      if (!llmRequest.tools) {
        llmRequest.tools = [];
      }
      
      // Add a new tool with this function declaration
      llmRequest.tools.push({
        functionDeclarations: [functionDeclaration]
      });
    }
  }

  /**
   * Gets the API variant to use.
   */
  protected get apiVariant(): string {
    // Check environment variable or config to determine variant
    const useVertexAi = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || 
                        process.env.GOOGLE_GENAI_USE_VERTEXAI === '1';
    return useVertexAi ? 'VERTEX_AI' : 'GOOGLE_AI';
  }
}

/**
 * Finds a tool with function declarations in the request.
 * 
 * @param llmRequest The LLM request to search
 * @returns The first tool with function declarations, or null if none found
 */
function findToolWithFunctionDeclarations(llmRequest: LlmRequest): Tool | null {
  if (!llmRequest.tools || llmRequest.tools.length === 0) {
    return null;
  }

  return llmRequest.tools.find(tool => 
    tool.functionDeclarations && tool.functionDeclarations.length > 0
  ) || null;
}