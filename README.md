# Google Agent Development Kit (ADK) - TypeScript

This is the TypeScript version of Google's Agent Development Kit (ADK), converted from the original Python SDK. The goal of this project is to provide a TypeScript implementation that mirrors the structure and functionality of the Python version as closely as possible.

This version includes support for both Google's Gemini models and OpenAI models.

## Installation

```bash
npm install @google/adk-typescript
```

## Usage

### Basic Agent Usage

```typescript
import { LlmAgent, RunConfig } from '@google/adk-typescript';
import { Runner } from '@google/adk-typescript';

// Create an agent
const agent = new LlmAgent({
  name: 'my-agent',
  description: 'A helpful assistant',
  model: 'gemini-1.5-pro',
  instruction: 'You are a helpful assistant.'
});

// Create a runner
const runner = new Runner({
  appName: 'my-app',
  agent: agent
});

// Run the agent
const userMessage = {
  role: 'user',
  parts: [{ text: 'Hello, agent!' }]
};

for await (const event of runner.runAsync('user-123', 'session-123', userMessage)) {
  console.log(`${event.author}: ${event.getContent()?.parts[0].text}`);
}
```

### Agent Types

The ADK supports several types of agents:

1. **LlmAgent**: The standard agent that uses an LLM to generate responses.
2. **SequentialAgent**: Runs its sub-agents in sequence.
3. **ParallelAgent**: Runs its sub-agents in parallel.
4. **LoopAgent**: Runs its sub-agents in a loop until a condition is met.
5. **RemoteAgent**: Communicates with a remote endpoint to get responses.

### Using OpenAI Models

This implementation supports OpenAI models like GPT-4 and o4-mini:

```typescript
import { LlmAgent } from '@google/adk-typescript';
import { Runner } from '@google/adk-typescript';
import { OpenAI } from '@google/adk-typescript';

// Create an OpenAI model
const openaiModel = new OpenAI({
  model: 'o4-mini-high',
  apiKey: 'your-openai-api-key'
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

// Run the agent
const userMessage = {
  role: 'user',
  parts: [{ text: 'Hello, agent!' }]
};

for await (const event of runner.runAsync('user-123', 'session-123', userMessage)) {
  console.log(`${event.author}: ${event.getContent()?.parts[0].text}`);
}
```

### Using RemoteAgent

RemoteAgent allows you to communicate with a remote endpoint to get responses:

```typescript
import { RemoteAgent, LlmAgent } from '@google/adk-typescript';
import { Runner } from '@google/adk-typescript';

// Create a remote agent
const remoteAgent = new RemoteAgent({
  name: 'remote-agent',
  description: 'A remote agent',
  url: 'http://example.com/agent'
});

// Create a parent agent that uses the remote agent
const rootAgent = new LlmAgent({
  name: 'root-agent',
  description: 'A parent agent',
  model: 'gemini-1.5-pro',
  instruction: 'You are a helpful assistant.',
  subAgents: [remoteAgent]
});

// Create a runner
const runner = new Runner({
  appName: 'my-app',
  agent: rootAgent
});

// Run the agent
const userMessage = {
  role: 'user',
  parts: [{ text: 'Hello, agent!' }]
};

for await (const event of runner.runAsync('user-123', 'session-123', userMessage)) {
  console.log(`${event.author}: ${event.getContent()?.parts[0].text}`);
}
```

## Development

To build the project:

```bash
npm install
npm run build
```

To run tests:

```bash
npm test
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
