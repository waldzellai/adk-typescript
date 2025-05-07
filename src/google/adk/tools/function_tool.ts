// Function tool module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the FunctionTool functionality from the Python SDK

import { AdkFunctionDeclaration } from '../models/llm_types';
import { BaseTool } from './base_tool';
import { ToolContext } from './tool_context';
import { buildFunctionDeclaration } from './function_parameter_parse_util';

/**
 * A tool that wraps a user-defined TypeScript function.
 */
export class FunctionTool extends BaseTool {
  /**
   * The function to wrap.
   */
  private func: (args: Record<string, unknown>, toolContext?: ToolContext) => Promise<unknown> | unknown;

  /**
   * The function declaration cache.
   */
  private functionDeclaration: AdkFunctionDeclaration | null = null;

  /**
   * Creates a new FunctionTool.
   * 
   * @param func The function to wrap
   * @param name Optional name for the tool (defaults to function name)
   * @param description Optional description for the tool (defaults to function docstring if available)
   * @param isLongRunning Whether the tool is a long running operation
   */
  constructor(
    func: (args: Record<string, unknown>, toolContext?: ToolContext) => Promise<unknown> | unknown,
    name?: string,
    description?: string,
    isLongRunning: boolean = false
  ) {
    // Make sure func is not undefined
    if (!func) {
      throw new Error('Function cannot be undefined');
    }
    
    // Assign the function first before passing to parent constructor
    // to avoid undefined func during getDeclaration call
    const funcName = name || (func.name || 'anonymous_function');
    
    // Extract JSDoc comment - more thorough extraction to ensure we get the comment
    let funcDescription = description || '';
    if (!description) {
      const funcStr = func.toString();
      const docComment = funcStr.match(/\/\*\*([\s\S]*?)\*\//);
      if (docComment && docComment[1]) {
        funcDescription = docComment[1]
          .replace(/^\s*\*\s*/gm, ' ')  // Remove * prefix from each line
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
      }
    }
    
    super(funcName, funcDescription, isLongRunning);
    
    // Store the function
    this.func = func;
    
    // Pre-compute the function declaration to avoid issues later
    try {
      if (func) {
        this.functionDeclaration = buildFunctionDeclaration(func, { ignoreParams: ['toolContext'] });
      }
    } catch (error) {
      console.warn('Failed to build function declaration:', error);
      this.functionDeclaration = {
        name: funcName,
        description: funcDescription
      };
    }
  }

  /**
   * Gets the OpenAPI specification of this tool in the form of a FunctionDeclaration.
   * 
   * @returns The FunctionDeclaration of this tool
   */
  protected override getDeclaration(): AdkFunctionDeclaration | null {
    // Return the cached declaration if available
    if (this.functionDeclaration) {
      return this.functionDeclaration;
    }
    
    // Only try to build the declaration if the function is defined
    if (this.func) {
      try {
        return buildFunctionDeclaration(this.func, { ignoreParams: ['toolContext'] });
      } catch (error) {
        console.warn('Failed to build function declaration:', error);
        return {
          name: this.name,
          description: this.description
        };
      }
    }
    
    // Fallback to a minimal declaration
    return {
      name: this.name,
      description: this.description
    };
  }

  /**
   * Runs the tool with the given arguments and context.
   * 
   * @param args The LLM-filled arguments
   * @param toolContext The context of the tool
   * @returns The result of running the tool
   */
  override async runAsync(
    args: Record<string, unknown>,
    toolContext: ToolContext
  ): Promise<unknown> {
    try {
      // Check if the function accepts toolContext
      const funcString = this.func.toString();
      const acceptsToolContext = funcString.includes('toolContext');
      
      const argsToCall: Record<string, unknown> = { ...args };
      
      // Check for missing required parameters
      const declaration = this.getDeclaration();
      if (declaration && declaration.parameters && declaration.parameters.required) {
        // Check if all required parameters are present
        const missingParams = declaration.parameters.required.filter(
          (param: string) => !(param in args)
        );
        if (missingParams.length > 0) {
          const missingParamsStr = missingParams.join('\n');
          return {
            error: `Invoking \`${this.name}()\` failed as the following mandatory input parameters are not present:
${missingParamsStr}
You could retry calling this tool, but it is IMPORTANT for you to provide all the mandatory parameters.`
          };
        }
      }
      
      // Call the function with appropriate arguments
      if (acceptsToolContext) {
        return await Promise.resolve(this.func(argsToCall, toolContext)) || {};
      } else {
        return await Promise.resolve(this.func(argsToCall)) || {};
      }
    } catch (error) {
      return {
        error: `Error running tool ${this.name}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Identifies missing required parameters for a function call.
   * 
   * @param args The arguments passed to the function
   * @param declaration The function declaration
   * @returns A list of missing required parameter names
   */
  private getMissingRequiredParameters(
    args: Record<string, unknown>,
    declaration: AdkFunctionDeclaration | null
  ): string[] {
    if (!declaration || !declaration.parameters || !declaration.parameters.required) {
      return [];
    }
    
    return declaration.parameters.required.filter((param: string) => !(param in args));
  }
}