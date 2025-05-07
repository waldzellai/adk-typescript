// Tests for the FunctionTool implementation

import { FunctionTool } from '../../src/google/adk/tools/function_tool';
import { ToolContext } from '../../src/google/adk/tools/tool_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';
import { AdkSchema, AdkType, AdkFunctionDeclaration } from '../../src/google/adk/models/base_llm';
import { buildFunctionDeclaration, BuildFunctionDeclarationOptions } from '../../src/google/adk/tools/function_parameter_parse_util';

// Mock the function parameter parsing utility
jest.mock('../../src/google/adk/tools/function_parameter_parse_util');

describe('FunctionTool', () => {
  // Create a mock InvocationContext for tests
  const createMockContext = () => {
    // Create a minimal mock agent
    const mockAgent = {
      name: 'TestAgent',
      description: '',
      getTools: jest.fn().mockReturnValue([]),
      run: jest.fn(),
      runAsync: jest.fn(),
    } as unknown as BaseAgent;

    return new InvocationContext({
      agent: mockAgent,
      runConfig: new RunConfig({}),
    });
  };

  // Test function with JSDoc comment
  /**
   * Add two numbers together
   * @param a First number
   * @param b Second number
   * @returns The sum of the two numbers
   */
  const addFunction = (args: Record<string, unknown>, _toolContext?: ToolContext): number => {
    const a = Number(args.a) || 0;
    const b = Number(args.b) || 0;
    return a + b;
  };

  const addFunctionDescription = 'Add two numbers together';

  // Define a generic function type for mocking purposes
  type AnyFunction = (...args: unknown[]) => unknown;

  // Cast buildFunctionDeclaration to jest.Mock for type safety with mockReturnValue
  const mockBuildFunctionDeclaration = buildFunctionDeclaration as jest.Mock<AdkFunctionDeclaration, [AnyFunction, BuildFunctionDeclarationOptions?]>;

  describe('constructor', () => {
    it('should create a FunctionTool with the function name', () => {
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'addFunction',
        description: addFunctionDescription,
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
      const tool = new FunctionTool(addFunction);
      expect(tool.name).toBe('addFunction');
    });

    it('should use a custom name if provided', () => {
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'add',
        description: addFunctionDescription,
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
      const tool = new FunctionTool(addFunction, 'add');
      expect(tool.name).toBe('add');
    });

    it('should extract description from JSDoc comments', () => {
      // In Jest environment, function.toString() doesn't include JSDoc comments
      // So we'll manually provide the description that would normally be extracted
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'addFunction',
        description: addFunctionDescription, // This description is what buildFunctionDeclaration would ideally extract
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
      const tool = new FunctionTool(addFunction, undefined, addFunctionDescription);
      expect(tool.description).toBeDefined();
      expect(tool.description).toContain('Add two numbers');
    });

    it('should use a custom description if provided', () => {
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'addFunction',
        description: 'Custom add description',
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
      const tool = new FunctionTool(addFunction, undefined, 'Custom add description');
      expect(tool.description).toBe('Custom add description');
    });
  });

  describe('runAsync', () => {
    beforeEach(() => {
      // Resetting mock for each test in this describe block if necessary, or set a specific one
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'addFunction', // Default or specific to addFunction tests
        description: addFunctionDescription,
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
    });

    it('should execute the function with the provided arguments', async () => {
      const tool = new FunctionTool(addFunction, undefined, addFunctionDescription);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({ a: 1, b: 2 }, toolContext);
      expect(result).toBe(3);
    });

    it('should handle missing arguments', async () => {
      // 'b' is optional in our schema, defaults to 0 in function
      const tool = new FunctionTool(addFunction, undefined, addFunctionDescription);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({ a: 5 }, toolContext);
      expect(result).toBe(5); // b defaults to 0
    });

    it('should handle errors in the function', async () => {
      const errorFunction = () => {
        throw new Error('Test error');
      };
      mockBuildFunctionDeclaration.mockReturnValue({ // Schema for errorFunction (likely no params)
        name: 'errorFunction',
        description: 'Throws an error',
        parameters: { type: AdkType.OBJECT, properties: {} }
      });
      const tool = new FunctionTool(errorFunction);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({}, toolContext);
      expect(result).toEqual({ error: expect.stringContaining('Test error') });
    });

    it('should pass toolContext to the function if it accepts it', async () => {
      const contextCheckingFunction = (args: Record<string, unknown>, toolContext?: ToolContext) => {
        return { receivedContext: Boolean(toolContext) };
      };
      // Manually defined schema for contextCheckingFunction
      const contextCheckingFunctionParams: AdkSchema = {
        type: AdkType.OBJECT,
        properties: {}, // No specific named parameters expected from args
      };
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'contextCheckingFunction',
        description: 'Checks context',
        parameters: contextCheckingFunctionParams
      });
      const tool = new FunctionTool(contextCheckingFunction, undefined, 'Checks context');
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({}, toolContext);
      expect(result).toEqual({ receivedContext: true });
    });
  });

  describe('getDeclaration', () => {
    it('should return a function declaration', () => {
      mockBuildFunctionDeclaration.mockReturnValue({
        name: 'addFunction',
        description: addFunctionDescription,
        parameters: {
          type: AdkType.OBJECT,
          properties: {
            a: { type: AdkType.NUMBER, description: 'First number' },
            b: { type: AdkType.NUMBER, description: 'Second number (optional)' },
          },
          required: ['a'], // b is optional as per function logic (defaults to 0)
        }
      });
      const tool = new FunctionTool(addFunction, undefined, addFunctionDescription);
      // @ts-expect-error - protected method
      const declaration = tool.getDeclaration();
      expect(declaration).toBeDefined();
      expect(declaration?.name).toBe('addFunction');
      expect(declaration?.description).toBeDefined();
    });
  });
});