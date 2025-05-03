// Loop agent implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the loop agent functionality from the Python SDK

import { InvocationContext } from './invocation_context';
import { Event } from '../events/event';
import { BaseAgent } from './base_agent';

/**
 * A shell agent that runs its sub-agents in a loop.
 * 
 * When a sub-agent generates an event with escalate action or max_iterations are
 * reached, the loop agent will stop.
 */
export class LoopAgent extends BaseAgent {
  /**
   * The maximum number of iterations to run the loop agent.
   * If not set, the loop agent will run indefinitely until a sub-agent escalates.
   */
  maxIterations: number | null = null;

  /**
   * Implementation of the async run method that executes sub-agents in a loop.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   */
  async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    let timesLooped = 0;
    
    while (!this.maxIterations || timesLooped < this.maxIterations) {
      for (const subAgent of this.subAgents) {
        const eventGenerator = subAgent.runAsync(ctx);
        
        for await (const event of eventGenerator) {
          yield event;
          
          // Check if the event has escalate action
          if (event.getActions().escalate) {
            return;
          }
        }
      }
      
      timesLooped += 1;
    }
  }

  /**
   * Implementation of the live run method that executes sub-agents in a loop.
   * 
   * @param _ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   * @throws NotImplementedError This method is not yet implemented
   */
  async *runLiveImpl(_ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    throw new Error('The behavior for runLive is not defined yet.');
    // AsyncGenerator requires having at least one yield statement
    // This code is unreachable but needed for TypeScript
    if (false) {
      yield {} as Event;
    }
  }
}