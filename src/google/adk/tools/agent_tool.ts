// Agent tool module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the agent tool functionality from the Python SDK

import { BaseTool } from './base_tool';
import { BaseAgent } from '../agents/base_agent';
import { ToolContext } from './tool_context';
import { Event } from '../events/event';
import { InMemoryMemoryService } from '../memory/in_memory_memory_service';
import { InMemorySessionService } from '../sessions/in_memory_session_service';
import { Runner } from '../runners';
import { AdkType as Type, AdkFunctionDeclaration as FunctionDeclaration } from '../models/llm_types';

// Define interfaces to match the @google/genai types
interface ModelPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface ModelContent {
  role: string;
  parts: ModelPart[];
}

/**
 * A tool that wraps an agent.
 * 
 * This tool allows an agent to be called as a tool within a larger application.
 * The agent's input schema is used to define the tool's input parameters, and
 * the agent's output is returned as the tool's result.
 */
export class AgentTool extends BaseTool {
  /**
   * The agent to wrap.
   */
  agent: BaseAgent;

  /**
   * Whether to skip summarization of the agent output.
   */
  skipSummarization: boolean = false;

  /**
   * Creates a new AgentTool.
   * 
   * @param agent The agent to wrap
   * @param options Optional configuration
   */
  constructor(agent: BaseAgent, options: {
    skipSummarization?: boolean;
    isLongRunning?: boolean;
  } = {}) {
    super(agent.name, agent.description, options.isLongRunning);
    
    this.agent = agent;
    this.skipSummarization = options.skipSummarization || false;
  }

  /**
   * Gets the function declaration for this tool.
   * 
   * @returns The function declaration
   */
  protected override getDeclaration(): FunctionDeclaration {
    // Default declaration for agents
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: Type.OBJECT,
        properties: {
          request: {
            type: Type.STRING,
            description: 'The request to send to the agent'
          }
        },
        required: ['request']
      }
    };
  }

  /**
   * Runs the agent with the given arguments and context.
   * 
   * @param args The arguments from the function call
   * @param toolContext The tool context
   * @returns The result of running the agent
   */
  async runAsync(
    args: Record<string, unknown>,
    toolContext: ToolContext
  ): Promise<unknown> {
    // Set skip summarization in actions if requested
    if (this.skipSummarization) {
      toolContext.actions.skipSummarization = true;
    }

    // Input value is the request
    const inputValue = typeof args.request === 'string' ? args.request : '';

    // Create the content to send to the agent
    const content: ModelContent = {
      role: 'user',
      parts: [{ text: inputValue }]
    };

    // Create a runner to execute the agent
    const runner = new Runner({
      appName: this.agent.name,
      agent: this.agent,
      artifactService: toolContext.invocationContext.artifactService || undefined,
      sessionService: new InMemorySessionService(),
      memoryService: new InMemoryMemoryService(),
    });

    // Create a temporary session
    const session = runner.sessionService.createSession(
      this.agent.name,
      'tmp_user',
      toolContext.state ? (toolContext.state as { toObject?: () => Record<string, unknown> }).toObject?.() || {} : {}
    );

    // Execute the agent and collect events
    let lastEvent: Event | null = null;
    for await (const event of runner.runAsync({
      userId: session.userId,
      sessionId: session.id,
      newMessage: content
    })) {
      const actions = event.getActions();
      if (actions?.stateDelta && toolContext.state) {
        for (const [key, value] of Object.entries(actions.stateDelta)) {
          toolContext.state.set(key, value);
        }
      }
      lastEvent = event;
    }

    // Forward all artifacts to parent session if available
    if (runner.artifactService) {
      const artifactKeys = runner.artifactService.listArtifactKeys(
        session.appName,
        session.userId,
        session.id
      );

      const keys = await artifactKeys;
      for (const artifactName of keys) {
        const artifact = runner.artifactService.loadArtifact(
          session.appName,
          session.userId,
          session.id,
          artifactName
        );
        
        if (artifact) {
          toolContext.saveArtifact(artifactName, artifact);
        }
      }
    }

    // Process the final result
    if (!lastEvent) {
      return '';
    }
    
    const userContent = lastEvent.getContent();
    if (!userContent || !userContent.parts || userContent.parts.length === 0 || !userContent.parts[0].text) {
      return '';
    }

    return userContent.parts[0].text;
  }
}