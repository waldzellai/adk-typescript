# Google Agent Development Kit (ADK) - TypeScript

A TypeScript implementation of Google's Agent Development Kit (ADK), providing a comprehensive framework for building AI agents. This SDK mirrors the structure and functionality of the official Python ADK while providing TypeScript-native features and type safety.

## Features

- 🤖 **Multiple Agent Types**: LlmAgent, SequentialAgent, ParallelAgent, LoopAgent, and RemoteAgent
- 🔧 **Tool Support**: Built-in tools and custom tool creation
- 🧠 **Multi-Model Support**: Google Gemini and OpenAI models
- 💾 **State Management**: Session and memory services
- 🔐 **Authentication**: OAuth and API key support
- 📝 **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @waldzellai/adk-typescript
```

## Usage

### Basic Agent Usage

```typescript
import { LlmAgent, RunConfig } from '@waldzellai/adk-typescript';
import { Runner } from '@waldzellai/adk-typescript';

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
import { LlmAgent } from '@waldzellai/adk-typescript';
import { Runner } from '@waldzellai/adk-typescript';
import { OpenAI } from '@waldzellai/adk-typescript';

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
import { RemoteAgent, LlmAgent } from '@waldzellai/adk-typescript';
import { Runner } from '@waldzellai/adk-typescript';

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

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix linting issues
```

## API Documentation

For detailed API documentation, please refer to the TypeScript definitions in the `dist` folder after building, or explore the source code in the `src` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on Google's Agent Development Kit (ADK) Python SDK
- TypeScript implementation by WaldzellAI
