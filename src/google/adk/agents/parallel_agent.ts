// Parallel agent implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the parallel agent functionality from the Python SDK

import { InvocationContext } from './invocation_context';
import { Event } from '../events/event';
import { BaseAgent } from './base_agent';

/**
 * Sets the branch for the current agent in the invocation context
 * 
 * @param currentAgent The current agent
 * @param invocationContext The invocation context to update
 */
function setBranchForCurrentAgent(
  currentAgent: BaseAgent, 
  invocationContext: InvocationContext
): void {
  invocationContext.branch = invocationContext.branch
    ? `${invocationContext.branch}.${currentAgent.name}`
    : currentAgent.name;
}

/**
 * Merges multiple async event generators into a single stream of events.
 * This implementation ensures each agent's events are processed in the order they are generated,
 * while allowing concurrent execution across agents.
 * 
 * @param agentRuns List of async generators yielding events from each agent
 * @returns A merged async generator of events
 */
async function* mergeAgentRun(
  agentRuns: AsyncGenerator<Event, void, unknown>[]
): AsyncGenerator<Event, void, unknown> {
  // Create a promise for each agent run's next event
  const eventPromises = agentRuns.map(run => {
    return {
      generator: run,
      nextPromise: run.next()
    };
  });

  // Continue as long as there are active generators
  while (eventPromises.length > 0) {
    // Wait for the first event to be ready from any generator
    const settledPromises = await Promise.race(
      eventPromises.map((item, index) => 
        item.nextPromise.then(result => ({ index, result }))
      )
    );

    const { index, result } = settledPromises;

    if (!result.done) {
      // Yield the event
      yield result.value;
      
      // Set up the next promise for this generator
      eventPromises[index].nextPromise = eventPromises[index].generator.next();
    } else {
      // Remove the completed generator
      eventPromises.splice(index, 1);
    }
  }
}

/**
 * A shell agent that runs its sub-agents in parallel in an isolated manner.
 * 
 * This approach is beneficial for scenarios requiring multiple perspectives or
 * attempts on a single task, such as:
 * 
 * - Running different algorithms simultaneously
 * - Generating multiple responses for review by a subsequent evaluation agent
 */
export class ParallelAgent extends BaseAgent {
  /**
   * Implementation of the async run method that executes sub-agents in parallel.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   */
  async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    setBranchForCurrentAgent(this, ctx);
    
    // Start all sub-agents
    const agentRuns = this.subAgents.map(agent => agent.runAsync(ctx));
    
    // Yield events as they become available from any agent
    for await (const event of mergeAgentRun(agentRuns)) {
      yield event;
    }
  }

  /**
   * Implementation of the live run method that executes sub-agents in parallel.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from sub-agents
   */
  async *runLiveImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    setBranchForCurrentAgent(this, ctx);
    
    // Start all sub-agents in live mode
    const agentRuns = this.subAgents.map(agent => agent.runLive(ctx));
    
    // Yield events as they become available from any agent
    for await (const event of mergeAgentRun(agentRuns)) {
      yield event;
    }
  }
}