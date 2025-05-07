// Evaluation generator module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the evaluation generator functionality from the Python SDK

import * as fs from 'fs';
// Using a simpler UUID function instead of importing uuid package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import { BaseAgent } from '../agents/base_agent';
import { Content as GenAIContent, Part } from '@google/genai';
import { Event } from '../events/event';
import { Session } from '../sessions/session';
import { 
  QUERY_COLUMN, 
  EXPECTED_TOOL_USE_COLUMN,
  REFERENCE_COLUMN
} from './evaluation_constants';
import { InMemoryRunner } from '../runners';
import { RunConfig } from '../agents/run_config';
import { InvocationContext } from '../agents/invocation_context';
import { LlmAgent } from '../agents/llm_agent';

/**
 * Results from the evaluation runs.
 */
export interface EvaluationResult {
  responses: Array<{
    query: string;
    response?: string;
    expectedToolUse?: string[];
    actualToolUse?: string[];
    reference?: string;
    score?: number;
  }>;
  metrics: Record<string, number>;
}

/**
 * Tool call information captured during evaluation.
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  response?: unknown;
}

/**
 * Generates evaluation responses by running the agent module multiple times.
 * Mirrors the Python ADK's evaluation_generator functionality.
 *
 * @param agent The agent instance to evaluate
 * @param evalDataset The evaluation dataset (array of objects)
 * @param numRuns Number of runs per query (default: 1)
 * @param _initialSession Optional initial session state
 * @returns EvaluationResult
 */
export async function generateEvaluation(
  agent: BaseAgent,
  evalDataset: Record<string, unknown>[],
  numRuns: number = 1,
  _initialSession: Record<string, unknown> = {}
): Promise<EvaluationResult> {
  const responses: EvaluationResult['responses'] = [];

  for (const entry of evalDataset) {
    const query = entry[QUERY_COLUMN] as string;
    for (let runIdx = 0; runIdx < numRuns; runIdx++) {
      // Create content for the agent (SDK types)
      const content: GenAIContent = {
        role: 'user',
        parts: [{ text: query }] as Part[]
      };
      
      // Convert GenAI Content to ADK Content type
      const adkContent: ADKContent = {
        role: 'user', 
        parts: content.parts?.map(p => ({text: (p as Part).text || ''})) || [{text: query}]
      };
      
      // Tool call capture stub (expand as needed)
      const capturedTools: string[] = [];
      let responseText = '';
      try {
        // Create a session object
        const sessionId = uuidv4();
        const userId = uuidv4();
        const session = new Session({
          id: sessionId,
          appName: agent.name,
          userId: userId
        });

        // Create a proper InvocationContext
        const context = new InvocationContext({
          agent: agent,
          runConfig: new RunConfig(),
          session: session,
          userId: userId,
          userContent: adkContent
        });

        // Use the agent's async generator interface
        for await (const event of agent.runAsync(context)) {
          // Only process non-user events
          if ((event as unknown as Event).getAuthor && (event as unknown as Event).getAuthor() !== 'user') {
            const eventContent = (event as unknown as Event).getContent ? (event as unknown as Event).getContent() : undefined;
            if (eventContent && eventContent.parts && Array.isArray(eventContent.parts)) {
              for (const part of eventContent.parts) {
                if (typeof part === 'object' && part !== null && 'text' in part) {
                  responseText += (part as Part).text ?? '';
                }
              }
            }
          }
        }
      } catch (error) {
        responseText = `Error: ${error}`;
      }
      responses.push({
        query,
        response: responseText,
        expectedToolUse: entry[EXPECTED_TOOL_USE_COLUMN] as string[] | undefined,
        actualToolUse: capturedTools,
        reference: entry[REFERENCE_COLUMN] as string | undefined
      });
    }
  }

  // Basic metrics, mirroring Python ADK's placeholder logic
  const metrics: Record<string, number> = {
    total_queries: responses.length,
    successful_responses: responses.filter(r => r.response && r.response.length > 0).length
  };

  return {
    responses,
    metrics
  };
}

/**
 * Results from the evaluation runs.
 */
export interface EvaluationResult {
  responses: Array<{
    query: string;
    response?: string;
    expectedToolUse?: string[];
    actualToolUse?: string[];
    reference?: string;
    score?: number;
  }>;
  metrics: Record<string, number>;
}

/**
 * Responsible for generating evaluation responses by running agent modules.
 */
export class EvaluationGenerator {
  /**
   * Generates responses by running the agent module multiple times.
   * 
   * @param evalDataset Evaluation dataset
   * @param agentModule Agent module path
   * @param repeatNum Number of times to repeat each evaluation
   * @param agentName Optional agent name
   * @param _initialSession Initial session state
   * @returns Evaluation responses
   */
  static async generateResponses(
    evalDataset: Array<Record<string, unknown>[]>,
    agentModule: string,
    repeatNum: number = 1,
    agentName?: string,
    _initialSession: Record<string, unknown> = {}
  ): Promise<EvaluationResult> {
    // In a real TypeScript implementation, we'd use dynamic imports
    // but for now we'll create a mock agent
    // const agent = this.createMockAgent(agentName || 'MockAgent');
    const responses: EvaluationResult['responses'] = [];
    const toolCalls: Record<string, ToolCall[]> = {};
    
    // First create an agent and then pass it to the runner
    const mockAgent = this.createMockAgent(agentName || 'MockAgent');
    
    // Create a runner for the agent
    const runner = new InMemoryRunner(
      mockAgent as unknown as LlmAgent, 
      agentName || 'MockAgent'
    );
    
    for (const dataset of evalDataset) {
      for (const entry of dataset) {
        const query = entry[QUERY_COLUMN] as string;
        if (!query) continue;
        
        for (let i = 0; i < repeatNum; i++) {
          const sessionId = `eval-${uuidv4()}`;
          const userId = 'eval-user';
          
          // Create content from the query
          // Force the type to avoid Content type conflicts between modules
          const content = {
            role: 'user',
            parts: [{ text: query }] as Part[]
          } as GenAIContent;
          
          // Capture tool calls
          const capturedTools: ToolCall[] = [];
          toolCalls[query] = capturedTools;
          
          // Run the agent
          let responseText = '';
          try {
            for await (const event of runner.runAsync({
              userId,
              sessionId,
              newMessage: content
            })) {
              if (event.getAuthor() !== 'user') {
                // Extract text from content
                const content = event.getContent();
                if (content && content.parts && Array.isArray(content.parts)) {
                  for (const part of content.parts) {
                    if (typeof part === 'object' && part !== null && 'text' in part) {
                      responseText += (part as Part).text ?? '';
                    }
                  }
                }
              }
              
              // Capture tool calls from event actions
              // Due to type incompatibilities, we'll get tool calls from the raw object
              // In a real implementation, we would properly integrate with EventActions
              const actionsObject = event.getActions() as unknown as Record<string, unknown>;
              if (actionsObject && actionsObject.tool_calls) {
                const toolAction = actionsObject.tool_calls;
                if (Array.isArray(toolAction)) {
                  for (const tool of toolAction) {
                    capturedTools.push({
                      name: tool.name,
                      args: tool.args || {},
                      response: tool.response
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error running agent for query "${query}":`, error);
            responseText = `Error: ${error}`;
          }
          
          // Add response to results
          responses.push({
            query,
            response: responseText,
            expectedToolUse: entry[EXPECTED_TOOL_USE_COLUMN] as string[],
            actualToolUse: capturedTools.map(tool => tool.name),
            reference: entry[REFERENCE_COLUMN] as string
          });
        }
      }
    }
    
    // Calculate metrics
    const metrics: Record<string, number> = {
      'total_queries': responses.length,
      'successful_responses': responses.filter(r => r.response && r.response.length > 0).length
    };
    
    return {
      responses,
      metrics
    };
  }

  /**
   * Generates responses from an existing session.
   * 
   * @param sessionPath Path to the session file
   * @param evalDataset Evaluation dataset
   * @returns Evaluation responses
   */
  static async generateResponsesFromSession(
    sessionPath: string,
    evalDataset: Array<Record<string, unknown>[]>
  ): Promise<EvaluationResult> {
    // Load the session
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const session = Session.fromJSON(sessionData);
    
    const responses: EvaluationResult['responses'] = [];
    
    // Extract events from the session
    const allContents = session.getContents();
    const userMessages = allContents.filter(c => c.role === 'user');
    const assistantMessages = allContents.filter(c => c.role === 'assistant');
    
    // Match queries with responses
    for (const dataset of evalDataset) {
      for (const entry of dataset) {
        const query = entry[QUERY_COLUMN] as string;
        if (!query) continue;
        
        // Find the user message with this query
        const userIdx = userMessages.findIndex(m => {
          if (!m.parts || !Array.isArray(m.parts)) return false;
          return m.parts.some(p => typeof p === 'object' && p && 'text' in p && p.text === query);
        });
        
        if (userIdx !== -1 && userIdx < assistantMessages.length) {
          const responseMessage = assistantMessages[userIdx];
          let responseText = '';
          
          if (responseMessage.parts && Array.isArray(responseMessage.parts)) {
            for (const part of responseMessage.parts) {
              if (typeof part === 'object' && part !== null && 'text' in part) {
                responseText += part.text;
              }
            }
          }
          
          responses.push({
            query,
            response: responseText,
            reference: entry[REFERENCE_COLUMN] as string
          });
        }
      }
    }
    
    return {
      responses,
      metrics: {
        'total_queries': responses.length,
        'matched_responses': responses.filter(r => r.response).length
      }
    };
  }
  
  /**
   * Creates a mock agent for testing purposes.
   * 
   * @param agentName The name of the agent
   * @returns A mock agent
   */
  private static createMockAgent(agentName: string): BaseAgent {
    return {
      name: agentName,
      description: 'Mock agent for evaluation',
      parentAgent: null,
      subAgents: [],
      beforeAgentCallback: null,
      afterAgentCallback: null,
      runAsync: async function* () {
        const mockContent = { 
          role: 'assistant', 
          parts: [{ text: 'This is a mock response for evaluation.' }] as Part[]
        } as ADKContent;
        const event = new Event({
          author: 'agent',
          content: mockContent
        });
        yield event;
      },
      runLiveAsync: async function* () {
        const mockContent = { 
          role: 'assistant', 
          parts: [{ text: 'This is a mock live response for evaluation.' }] as Part[]
        } as ADKContent;
        const event = new Event({
          author: 'agent',
          content: mockContent
        });
        yield event;
      }
    } as unknown as BaseAgent;
  }
}