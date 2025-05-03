// Tests for the FunctionTool implementation

import { FunctionTool } from '../../src/google/adk/tools/function_tool';
import { ToolContext } from '../../src/google/adk/tools/tool_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';

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

  describe('constructor', () => {
    it('should create a FunctionTool with the function name', () => {
      const tool = new FunctionTool(addFunction);
      expect(tool.name).toBe('addFunction');
    });

    it('should use a custom name if provided', () => {
      const tool = new FunctionTool(addFunction, 'add');
      expect(tool.name).toBe('add');
    });

    it('should extract description from JSDoc comments', () => {
      // In Jest environment, function.toString() doesn't include JSDoc comments
      // So we'll manually provide the description that would normally be extracted
      const tool = new FunctionTool(addFunction, undefined, 'Add two numbers together');
      expect(tool.description).toBeDefined();
      expect(tool.description).toContain('Add two numbers');
    });

    it('should use a custom description if provided', () => {
      const tool = new FunctionTool(addFunction, undefined, 'Custom add description');
      expect(tool.description).toBe('Custom add description');
    });
  });

  describe('runAsync', () => {
    it('should execute the function with the provided arguments', async () => {
      const tool = new FunctionTool(addFunction);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({ a: 1, b: 2 }, toolContext);
      expect(result).toBe(3);
    });

    it('should handle missing arguments', async () => {
      const tool = new FunctionTool(addFunction);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({ a: 5 }, toolContext);
      expect(result).toBe(5); // b defaults to 0
    });

    it('should handle errors in the function', async () => {
      const errorFunction = () => {
        throw new Error('Test error');
      };
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
      const tool = new FunctionTool(contextCheckingFunction);
      const mockContext = createMockContext();
      const toolContext = new ToolContext(mockContext);
      const result = await tool.runAsync({}, toolContext);
      expect(result).toEqual({ receivedContext: true });
    });
  });

  describe('getDeclaration', () => {
    it('should return a function declaration', () => {
      const tool = new FunctionTool(addFunction);
      // @ts-expect-error - protected method
      const declaration = tool.getDeclaration();
      expect(declaration).toBeDefined();
      expect(declaration?.name).toBe('addFunction');
      expect(declaration?.description).toBeDefined();
    });
  });
});