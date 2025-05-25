/**
 * Base tool module for the Google Agent Development Kit (ADK) in TypeScript.
 * @module google/adk/tools/base_tool
 * @description
 * The base tool module provides the foundation for creating tools that can be used by agents
 * in the Google Agent Development Kit (ADK). Tools are functions that can be invoked by
 * LLM models to perform actions like retrieving information, making API calls, or manipulating data.
 * 
 * This module defines the BaseTool abstract class, which all tool implementations extend.
 * Tools follow a consistent pattern:
 * 1. They declare their capabilities via function declarations
 * 2. They process LLM requests to register themselves
 * 3. They execute operations when invoked by the LLM
 */

import { AdkFunctionDeclaration, LlmRequest, AdkTool } from '../models/base_llm';
import { ToolContext } from './tool_context';

/**
 * The base class for all tools in the ADK.
 * 
 * Tools are functions that can be invoked by LLM models to perform actions
 * like retrieving information, making API calls, or manipulating data.
 * 
 * All custom tools should extend this class and implement at minimum:
 * - getDeclaration(): To describe the tool's parameters and functionality
 * - runAsync(): To execute the tool's logic when invoked
 * 
 * @example
 * ```typescript
 * class WeatherTool extends BaseTool {
 *   constructor() {
 *     super('getWeather', 'Get the current weather for a location');
 *   }
 *   
 *   protected getDeclaration(): AdkFunctionDeclaration {
 *     return {
 *       name: this.name,
 *       description: this.description,
 *       parameters: {
 *         type: Type.OBJECT,
 *         properties: {
 *           location: {
 *             type: Type.STRING,
 *             description: 'The location to get weather for'
 *           }
 *         },
 *         required: ['location']
 *       }
 *     };
 *   }
 *   
 *   async runAsync(args: Record<string, unknown>): Promise<unknown> {
 *     const location = args.location as string;
 *     // Fetch weather data
 *     return { temperature: 72, conditions: 'sunny' };
 *   }
 * }
 * ```
 */
export abstract class BaseTool implements AdkTool {
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
  functionDeclarations: AdkFunctionDeclaration[] = [];
  
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
    
    // Initialize function declarations based on getDeclaration 
    const declaration = this.getDeclaration();
    if (declaration) {
      this.functionDeclarations = [declaration];
    }
  }

  /**
   * Gets the OpenAPI specification of this tool in the form of an AdkFunctionDeclaration.
   * 
   * This method defines the signature and behavior of the tool, including its parameters,
   * their types, and any constraints. This information is used by the LLM to understand
   * when and how to invoke the tool.
   * 
   * The default implementation returns null, which means the tool will not be added to
   * the LLM request. Subclasses should override this method to provide their specific
   * function declarations.
   * 
   * NOTE:
   * - Required if subclass uses the default implementation of `processLlmRequest` 
   *   to add function declaration to LLM request.
   * - May return null for tools that are handled natively by the LLM service,
   *   such as built-in Google Search for Gemini.
   * 
   * @returns The AdkFunctionDeclaration describing this tool's interface, or null if 
   *          it doesn't need to be added to the LLM request
   */
  protected getDeclaration(): AdkFunctionDeclaration | null {
    return null;
  }

  /**
   * Executes the tool's logic with the provided arguments and context.
   * 
   * This is the core method that implements the tool's functionality. It is called
   * when the LLM decides to invoke the tool during an interaction. The arguments
   * are filled in by the LLM based on the function declaration.
   * 
   * Subclasses must override this method to provide their specific functionality.
   * The implementation should:
   * 1. Validate the arguments
   * 2. Execute the tool's logic
   * 3. Return the result in a format that can be serialized to JSON
   * 
   * NOTE:
   * - Required for any tool that needs to execute on the client side
   * - May throw an error for tools that are handled natively by the LLM service
   * 
   * @param args - The arguments provided by the LLM when invoking the tool
   * @param toolContext - The context in which the tool is being executed
   * @returns A Promise resolving to the tool's execution result
   * @throws Error if the tool is not implemented or if execution fails
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

    // Ensure toolsDict is initialized properly
    if (!llmRequest.toolsDict) {
      llmRequest.toolsDict = {}; 
    }
    
    // Store the tool instance itself
    llmRequest.toolsDict[this.name] = this;

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
function findToolWithFunctionDeclarations(llmRequest: LlmRequest): AdkTool | null {
  if (!llmRequest.tools || llmRequest.tools.length === 0) {
    return null;
  }

  return llmRequest.tools.find(tool => 
    tool.functionDeclarations && tool.functionDeclarations.length > 0
  ) || null;
}