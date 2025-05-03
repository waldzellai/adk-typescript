// LLM types module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the LLM types functionality from the Python SDK

import { HarmCategory, HarmBlockThreshold } from '@google/genai';

/**
 * Represents a part of content in an LLM interaction.
 */
export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
  videoMetadata?: {
    startOffset?: {
      seconds?: number;
      nanos?: number;
    };
    endOffset?: {
      seconds?: number;
      nanos?: number;
    };
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
  codeExecutionResult?: {
    outcome?: string;
    output: string;
  };
  executableCode?: {
    code: string;
    language: string;
  };
}

/**
 * Content type mirroring the Python implementation.
 * Represents a complete message in an LLM interaction.
 */
export interface Content {
  role: string;
  parts: Part[];
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: string;
  content: string | Content;
}

/**
 * Placeholder for LiveConnectConfig type.
 * Based on google.genai.types.LiveConnectConfig in Python
 */
export interface LiveConnectConfig {
  responseModalities?: string[]; // Placeholder
  speechConfig?: string[]; // Placeholder
  outputAudioTranscription?: boolean;
  [key: string]: string | string[] | boolean | undefined; // Placeholder
}

/**
 * Placeholder for BaseTool type.
 */
export interface BaseTool {
  name: string;
  description?: string;
}

/**
 * LLM Request type representing a request to an LLM.
 */
export interface LlmRequest {
  contents?: Content[];
  model?: string;
  generationConfig?: GenerationConfig;
  tools?: Tool[];
  safetySettings?: SafetySetting[];
  systemInstruction?: string;
  liveConnectConfig?: LiveConnectConfig; // Added optional based on Python usage
  toolsDict?: Record<string, BaseTool>; // Added optional, Python has default_factory
  setOutputSchema?(outputSchema: Record<string, unknown>): void;
}

/**
 * Safety Rating type representing a safety rating for a content block.
 */
export interface SafetyRating {
  category: string;
  probability: number; // TODO(b/340453892): Use an enum or specific type
}

/**
 * Function Call type representing a function call requested by the LLM.
 */
export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

// Export LlmResponse from llm_response.ts instead of defining it here
export { LlmResponse } from './llm_response';

/**
 * Enum for finish reasons.
 */
export enum FinishReason {
  UNSPECIFIED = 'FINISH_REASON_UNSPECIFIED',
  STOP = 'STOP',
  MAX_TOKENS = 'MAX_TOKENS',
  SAFETY = 'SAFETY',
  RECITATION = 'RECITATION',
  OTHER = 'OTHER',
}

/**
 * Usage metadata for an LLM response.
 */
export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

/**
 * Tool type representing a tool available to the LLM.
 */
export interface Tool {
  functionDeclarations: FunctionDeclaration[];
}

/**
 * Schema type for function parameter and return types.
 */
export interface Schema {
  type?: Type;
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  default?: unknown;
  enum?: string[];
  nullable?: boolean;
  any_of?: Schema[];
}

/**
 * Type enum for schema types.
 */
export enum Type {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT'
}

/**
 * Function declaration type for tool definitions.
 */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Schema;
  response?: Schema;
}

/**
 * Generation config type for controlling LLM generation.
 */
export interface GenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  candidateCount: number;
  maxOutputTokens: number;
  stopSequences?: string[];
}

/**
 * Safety setting type for controlling LLM content filtering.
 */
export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

/**
 * Model config type for configuring LLM behavior.
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
export type LlmCallback = (response: import('./llm_response').LlmResponse) => void | Promise<void>;

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