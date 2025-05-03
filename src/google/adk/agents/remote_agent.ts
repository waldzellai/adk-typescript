// Remote agent implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the remote_agent.py from the Python SDK

import fetch from 'node-fetch';
import { BaseAgent } from './base_agent';
import { InvocationContext } from './invocation_context';
import { Event } from '../events/event';

/**
 * A remote agent that communicates with a remote endpoint.
 * 
 * This agent sends requests to a remote endpoint and yields events from the response.
 * Sub-agents are disabled in RemoteAgent.
 * 
 * Note: This is marked as experimental in the Python implementation.
 */
export class RemoteAgent extends BaseAgent {
  /**
   * The URL of the remote endpoint.
   */
  url: string;

  /**
   * Creates a new RemoteAgent.
   * 
   * @param options Configuration options for the agent
   */
  constructor(options: {
    name: string;
    url: string;
    description?: string;
    model?: string;
  }) {
    super({
      name: options.name,
      description: options.description || `Remote agent at ${options.url}`,
      subAgents: [] // Sub-agents are disabled in RemoteAgent
    });
    
    this.url = options.url;
  }

  /**
   * Implementation of the async run method that communicates with the remote endpoint.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from the remote endpoint
   */
  protected override async *runAsyncImpl(
    ctx: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    // Prepare the data to send to the remote endpoint
    const data = {
      invocation_id: ctx.invocationId,
      session: ctx.session ? ctx.session.toJSON() : null
    };
    
    try {
      // Send the request to the remote endpoint
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        timeout: 120000 // 120 seconds timeout, matching Python implementation
      });
      
      if (!response.ok) {
        throw new Error(`Remote endpoint returned status ${response.status}: ${response.statusText}`);
      }
      
      // Parse the response as JSON
      const events = await response.json() as Array<{
        id: string;
        invocation_id: string;
        author: string;
        content: {
          role: string;
          parts: Array<{text?: string; [key: string]: unknown}>;
        };
        [key: string]: unknown;
      }>;
      
      // Yield events from the response
      for (const eventData of events) {
        const event = new Event(eventData);
        // Create a new event with the agent's name as author
        const modifiedEvent = event.withModifications({
          author: this.name // Override the author with this agent's name
        });
        yield modifiedEvent;
      }
    } catch (error) {
      console.error(`Error communicating with remote endpoint: ${error}`);
      throw error;
    }
  }

  /**
   * Implementation of the live run method that communicates with the remote endpoint.
   * 
   * @param ctx The invocation context for the agent execution
   * @returns An async generator yielding events from the remote endpoint
   */
  protected override async *runLiveImpl(
    ctx: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    // For now, just delegate to runAsyncImpl
    // In a real implementation, this might handle streaming differently
    yield* this.runAsyncImpl(ctx);
  }
}
