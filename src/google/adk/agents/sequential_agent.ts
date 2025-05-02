// Sequential agent implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the sequential agent functionality from the Python SDK

import { InvocationContext } from './invocation_context';
import { Event } from '../events/event';
import { BaseAgent } from './base_agent';

/**
 * A shell agent that runs its sub-agents in sequence.
 */
export class SequentialAgent extends BaseAgent {
  /**
   * Implementation of the async run method that executes sub-agents in sequence.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   */
  async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    for (const subAgent of this.subAgents) {
      const eventGenerator = subAgent.runAsync(ctx);
      
      // Yield all events from the current sub-agent before moving to the next
      for await (const event of eventGenerator) {
        yield event;
      }
    }
  }

  /**
   * Implementation of the live run method that executes sub-agents in sequence.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   */
  async *runLiveImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    for (const subAgent of this.subAgents) {
      const eventGenerator = subAgent.runLive(ctx);
      
      // Yield all events from the current sub-agent before moving to the next
      for await (const event of eventGenerator) {
        yield event;
      }
    }
  }
}