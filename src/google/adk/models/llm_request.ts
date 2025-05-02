// LLM request module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the LLM request functionality from the Python SDK

import { Content, GenerationConfig, Tool, SafetySetting, LiveConnectConfig, BaseTool, LlmRequest as ILlmRequest } from './llm_types';

/**
 * Request to a language model.
 * Implements the LlmRequest interface from llm_types.ts
 */
export class LlmRequest implements ILlmRequest {
  /**
   * The contents of the request.
   */
  contents?: Content[];

  /**
   * The model to use.
   */
  model?: string;

  /**
   * Configuration for text generation.
   */
  generationConfig?: GenerationConfig;

  /**
   * Tools available to the model.
   */
  tools?: Tool[];

  /**
   * Safety settings for the model.
   */
  safetySettings?: SafetySetting[];

  /**
   * System instructions for the model.
   */
  systemInstruction?: string;

  /**
   * Configuration for live connection.
   */
  liveConnectConfig?: LiveConnectConfig;

  /**
   * Dictionary of tools available to the model.
   */
  toolsDict?: Record<string, BaseTool>;

  /**
   * Creates a new LlmRequest.
   */
  constructor(data: {
    contents?: Content[];
    model?: string;
    generationConfig?: GenerationConfig;
    tools?: Tool[];
    safetySettings?: SafetySetting[];
    systemInstruction?: string;
    liveConnectConfig?: LiveConnectConfig;
    toolsDict?: Record<string, BaseTool>;
  } = {}) {
    this.contents = data.contents;
    this.model = data.model;
    this.generationConfig = data.generationConfig;
    this.tools = data.tools;
    this.safetySettings = data.safetySettings;
    this.systemInstruction = data.systemInstruction;
    this.liveConnectConfig = data.liveConnectConfig;
    this.toolsDict = data.toolsDict;
  }

  /**
   * Set the output schema for the model.
   * 
   * @param outputSchema The output schema to set
   */
  setOutputSchema(outputSchema: Record<string, unknown>): void {
    // This is a simplified implementation 
    // In a real implementation, this would configure structured output format
    console.log('Setting output schema:', outputSchema);
  }
}
