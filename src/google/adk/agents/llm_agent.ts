// LLM agent module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the LLM agent functionality from the Python SDK

import { BaseAgent, BeforeAgentCallback, AfterAgentCallback } from './base_agent';
import { InvocationContext, CallbackContext, ReadonlyContext } from './invocation_context';
import { Event } from '../events/event';
import { EventActions } from '../events/event_actions';
import { Content, LlmRequest, LlmResponse, ChatMessage } from '../models/llm_types';
import { BaseTool } from '../tools/base_tool';
import { FunctionTool } from '../tools/function_tool';
import { ToolContext } from '../tools/tool_context';
import { BaseLlm } from '../models/base_llm';
import { BasePlanner } from '../planners/base_planner';
import { BaseCodeExecutor } from '../code_executors/base_code_executor';
import { StreamingMode, RunConfig } from './run_config';
import { LlmRegistry } from '../models/registry';

// Type definitions for callbacks
export type BeforeModelCallback = (
  callbackContext: CallbackContext,
  llmRequest: LlmRequest
) => Promise<LlmResponse | null> | LlmResponse | null;

export type AfterModelCallback = (
  callbackContext: CallbackContext,
  llmResponse: LlmResponse
) => Promise<LlmResponse | null> | LlmResponse | null;

export type BeforeToolCallback = (
  tool: BaseTool,
  args: Record<string, unknown>,
  toolContext: ToolContext
) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;

export type AfterToolCallback = (
  tool: BaseTool,
  args: Record<string, unknown>,
  toolContext: ToolContext,
  result: Record<string, unknown>
) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;

export type InstructionProvider = (context: ReadonlyContext) => string;

export type ToolFunction = (args: Record<string, unknown>, toolContext: ToolContext) => Promise<Record<string, unknown>> | Record<string, unknown>;
export type ToolUnion = BaseTool | ToolFunction;

// Helper function to convert a function to a BaseTool
function convertToTool(tool: ToolUnion): BaseTool {
  if (typeof tool === 'function') {
    // Create a FunctionTool from the function
    return new FunctionTool(
      (args: Record<string, unknown>, toolContext?: ToolContext) => {
        if (!toolContext) {
          // Create a default InvocationContext for the ToolContext
          const defaultInvocationContext = new InvocationContext({
            agent: {
              name: 'DefaultAgent',
              description: '',
              getTools: () => [],
              run: () => { throw new Error('Not implemented'); },
              runAsync: () => { throw new Error('Not implemented'); }
            } as unknown as BaseAgent,
            runConfig: new RunConfig({})
          });
          toolContext = new ToolContext(defaultInvocationContext);
        }
        return tool(args, toolContext);
      },
      tool.name,
      tool.toString().match(/\/\*\*[\s\S]*?\*\//)?.[0]?.replace(/\/\*\*|\*\//g, '')?.trim() || ''
    );
  }
  return tool as BaseTool;
}

/**
 * LLM-based Agent implementation.
 */
export class LlmAgent extends BaseAgent {
  /**
   * The model to use for the agent.
   * When not set, the agent will inherit the model from its ancestor.
   */
  model: string | BaseLlm = '';

  /**
   * Instructions for the LLM model, guiding the agent's behavior.
   */
  instruction: string | InstructionProvider = '';

  /**
   * Global instructions that apply to all sub-agents.
   */
  globalInstruction: string | InstructionProvider = '';

  /**
   * The max number of turns for the agent to run.
   */
  maxTurns: number = 10;

  /**
   * The tools for the agent to use.
   */
  tools: BaseTool[] = [];

  /**
   * The planner for the agent to use for planning.
   */
  planner: BasePlanner | null = null;

  /**
   * The code executor for the agent to use.
   */
  codeExecutor: BaseCodeExecutor | null = null;

  /**
   * The examples for the agent to learn from.
   */
  examples: unknown[] = []; // In a real implementation, this would be more strongly typed

  /**
   * The input schema for the agent.
   */
  inputSchema: unknown = null; // In a real implementation, this would be a proper schema type

  /**
   * The output schema for the agent.
   */
  outputSchema: unknown = null; // In a real implementation, this would be a proper schema type

  /**
   * Callback that is invoked before the model is called.
   */
  beforeModelCallback: BeforeModelCallback | null = null;

  /**
   * Callback that is invoked after the model is called.
   */
  afterModelCallback: AfterModelCallback | null = null;

  /**
   * Callback that is invoked before a tool is called.
   */
  beforeToolCallback: BeforeToolCallback | null = null;

  /**
   * Callback that is invoked after a tool is called.
   */
  afterToolCallback: AfterToolCallback | null = null;

  /**
   * Chat history for the agent.
   */
  chatHistory: ChatMessage[] = [];

  /**
   * Creates a new LlmAgent.
   *
   * @param options Configuration options for the agent
   */
  constructor(options: {
    name: string;
    description?: string;
    model?: string | BaseLlm;
    instruction?: string | InstructionProvider;
    globalInstruction?: string | InstructionProvider;
    maxTurns?: number;
    tools?: Array<ToolUnion>;
    planner?: BasePlanner;
    codeExecutor?: BaseCodeExecutor;
    examples?: unknown[];
    inputSchema?: unknown;
    outputSchema?: unknown;
    beforeModelCallback?: BeforeModelCallback;
    afterModelCallback?: AfterModelCallback;
    beforeToolCallback?: BeforeToolCallback;
    afterToolCallback?: AfterToolCallback;
    beforeAgentCallback?: BeforeAgentCallback;
    afterAgentCallback?: AfterAgentCallback;
    subAgents?: BaseAgent[];
    chatHistory?: ChatMessage[];
  }) {
    super({
      name: options.name,
      description: options.description,
      beforeAgentCallback: options.beforeAgentCallback,
      afterAgentCallback: options.afterAgentCallback,
      subAgents: options.subAgents
    });

    this.model = options.model || '';
    this.instruction = options.instruction || '';
    this.globalInstruction = options.globalInstruction || '';
    this.maxTurns = options.maxTurns || 10;
    this.planner = options.planner || null;
    this.codeExecutor = options.codeExecutor || null;
    this.examples = options.examples || [];
    this.inputSchema = options.inputSchema || null;
    this.outputSchema = options.outputSchema || null;
    this.beforeModelCallback = options.beforeModelCallback || null;
    this.afterModelCallback = options.afterModelCallback || null;
    this.beforeToolCallback = options.beforeToolCallback || null;
    this.afterToolCallback = options.afterToolCallback || null;
    this.chatHistory = options.chatHistory || [];

    // Convert tools to BaseTool instances
    this.tools = (options.tools || []).map(tool => {
      try {
        return convertToTool(tool);
      } catch (e) {
        console.warn(`Failed to convert tool: ${e}`);
        return null;
      }
    }).filter((tool): tool is BaseTool => tool !== null);
  }

  /**
   * Gets the LLM model for this agent.
   * If not set, inherits from parent agents.
   *
   * @returns The LLM model to use
   */
  getLlm(): BaseLlm {
    // If model is already a BaseLlm instance, return it
    if (typeof this.model !== 'string') {
      return this.model;
    }

    // If model is a string and not empty, look it up in registry
    if (this.model) {
      try {
        return LlmRegistry.resolve(this.model);
      } catch (error) {
        console.warn(`Failed to resolve model ${this.model}: ${error}`);
      }
    }

    // Try to inherit from parent
    if (this.parentAgent instanceof LlmAgent) {
      return this.parentAgent.getLlm();
    }

    // Fall back to default model
    return LlmRegistry.resolve('gemini-1.5-pro');
  }

  /**
   * Gets the instruction for this agent.
   *
   * @param context The readonly context
   * @returns The instruction string
   */
  getInstruction(context?: ReadonlyContext): string {
    if (typeof this.instruction === 'function') {
      return this.instruction(context || new ReadonlyContext(
        new InvocationContext({
          agent: this,
          runConfig: new RunConfig({ streamingMode: StreamingMode.NONE })
        })
      ));
    }
    return this.instruction;
  }

  /**
   * Gets the global instruction for this agent.
   *
   * @param context The readonly context
   * @returns The global instruction string
   */
  getGlobalInstruction(context?: ReadonlyContext): string {
    if (typeof this.globalInstruction === 'function') {
      return this.globalInstruction(context || new ReadonlyContext(
        new InvocationContext({
          agent: this,
          runConfig: new RunConfig({ streamingMode: StreamingMode.NONE })
        })
      ));
    }
    return this.globalInstruction;
  }

  /**
   * Retrieves the tools available for the LLM
   *
   * @returns The tools for the agent
   */
  getTools(): BaseTool[] {
    return this.tools;
  }

  /**
   * Retrieves the chat history for the LLM
   *
   * @returns The chat history for the agent
   */
  getChatHistory(): ChatMessage[] {
    return this.chatHistory;
  }

  /**
   * Adds a message to the chat history
   *
   * @param message The message to add to the chat history
   */
  addMessageToChatHistory(message: ChatMessage): void {
    this.chatHistory.push(message);
  }

  /**
   * Implementation of the agent's run logic.
   *
   * @param context The invocation context
   * @returns An async generator yielding events from the agent
   */
  protected override async *runAsyncImpl(
    context: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    // In a real implementation, this would use a flow manager like
    // SingleFlow or AutoFlow to handle the conversation
    console.log(`Running LLM agent: ${this.name}`);

    // Basic implementation that just echoes the user's input
    if (context.userContent) {
      const content: Content = {
        role: this.name,
        parts: [
          { text: `Echo from ${this.name}: ${context.userContent.parts[0].text || ''}` }
        ]
      };

      // Add to chat history
      this.addMessageToChatHistory({
        role: this.name,
        content: content
      });

      const event = new Event({
        id: Event.newId(),
        invocationId: context.invocationId,
        author: this.name,
        branch: context.branch,
        content: content,
        actions: new EventActions()
      });

      yield event;
    }
  }

  /**
   * Implementation of the agent's live run logic.
   *
   * @param context The invocation context
   * @returns An async generator yielding events from the agent
   */
  protected override async *runLiveImpl(
    context: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    // In a real implementation, this would handle streaming audio/video
    console.log(`Running LLM agent in live mode: ${this.name}`);

    // Basic implementation that echoes the user's input
    if (context.userContent) {
      const content: Content = {
        role: this.name,
        parts: [
          { text: `Live echo from ${this.name}: ${context.userContent.parts[0].text || ''}` }
        ]
      };

      // Add to chat history
      this.addMessageToChatHistory({
        role: this.name,
        content: content
      });

      const event = new Event({
        id: Event.newId(),
        invocationId: context.invocationId,
        author: this.name,
        branch: context.branch,
        content: content,
        actions: new EventActions()
      });

      yield event;
    }
  }

  // Legacy methods for backward compatibility

  /**
   * Invokes the LLM with the given input
   *
   * @param input The input to the LLM
   * @returns The LLM response content
   */
  invoke(input: string | Content): Content {
    const content = typeof input === 'string' ?
      { role: 'user', parts: [{ text: input }] } : input;

    const userMessage: ChatMessage = { role: 'user', content };
    this.addMessageToChatHistory(userMessage);

    // Placeholder for actual LLM invocation logic
    const responseContent: Content = {
      role: 'assistant',
      parts: [{
        text: `Response to: ${typeof input === 'string' ?
          input : input.parts[0]?.text || 'input'}`
      }]
    };

    this.addMessageToChatHistory({
      role: 'assistant',
      content: responseContent
    });

    return responseContent;
  }
}

// Type alias for Agent
export type Agent = LlmAgent;
