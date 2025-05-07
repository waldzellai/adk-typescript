/**
 * Base agent module for the Google Agent Development Kit (ADK) in TypeScript.
 * @module google/adk/agents/base_agent
 * @description
 * The base agent module provides the foundational abstractions for building agents
 * in the Google Agent Development Kit (ADK). It includes the BaseAgent abstract class
 * and related callback types.
 * 
 * An agent is the primary unit of functionality in the ADK, responsible for:
 * - Processing user input (text, audio, video)
 * - Interacting with LLM models
 * - Executing tools and functions
 * - Coordinating with other agents
 * - Generating responses
 * 
 * The agent architecture supports composition through parent-child relationships,
 * enabling complex agent hierarchies and behaviors.
 */

import { Content } from '../models/base_llm';
import { Event } from '../events/event';
import { InvocationContext } from './invocation_context';
import { CallbackContext } from './invocation_context';

/**
 * Callback function executed before an agent runs.
 * Can be used to modify the agent's behavior, preprocess input, or short-circuit execution.
 * 
 * @param callbackContext - The callback context providing access to the invocation context
 * @returns Content to return to the user or null to continue with normal execution
 */
export type BeforeAgentCallback = (callbackContext: CallbackContext) => Content | null | Promise<Content | null>;

/**
 * Callback function executed after an agent runs.
 * Can be used to modify the agent's output, perform cleanup, or add additional actions.
 * 
 * @param callbackContext - The callback context providing access to the invocation context
 * @returns Content to return to the user or null to continue with normal execution
 */
export type AfterAgentCallback = (callbackContext: CallbackContext) => Content | null | Promise<Content | null>;

/**
 * Base class for all agents in the Agent Development Kit.
 * 
 * This abstract class defines the core agent interface and provides common functionality
 * for agent implementations. All agent types in the ADK extend this base class.
 * 
 * Agents provide two primary execution modes:
 * - Text-based conversation via runAsync()
 * - Audio/video conversation via runLive()
 * 
 * Agents can be composed into hierarchies, with parent-child relationships allowing
 * for complex delegation patterns and specialized behavior.
 * 
 * @example
 * ```typescript
 * class MyAgent extends BaseAgent {
 *   protected async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
 *     // Agent implementation
 *     yield new Event({
 *       id: Event.newId(),
 *       invocationId: ctx.invocationId || '',
 *       author: this.name,
 *       branch: ctx.branch,
 *       content: {
 *         role: this.name,
 *         parts: [{ text: 'Hello from my agent!' }]
 *       }
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseAgent {
  /**
   * The agent's name.
   * Agent name must be a valid identifier and unique within the agent tree.
   * Agent name cannot be "user", since it's reserved for end-user's input.
   */
  readonly name: string;

  /**
   * Description about the agent's capability.
   * The model uses this to determine whether to delegate control to the agent.
   * One-line description is enough and preferred.
   */
  readonly description: string = '';

  /**
   * The parent agent of this agent.
   * Note that an agent can ONLY be added as sub-agent once.
   */
  parentAgent: BaseAgent | null = null;

  /**
   * The sub-agents of this agent.
   */
  readonly subAgents: BaseAgent[] = [];

  /**
   * Callback that is invoked before the agent runs.
   */
  beforeAgentCallback: BeforeAgentCallback | null = null;

  /**
   * Callback that is invoked after the agent runs.
   */
  afterAgentCallback: AfterAgentCallback | null = null;

  /**
   * Creates a new BaseAgent instance.
   * 
   * @param options - Configuration options for the agent
   * @param options.name - The name of the agent (must be a valid identifier and unique in the agent tree)
   * @param options.description - Optional description of the agent's capabilities
   * @param options.beforeAgentCallback - Optional callback executed before the agent runs
   * @param options.afterAgentCallback - Optional callback executed after the agent runs
   * @param options.subAgents - Optional array of sub-agents to add to this agent
   * @throws Error if the agent name is invalid or if a sub-agent already has a parent
   */
  constructor(options: {
    name: string;
    description?: string;
    beforeAgentCallback?: BeforeAgentCallback;
    afterAgentCallback?: AfterAgentCallback;
    subAgents?: BaseAgent[];
  }) {
    this.name = options.name;
    this.validateName(this.name);
    
    this.description = options.description || '';
    this.beforeAgentCallback = options.beforeAgentCallback || null;
    this.afterAgentCallback = options.afterAgentCallback || null;
    
    this.subAgents = options.subAgents || [];

    if (options.subAgents) {
      this.setParentAgentForSubAgents();
    }
  }

  /**
   * Entry method to run an agent via text-based conversation.
   * 
   * @param parentContext The invocation context of the parent agent
   * @returns An async generator yielding events from the agent
   */
  async *runAsync(parentContext: InvocationContext): AsyncGenerator<Event, void, unknown> {
    console.log(`Running agent asynchronously: ${this.name}`);
    
    const ctx = this.createInvocationContext(parentContext);
    
    // Handle before agent callback
    const beforeEvent = await this.handleBeforeAgentCallback(ctx);
    if (beforeEvent) {
      yield beforeEvent;
      if (ctx.endInvocation) {
        return;
      }
    }
    
    // Run the agent implementation
    const eventGenerator = this.runAsyncImpl(ctx);
    for await (const event of eventGenerator) {
      yield event;
    }
    
    if (ctx.endInvocation) {
      return;
    }
    
    // Handle after agent callback
    const afterEvent = await this.handleAfterAgentCallback(ctx);
    if (afterEvent) {
      yield afterEvent;
    }
  }

  /**
   * Entry method to run an agent via video/audio-based conversation.
   * 
   * @param parentContext The invocation context of the parent agent
   * @returns An async generator yielding events from the agent
   */
  async *runLive(parentContext: InvocationContext): AsyncGenerator<Event, void, unknown> {
    console.log(`Running agent in live mode: ${this.name}`);
    
    const ctx = this.createInvocationContext(parentContext);
    
    // TODO: Support before/after callbacks for live mode
    
    // Run the agent implementation
    const eventGenerator = this.runLiveImpl(ctx);
    for await (const event of eventGenerator) {
      yield event;
    }
  }
  
  /**
   * Entry method to run an agent via video/audio-based conversation with async generator.
   * 
   * This is the primary method used by the Runner's runLive method.
   * 
   * @param parentContext The invocation context of the parent agent
   * @returns An async generator yielding events from the agent
   */
  async *runLiveAsync(parentContext: InvocationContext): AsyncGenerator<Event, void, unknown> {
    console.log(`Running agent in live async mode: ${this.name}`);
    
    const ctx = this.createInvocationContext(parentContext);
    
    // TODO: Support before/after callbacks for live mode
    
    // Run the agent implementation
    const eventGenerator = this.runLiveImpl(ctx);
    for await (const event of eventGenerator) {
      yield event;
    }
  }

  /**
   * Core logic to run this agent via text-based conversation.
   * Should be implemented by subclasses.
   * 
   * @param ctx The invocation context for this agent
   * @returns An async generator yielding events from the agent
   */
  protected abstract runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown>;

  /**
   * Core logic to run this agent via video/audio-based conversation.
   * Should be implemented by subclasses.
   * 
   * @param ctx The invocation context for this agent
   * @returns An async generator yielding events from the agent
   */
  protected async *runLiveImpl(_ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    throw new Error(`runLiveImpl for ${this.constructor.name} is not implemented.`);
    // AsyncGenerator requires having at least one yield statement
    // eslint-disable-next-line no-constant-condition
    if (false) {
      yield {} as Event;
    }
  }

  /**
   * Gets the root agent of this agent.
   * 
   * @returns The root agent of this agent
   */
  get rootAgent(): BaseAgent {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: BaseAgent = this;
    while (current.parentAgent !== null) {
      current = current.parentAgent;
    }
    return current;
  }

  /**
   * Finds the agent with the given name in this agent and its descendants.
   * 
   * @param name The name of the agent to find
   * @returns The agent with the matching name, or null if no such agent is found
   */
  findAgent(name: string): BaseAgent | null {
    if (this.name === name) {
      return this;
    }
    return this.findSubAgent(name);
  }

  /**
   * Finds the agent with the given name in this agent's descendants.
   * 
   * @param name The name of the agent to find
   * @returns The agent with the matching name, or null if no such agent is found
   */
  findSubAgent(name: string): BaseAgent | null {
    for (const subAgent of this.subAgents) {
      const result = subAgent.findAgent(name);
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * Creates a new invocation context for this agent.
   * 
   * @param parentContext The parent invocation context
   * @returns A new invocation context for this agent
   */
  protected createInvocationContext(parentContext: InvocationContext): InvocationContext {
    const invocationContext = new InvocationContext({
      ...parentContext,
      agent: this
    });
    
    if (parentContext.branch) {
      invocationContext.branch = `${parentContext.branch}.${this.name}`;
    } else {
      invocationContext.branch = this.name;
    }
    
    return invocationContext;
  }

  /**
   * Runs the before_agent_callback if it exists.
   * 
   * @param ctx The invocation context
   * @returns An event if callback provides content or changed state
   */
  private async handleBeforeAgentCallback(ctx: InvocationContext): Promise<Event | null> {
    if (!this.beforeAgentCallback) {
      return null;
    }

    const callbackContext = new CallbackContext(ctx);
    const beforeAgentCallbackContent = await this.beforeAgentCallback(callbackContext);

    if (beforeAgentCallbackContent) {
      const event = new Event({
        id: Event.newId(),
        invocationId: ctx.invocationId || '',
        author: this.name,
        branch: ctx.branch,
        content: beforeAgentCallbackContent,
        actions: callbackContext.eventActions
      });
      ctx.endInvocation = true;
      return event;
    }

    if (callbackContext.hasStateDelta()) {
      return new Event({
        id: Event.newId(),
        invocationId: ctx.invocationId || '',
        author: this.name,
        branch: ctx.branch,
        actions: callbackContext.eventActions
      });
    }

    return null;
  }

  /**
   * Runs the after_agent_callback if it exists.
   * 
   * @param ctx The invocation context
   * @returns An event if callback provides content or changed state
   */
  private async handleAfterAgentCallback(ctx: InvocationContext): Promise<Event | null> {
    if (!this.afterAgentCallback) {
      return null;
    }

    const callbackContext = new CallbackContext(ctx);
    const afterAgentCallbackContent = await this.afterAgentCallback(callbackContext);

    if (afterAgentCallbackContent || callbackContext.hasStateDelta()) {
      return new Event({
        id: Event.newId(),
        invocationId: ctx.invocationId || '',
        author: this.name,
        branch: ctx.branch,
        content: afterAgentCallbackContent || null,
        actions: callbackContext.eventActions
      });
    }

    return null;
  }

  /**
   * Validates the agent name.
   * 
   * @param name The name to validate
   * @throws Error if the name is invalid
   */
  private validateName(name: string): void {
    // Check if name is a valid JavaScript identifier
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      throw new Error(
        `Found invalid agent name: '${name}'. ` +
        'Agent name must be a valid identifier. It should start with a ' +
        'letter (a-z, A-Z) or an underscore (_), and can only contain ' +
        'letters, digits (0-9), and underscores.'
      );
    }
    
    // Check if name is 'user'
    if (name === 'user') {
      throw new Error(
        'Agent name cannot be "user". "user" is reserved for end-user\'s input.'
      );
    }
  }

  /**
   * Sets this agent as the parent for all sub-agents.
   * 
   * @throws Error if any sub-agent already has a parent
   */
  private setParentAgentForSubAgents(): void {
    for (const subAgent of this.subAgents) {
      if (subAgent.parentAgent !== null) {
        throw new Error(
          `Agent '${subAgent.name}' already has a parent agent, current ` +
          `parent: '${subAgent.parentAgent.name}', trying to add: '${this.name}'`
        );
      }
      subAgent.parentAgent = this;
    }
  }
}