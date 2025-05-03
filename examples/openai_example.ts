// Example of using OpenAI in the Google Agent Development Kit (ADK) for TypeScript

import { LlmAgent, RunConfig } from '../src/google/adk/agents';
import { Runner } from '../src/google/adk/runners';
import { Content } from '../src/google/adk/models/llm_types';
import { OpenAI } from '../src/google/adk/models/openai_llm';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * This example demonstrates how to use OpenAI with the ADK.
 * 
 * To run this example, you need to set the OPENAI_API_KEY environment variable.
 */
async function main() {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set it in a .env file or in your environment.');
    process.exit(1);
  }

  // Create an OpenAI model
  const openaiModel = new OpenAI({
    model: 'o4-mini-high',
    apiKey
  });

  // Create an agent using the OpenAI model
  const agent = new LlmAgent({
    name: 'openai-assistant',
    description: 'A helpful assistant powered by OpenAI',
    model: openaiModel,
    instruction: 'You are a helpful assistant that provides concise and accurate information.'
  });

  // Create a runner
  const runner = new Runner({
    appName: 'openai-example',
    agent
  });

  // Create a user message
  const userMessage: Content = {
    role: 'user',
    parts: [{ text: 'What can you tell me about the ADK (Agent Development Kit)?' }]
  };

  // Run the agent
  console.log('User: What can you tell me about the ADK (Agent Development Kit)?');
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
