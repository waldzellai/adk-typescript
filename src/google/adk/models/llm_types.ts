// LLM types module for the Google Agent Development Kit (ADK) in TypeScript

import { LlmResponse as InternalLlmResponse } from './base_llm'; // For LlmCallback

// Exports from @google/genai SDK
import {
  Content as GenAiContent,
  Part as GenAiPart,
  FunctionDeclaration as GenAiFunctionDeclaration,
  Schema as GenAiSchema,
  Tool as GenAiTool,
  HarmCategory as GenAiHarmCategory,
  HarmBlockThreshold as GenAiHarmBlockThreshold,
} from '@google/genai';

export {
  GenAiContent,
  GenAiPart,
  GenAiPart as Part, // Alias for backward compatibility
  GenAiFunctionDeclaration,
  GenAiFunctionDeclaration as FunctionDeclaration, // Alias for backward compatibility
  GenAiSchema,
  GenAiTool,
  GenAiHarmCategory,
  GenAiHarmBlockThreshold,
};

// Exports from ADK's base_llm.ts
export {
  LlmRequest,
  LlmResponse,
  LlmUsageMetadata,
  AdkSchema,
  AdkFunctionDeclaration,
  AdkFunctionCall,
  AdkFunctionResponse,
  AdkTool,
  AdkToolConfig,
  AdkPart,
  AdkCandidate,
  AdkSafetyRating,
  AdkSafetySetting,
  AdkGenerationConfig,
  AdkPromptFeedback,
  AdkCitationSource,
  AdkCitationMetadata,
  AdkType,
  AdkType as Type, // Alias for backward compatibility
  FileData,
  StructuredFunctionCallResponse,
  FunctionCallingConfig,
  FunctionCallingMode,
  HarmCategory,
  HarmBlockThreshold,
  HarmProbability,
  BlockReason,
  FinishReason,
  CachedContent,
  Content,
} from './base_llm';

// Locally defined types specific to llm_types.ts or for simpler structures

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: string;
  content: string | GenAiContent;
}

/**
 * Placeholder for LiveConnectConfig type.
 * Based on google.genai.types.LiveConnectConfig in Python
 */
export interface LiveConnectConfig {
  responseModalities?: string[];
  speechConfig?: string[];
  outputAudioTranscription?: boolean;
  [key: string]: string | string[] | boolean | undefined;
}

/**
 * Model config type for configuring LLM behavior.
 * (This is distinct from AdkGenerationConfig which is for a single generation call)
 */
export interface ModelConfig {
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

/**
 * Common function signature for callbacks during LLM interactions.
 */
export type LlmCallback = (response: InternalLlmResponse) => void | Promise<void>;

/**
 * Streaming mode options for LLM responses.
 * Mirrors the Python implementation's StreamingMode enum.
 */
export enum StreamingMode {
  NONE = 'NONE',
  SSE = 'sse',
  BIDI = 'bidi'
}

/**
 * Connection options for LLM services.
 */
export interface ConnectionOptions {
  apiKey?: string;
  projectId?: string;
  credentials?: Record<string, unknown>;
  timeout?: number;
  endpoint?: string;
  location?: string;
}