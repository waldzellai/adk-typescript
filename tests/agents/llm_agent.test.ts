// Tests for the LlmAgent implementation

import { LlmAgent } from '../../src/google/adk/agents/llm_agent';
import { BaseTool } from '../../src/google/adk/tools/base_tool';
import { FunctionTool } from '../../src/google/adk/tools/function_tool';
import { ToolContext } from '../../src/google/adk/tools/tool_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { RunConfig, StreamingMode } from '../../src/google/adk/agents/run_config';

describe('LlmAgent', () => {
  describe('constructor', () => {
    it('should create an LlmAgent with the provided name', () => {
      const agent = new LlmAgent({ name: 'TestAgent' });
      expect(agent.name).toBe('TestAgent');
    });

    it('should accept a description', () => {
      const agent = new LlmAgent({ 
        name: 'TestAgent',
        description: 'Test agent description'
      });
      expect(agent.description).toBe('Test agent description');
    });

    it('should handle tool functions and convert them to tools', () => {
      // Create a function that will be converted to a tool
      const addFunction = (args: Record<string, unknown>): Record<string, unknown> => {
        const a = Number(args.a) || 0;
        const b = Number(args.b) || 0;
        return { result: a + b };
      };

      // Create an agent with the function as a tool
      const agent = new LlmAgent({
        name: 'TestAgent',
        tools: [addFunction]
      });

      // Verify the tools array
      expect(agent.tools.length).toBe(1);
      expect(agent.tools[0]).toBeInstanceOf(BaseTool);
      expect(agent.tools[0]).toBeInstanceOf(FunctionTool);
      expect(agent.tools[0].name).toBe('addFunction');
    });

    it('should handle a mix of BaseTool and functions', () => {
      // Create a function that will be converted to a tool
      const addFunction = (args: Record<string, unknown>, _toolContext?: ToolContext): Record<string, unknown> => {
        const a = Number(args.a) || 0;
        const b = Number(args.b) || 0;
        return { result: a + b };
      };

      // Create a BaseTool
      class TestTool extends BaseTool {
        constructor() {
          super('TestTool', 'A test tool');
        }
        
        async runAsync(_args: Record<string, unknown>, _toolContext: ToolContext): Promise<unknown> {
          return 'test result';
        }
      }
      const testTool = new TestTool();

      // Create an agent with both tools
      const agent = new LlmAgent({
        name: 'TestAgent',
        tools: [addFunction, testTool]
      });

      // Verify the tools array
      expect(agent.tools.length).toBe(2);
      expect(agent.tools[0]).toBeInstanceOf(FunctionTool);
      expect(agent.tools[0].name).toBe('addFunction');
      expect(agent.tools[1]).toBe(testTool);
      expect(agent.tools[1].name).toBe('TestTool');
    });
  });

  describe('getTools', () => {
    it('should return the tools array', () => {
      // Create a function that will be converted to a tool
      const addFunction = (args: Record<string, unknown>, _toolContext?: ToolContext): Record<string, unknown> => {
        const a = Number(args.a) || 0;
        const b = Number(args.b) || 0;
        return { result: a + b };
      };

      // Create an agent with the function as a tool
      const agent = new LlmAgent({
        name: 'TestAgent',
        tools: [addFunction]
      });

      // Verify getTools returns the tools array
      const tools = agent.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0]).toBeInstanceOf(FunctionTool);
      expect(tools[0].name).toBe('addFunction');
    });
  });

  describe('runAsyncImpl', () => {
    it('should handle user content and yield an event', async () => {
      // Create an agent
      const agent = new LlmAgent({
        name: 'TestAgent'
      });

      // Create an invocation context with user content
      const context = new InvocationContext({
        agent,
        runConfig: new RunConfig({
          streamingMode: StreamingMode.NONE
        }),
        userContent: {
          role: 'user',
          parts: [{ text: 'Hello agent' }]
        }
      });

      // Run the agent
      const generator = agent['runAsyncImpl'](context);
      const result = await generator.next();
      
      // Verify the event
      expect(result.done).toBe(false);
      expect(result.value).toBeDefined();
      
      // The result.value should be an Event, verify its content using proper methods
      if (result.value) {
        const event = result.value;
        const content = event.getContent();
        expect(content).toBeDefined();
        expect(content?.role).toBe('TestAgent');
        expect(content?.parts).toBeDefined();
        expect(content?.parts).toHaveLength(1);
        expect(content?.parts?.[0]?.text).toContain('Hello agent');
      } else {
        fail('Expected result.value to be defined');
      }
    });
  });
});