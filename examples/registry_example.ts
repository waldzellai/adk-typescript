// Example of using the LLM Registry in the Google Agent Development Kit (ADK) for TypeScript

import { LlmAgent, RunConfig } from '../src/google/adk/agents';
import { Runner } from '../src/google/adk/runners';
import { Content } from '../src/google/adk/models/llm_types';
import { LlmRegistry } from '../src/google/adk/models/registry';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * This example demonstrates how to use the LLM Registry to automatically select
 * the right implementation based on the model name.
 * 
 * To run this example with OpenAI models, you need to set the OPENAI_API_KEY environment variable.
 * To run this example with Gemini models, you need to set the GEMINI_API_KEY environment variable.
 */
async function main() {
  // Get API keys from environment variables
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Create examples for both OpenAI and Gemini models
  await runExample('o4-mini-high', { apiKey: openaiApiKey });
  await runExample('gemini-1.5-pro', { apiKey: geminiApiKey });
}

/**
 * Runs an example with the specified model.
 * 
 * @param modelName The name of the model to use
 * @param options Additional options for the model
 */
async function runExample(modelName: string, options: any) {
  console.log(`\n=== Running example with model: ${modelName} ===\n`);

  try {
    // Create an LLM using the registry
    const llm = LlmRegistry.createLlm(modelName, options);

    // Create an agent using the LLM
    const agent = new LlmAgent({
      name: 'registry-example-agent',
      description: `A helpful assistant using ${modelName}`,
      model: llm,
      instruction: 'You are a helpful assistant that provides concise and accurate information.'
    });

    // Create a runner
    const runner = new Runner({
      appName: 'registry-example',
      agent
    });

    // Create a user message
    const userMessage: Content = {
      role: 'user',
      parts: [{ text: 'What model are you using? Please keep your answer very brief.' }]
    };

    // Run the agent
    console.log('User: What model are you using? Please keep your answer very brief.');
    for await (const event of runner.runAsync('user-123', 'session-123', userMessage)) {
      if (event.getContent()) {
        console.log(`${event.author}: ${event.getContent()?.parts[0].text}`);
      }
    }
  } catch (error) {
    console.error(`Error running example with model ${modelName}:`, error);
    console.error('Make sure you have set the appropriate API key in your environment variables.');
  }
}

// Run the example
main().catch(error => {
  console.error('Error running example:', error);
});
