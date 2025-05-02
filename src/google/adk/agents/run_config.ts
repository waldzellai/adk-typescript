// Run configuration module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the run configuration functionality from the Python SDK

/**
 * StreamingMode enum for controlling agent response streaming.
 */
export enum StreamingMode {
  NONE = 'NONE',
  TOKEN_BY_TOKEN = 'TOKEN_BY_TOKEN',
  AUTO_CHUNK = 'AUTO_CHUNK',
}

/**
 * Speech configuration for the LLM response.
 */
export interface SpeechConfig {
  modelName?: string;
  voice?: string;
  languageCode?: string;
}

/**
 * Audio transcription configuration.
 */
export interface AudioTranscriptionConfig {
  model?: string;
  languageCodes?: string[];
}

/**
 * Configuration for agent runtime behavior.
 */
export class RunConfig {
  /**
   * Speech configuration for the live agent.
   */
  speechConfig?: SpeechConfig;

  /**
   * The output modalities. If not set, it defaults to text.
   */
  responseModalities?: string[];

  /**
   * Whether to save the input blobs as artifacts.
   */
  saveInputBlobsAsArtifacts: boolean = false;

  /**
   * Whether to support Compositional Function Calling (CFC).
   * This is an experimental feature.
   */
  supportCfc: boolean = false;

  /**
   * Streaming mode for the agent response.
   */
  streamingMode: StreamingMode = StreamingMode.NONE;

  /**
   * Output transcription for live agents with audio response.
   */
  outputAudioTranscription?: AudioTranscriptionConfig;

  /**
   * A limit on the total number of LLM calls for a given run.
   * Values <= 0 allow for unbounded number of LLM calls.
   */
  maxLlmCalls: number = 500;

  /**
   * Maximum number of iterations for the agent.
   */
  maxIterations: number = 10;

  /**
   * Session ID for the agent.
   */
  sessionId: string = '';

  /**
   * Parent session ID for the agent.
   */
  parentSessionId: string = '';

  /**
   * Context for the agent run.
   */
  context: Record<string, unknown> = {};

  /**
   * Whether to save the session state.
   */
  saveSession: boolean = true;

  /**
   * Whether to load the session state.
   */
  loadSession: boolean = true;

  /**
   * Whether to save artifacts.
   */
  saveArtifacts: boolean = true;

  /**
   * Whether to load artifacts.
   */
  loadArtifacts: boolean = true;

  /**
   * Whether to save to memory service.
   */
  saveMemory: boolean = true;

  /**
   * Whether to load from memory service.
   */
  loadMemory: boolean = true;

  /**
   * Whether to enable debugging mode.
   */
  debug: boolean = false;

  /**
   * Creates a new RunConfig instance.
   * 
   * @param options The configuration options
   */
  constructor(options: Partial<RunConfig> = {}) {
    Object.assign(this, options);
    
    // Validate maxLlmCalls
    if (this.maxLlmCalls === Number.MAX_SAFE_INTEGER) {
      throw new Error(`maxLlmCalls should be less than ${Number.MAX_SAFE_INTEGER}.`);
    } else if (this.maxLlmCalls <= 0) {
      console.warn(
        'maxLlmCalls is less than or equal to 0. This will result in ' +
        'no enforcement on total number of LLM calls that will be made for a ' +
        'run. This may not be ideal, as this could result in a never ' +
        'ending communication between the model and the agent in certain cases.'
      );
    }
  }
}
