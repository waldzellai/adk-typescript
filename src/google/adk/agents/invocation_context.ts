// Invocation context module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the invocation context functionality from the Python SDK

import { BaseAgent } from './base_agent';
import { RunConfig } from './run_config';
import { LiveRequestQueue } from './live_request_queue';
import { BaseArtifactService, InMemoryArtifactService } from '../artifacts';
import { BaseMemoryService } from '../memory';
import { BaseSessionService, InMemorySessionService, Session } from '../sessions';
import { Content } from '../models/base_llm';
import { TranscriptionEntry } from './transcription_entry';
import { ActiveStreamingTool } from './active_streaming_tool';

/**
 * Context provided during agent invocation.
 */
export class InvocationContext {
  /**
   * The agent being invoked.
   */
  agent: BaseAgent;

  /**
   * The configuration for this run.
   */
  runConfig: RunConfig;

  /**
   * The queue for live requests.
   */
  requestQueue: LiveRequestQueue;

  /**
   * The service for managing artifacts.
   */
  artifactService: BaseArtifactService | null;

  /**
   * The service for managing memory.
   */
  memoryService: BaseMemoryService | null;

  /**
   * The service for managing sessions.
   */
  sessionService: BaseSessionService;

  /**
   * The current session.
   */
  session: Session | null = null;

  /**
   * The content from the user.
   */
  userContent: Content | null = null;

  /**
   * The unique identifier for this invocation.
   */
  invocationId: string;

  /**
   * The branch for this invocation.
   */
  branch: string | null = null;

  /**
   * Flag to indicate if the invocation should end.
   */
  endInvocation: boolean = false;

  /**
   * The name of the application.
   */
  appName: string;

  /**
   * The ID of the user.
   */
  userId: string;

  /**
   * The running streaming tools of this invocation.
   * Based on Python: active_streaming_tools: Optional[dict[str, ActiveStreamingTool]] = None
   */
  activeStreamingTools?: Record<string, ActiveStreamingTool> | null;

  /**
   * Caches necessary data for transcription.
   * Based on Python: transcription_cache: Optional[list[TranscriptionEntry]] = None
   */
  transcriptionCache?: TranscriptionEntry[] | null;

  /**
   * Creates a new invocation context.
   */
  constructor(options: {
    agent: BaseAgent;
    runConfig: RunConfig;
    requestQueue?: LiveRequestQueue;
    artifactService?: BaseArtifactService | null;
    memoryService?: BaseMemoryService | null;
    sessionService?: BaseSessionService;
    session?: Session | null;
    userContent?: Content | null;
    invocationId?: string;
    branch?: string | null;
    appName?: string;
    userId?: string;
    endInvocation?: boolean;
    activeStreamingTools?: Record<string, ActiveStreamingTool> | null;
    transcriptionCache?: TranscriptionEntry[] | null;
  }) {
    this.agent = options.agent;
    this.runConfig = options.runConfig;
    this.requestQueue = options.requestQueue || new LiveRequestQueue();
    this.artifactService = options.artifactService !== undefined ? options.artifactService : new InMemoryArtifactService();
    this.memoryService = options.memoryService || null;
    this.sessionService = options.sessionService || new InMemorySessionService();
    this.session = options.session || null;
    this.userContent = options.userContent || null;
    this.invocationId = options.invocationId || generateInvocationId();
    this.branch = options.branch || null;
    this.appName = options.appName || this.agent.name;
    this.userId = options.userId || 'default_user';
    this.endInvocation = options.endInvocation || false;
    this.activeStreamingTools = options.activeStreamingTools || null;
    this.transcriptionCache = options.transcriptionCache || null;
  }

  /**
   * Tracks number of llm calls made.
   * Based on Python: increment_llm_call_count
   */
  incrementLlmCallCount(): void {
    // TODO: Implement actual cost management logic if needed
    // console.log('LLM call count incremented (placeholder)');
  }

  /**
   * Creates a copy of this invocation context with modifications.
   *
   * @param modifications The modifications to apply to the context
   * @returns A new invocation context with the modifications applied
   */
  withModifications(modifications: Partial<{
    agent: BaseAgent;
    runConfig: RunConfig;
    requestQueue: LiveRequestQueue;
    artifactService: BaseArtifactService | null;
    memoryService: BaseMemoryService | null;
    sessionService: BaseSessionService;
    session: Session | null;
    userContent: Content | null;
    invocationId: string;
    branch: string | null;
    appName: string;
    userId: string;
    endInvocation: boolean;
    activeStreamingTools?: Record<string, ActiveStreamingTool> | null;
    transcriptionCache?: TranscriptionEntry[] | null;
  }>): InvocationContext {
    return new InvocationContext({
      agent: modifications.agent || this.agent,
      runConfig: modifications.runConfig || this.runConfig,
      requestQueue: modifications.requestQueue || this.requestQueue,
      artifactService: modifications.artifactService || this.artifactService,
      memoryService: modifications.memoryService !== undefined ?
        modifications.memoryService : this.memoryService,
      sessionService: modifications.sessionService || this.sessionService,
      session: modifications.session !== undefined ?
        modifications.session : this.session,
      userContent: modifications.userContent !== undefined ?
        modifications.userContent : this.userContent,
      invocationId: modifications.invocationId || this.invocationId,
      branch: modifications.branch !== undefined ?
        modifications.branch : this.branch,
      appName: modifications.appName || this.appName,
      userId: modifications.userId || this.userId,
      endInvocation: modifications.endInvocation !== undefined ?
        modifications.endInvocation : this.endInvocation,
      activeStreamingTools: modifications.activeStreamingTools !== undefined ?
        modifications.activeStreamingTools : this.activeStreamingTools,
      transcriptionCache: modifications.transcriptionCache !== undefined ?
        modifications.transcriptionCache : this.transcriptionCache,
    });
  }
}

// Re-export the context classes for backward compatibility
export { ReadonlyContext } from './readonly_context';
export { CallbackContext } from './callback_context';


/**
 * Generates a unique identifier for invocation contexts.
 *
 * @returns A unique invocation ID
 */
export function generateInvocationId(): string {
  // Using a combination of timestamp and random string for uniqueness
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `ctx-${timestamp}-${randomStr}`;
}