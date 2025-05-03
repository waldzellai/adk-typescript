// Example of using RemoteAgent in the Google Agent Development Kit (ADK) for TypeScript

import { LlmAgent, RemoteAgent, RunConfig } from '../src/google/adk/agents';
import { Runner } from '../src/google/adk/runners';
import { Content } from '../src/google/adk/models/llm_types';

/**
 * This example demonstrates how to create and use a RemoteAgent.
 * 
 * The RemoteAgent communicates with a remote endpoint to get responses.
 * In a real application, the remote endpoint would be a server running
 * another agent or service.
 * 
 * For this example to work, you would need to have a server running at
 * the specified URL that can handle the requests from the RemoteAgent.
 */
async function main() {
  // Create a remote agent
  const remoteAgent = new RemoteAgent({
    name: 'remote-travel-ideas',
    description: 'Provide travel ideas based on the destination',
    url: 'http://localhost:8000/agent/run'
  });
  
  // Create a parent agent that uses the remote agent
  const rootAgent = new LlmAgent({
    name: 'travel-assistant',
    description: 'A helpful travel assistant',
    model: 'gemini-1.5-pro',
    instruction: 'You are a helpful travel assistant that can provide information about destinations and travel ideas.',
    subAgents: [remoteAgent]
  });
  
  // Create a runner
  const runner = new Runner({
    appName: 'travel-app',
    agent: rootAgent
  });
  
  // Create a user message
  const userMessage: Content = {
    role: 'user',
    parts: [{ text: 'I want to visit Paris. What are some interesting places to see?' }]
  };
  
  // Run the agent
  console.log('User: I want to visit Paris. What are some interesting places to see?');
  for await (const event of runner.runAsync('user-123', 'session-123', userMessage)) {
    if (event.getContent()) {
      console.log(`${event.author}: ${event.getContent()?.parts[0].text}`);
    }
  }
}

// Run the example
main().catch(error => {
  console.error('Error running example:', error);
});
