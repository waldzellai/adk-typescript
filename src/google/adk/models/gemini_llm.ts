// Gemini LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the Gemini integration functionality from the Python SDK

// Import necessary types directly from base_llm where they are re-exported
import {
  BaseLlm,
  LlmRequest,
  LlmResponse,
  HarmCategory,
  AdkSafetyRating,
  LlmUsageMetadata,
  AdkFunctionCall,
  AdkCandidate,
  AdkPromptFeedback,
  BlockReason,
  HarmProbability,
  Content,
} from './base_llm';
import { BaseLlmConnection } from './base_llm_connection';
import { GeminiLlmConnection } from './gemini_llm_connection';

// Import necessary types from the Google Generative AI SDK
import {
  GoogleGenAI,
  GenerateContentResponse as SdkGenerateContentResponse,
  FinishReason, 
  Part as SdkPart, 
  Candidate as SdkCandidate, 
  CitationMetadata as SdkCitationMetadata, 
  SafetyRating as SdkSafetyRating,     
  Citation as SdkCitation, 
} from '@google/genai';

/**
 * Gemini LLM class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlm interface to provide a consistent API for different LLMs
 */
export class GeminiLlm extends BaseLlm {
  private apiKey: string;
  private modelName: string; // Keep track of model name
  private googleAI: GoogleGenAI | null = null;

  // Optional Gemini LLM connection
  private connection: GeminiLlmConnection | null = null;

  // Updated constructor signature to match LlmRegistry
  constructor(options: { model: string } & LlmRequest) {
    super(options.model);
    // Retrieve API key from environment variables
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Gemini API key not found in environment variables (GEMINI_API_KEY)');
    }

    // Initialize the SDK client
    this.modelName = options.model; // Store model name
  }

  private async _initializeClientIfNeeded(apiKey?: string): Promise<void> {
    if (!this.googleAI) {
      const key = apiKey || process.env['GEMINI_API_KEY'];
      if (!key) {
        throw new Error('Gemini API key is not provided.');
      }
      this.googleAI = new GoogleGenAI({apiKey: key}); // Pass options object
    }
  }

  static provider(): string {
    return 'google';
  }

  // Update supported models
  static supportedModels(): string[] {
    return ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-pro-latest', 'gemini-pro-vision'];
  }

  /**
   * Gets or creates the client connection
   *
   * @returns A connection to the LLM
   */
  getConnection(): BaseLlmConnection {
    if (!this.connection) {
      const request: LlmRequest = {
        contents: [],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          candidateCount: 1,
          maxOutputTokens: 2048
        }
      };
      this.connection = new GeminiLlmConnection(this.apiKey, request);
    }
    return this.connection;
  }

  /**
   * Maps ADK Content[] to the Google SDK's expected Content[] structure.
   * TODO: Implement proper mapping, especially for Parts.
   */
  private mapAdkContentsToGoogle(contents: Content[] | undefined): SdkPart[] { 
    if (!contents) return [];
    // This is a placeholder mapping. Actual mapping might be more complex.
    return contents.flatMap(c => c.parts || []); // Example: flatten parts
  }

  /**
   * Generate content using the Gemini model
   *
   * @param request - The LLM request
   * @param _stream - Whether to stream the response (currently basic implementation)
   * @returns A promise resolving to an LLMResponse
   */
  async generateContent(
    request: LlmRequest,
    _stream: boolean = false
  ): Promise<LlmResponse> {
    await this._initializeClientIfNeeded(request.apiKey);

    if (!this.googleAI) { 
      throw new Error('Gemini client not initialized.');
    }

    // Construct the request for the SDK
    const sdkRequest = {
      model: this.modelName, 
      contents: this.mapAdkContentsToGoogle(request.contents), 
      safetySettings: request.safetySettings?.map(setting => ({
        category: setting.category,
        threshold: setting.threshold,
      })),
      tools: request.tools,
      generationConfig: request.generationConfig,
      systemInstruction: request.systemInstruction,
    };

    let sdkResponse: SdkGenerateContentResponse;
    try {
      // Call generateContent on this.googleAI.models
      sdkResponse = await this.googleAI.models.generateContent(sdkRequest);
    } catch (error: unknown) {
      // Log the error or handle it as needed
      console.error('Error calling Gemini API:', error);
      // Provide a more specific error type if possible, otherwise use 'unknown' or 'Error'
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini API request failed: ${errorMessage}`);
    }

    // Map the SDK response to the ADK LlmResponse
    return this.mapGoogleResponseToAdk(sdkResponse);
  }

  /**
   * Maps the Google SDK response to the ADK LlmResponse format.
   * @param sdkResponse The response object from the Google SDK.
   * @returns The mapped ADK response object.
   */
  private mapGoogleResponseToAdk(sdkResponse: SdkGenerateContentResponse): LlmResponse {
    // Initialize with default or empty values
    const candidates: AdkCandidate[] = [];
    let usageMetadata: LlmUsageMetadata | undefined = undefined;
    let promptFeedback: AdkPromptFeedback | undefined = undefined;

    if (sdkResponse.candidates) { 
      sdkResponse.candidates.forEach((sdkCandidate: SdkCandidate) => {
        const adkParts = sdkCandidate.content?.parts?.map(part => {
          if (part.text) {
            return { text: part.text };
          }
          if (part.functionCall) {
            const adkFunctionCall: AdkFunctionCall = {
              name: part.functionCall.name, 
              args: part.functionCall.args || {},
            };
            return { functionCall: adkFunctionCall }; 
          }
          return {}; 
        }) || [];

        const adkSafetyRatings: AdkSafetyRating[] = sdkCandidate.safetyRatings
          ?.filter(sr => sr.category !== undefined && sr.probability !== undefined)
          .map((sr: SdkSafetyRating) => ({
            category: sr.category as HarmCategory, 
            probability: sr.probability as HarmProbability, 
            blocked: sr.blocked,
          })) || [];

        candidates.push({
          index: sdkCandidate.index ?? 0, 
          content: { parts: adkParts, role: sdkCandidate.content?.role || 'model' }, 
          finishReason: sdkCandidate.finishReason,
          safetyRatings: adkSafetyRatings,
          citationMetadata: sdkCandidate.citationMetadata ? {
            citationSources: (sdkCandidate.citationMetadata as SdkCitationMetadata).citations
              ?.filter(cs => 
                cs.startIndex !== undefined && 
                cs.endIndex !== undefined && 
                cs.uri !== undefined && 
                cs.license !== undefined
              )
              .map((cs: SdkCitation) => ({
                startIndex: cs.startIndex as number, 
                endIndex: cs.endIndex as number,   
                uri: cs.uri as string,             
                license: cs.license as string,         
              }))
          } : undefined,
        });
      });
    }

    if (sdkResponse.usageMetadata) { 
      usageMetadata = {
        promptTokenCount: sdkResponse.usageMetadata.promptTokenCount,
        candidatesTokenCount: sdkResponse.usageMetadata.candidatesTokenCount, 
        totalTokenCount: sdkResponse.usageMetadata.totalTokenCount,
      };
    }

    if (sdkResponse.promptFeedback) { 
      const adkSafetyRatingsForPrompt: AdkSafetyRating[] = sdkResponse.promptFeedback.safetyRatings
        ?.filter(sr => sr.category !== undefined && sr.probability !== undefined)
        .map((sr: SdkSafetyRating) => ({
          category: sr.category as HarmCategory, 
          probability: sr.probability as HarmProbability, 
          blocked: sr.blocked,
        })) || [];

      promptFeedback = {
        blockReason: sdkResponse.promptFeedback.blockReason as unknown as BlockReason | undefined, 
        blockReasonMessage: sdkResponse.promptFeedback.blockReasonMessage,
        safetyRatings: adkSafetyRatingsForPrompt,
      };
    }

    const turnComplete = candidates.some(c => c.finishReason === FinishReason.STOP || c.finishReason === FinishReason.MAX_TOKENS);
    
    const allFunctionCalls: AdkFunctionCall[] = [];
    candidates.forEach(c => {
      c.content?.parts?.forEach(p => {
        if (p.functionCall) {
          allFunctionCalls.push(p.functionCall as AdkFunctionCall); 
        }
      });
    });

    return {
      candidates: candidates,
      usageMetadata: usageMetadata,
      rawResponse: sdkResponse, 
      turnComplete: turnComplete,
      text: candidates[0]?.content?.parts?.find(p => p.text)?.text,
      functionCalls: allFunctionCalls.length > 0 ? allFunctionCalls : undefined, 
      promptFeedback: promptFeedback, 
    };
  }

  /**
   * Generates content from the model asynchronously.
   *
   * @param request The request to the model
   * @param stream Whether to stream the response
   * @returns An async generator yielding responses from the model
   */
  async *generateContentAsync(
    request: LlmRequest,
    stream: boolean = false
  ): AsyncGenerator<LlmResponse, void, unknown> {
    await this._initializeClientIfNeeded(request.apiKey);

    if (!this.googleAI) { 
      throw new Error('Gemini client not initialized.');
    }

    // Construct the request for the SDK
    const sdkRequest = {
      model: this.modelName, 
      contents: this.mapAdkContentsToGoogle(request.contents), 
      safetySettings: request.safetySettings?.map(setting => ({
        category: setting.category,
        threshold: setting.threshold,
      })),
      tools: request.tools,
      generationConfig: request.generationConfig,
      systemInstruction: request.systemInstruction,
    };

    if (stream) {
      // Call generateContentStream on this.googleAI.models
      const streamResult = await this.googleAI.models.generateContentStream(sdkRequest);
      yield* this.processStream(streamResult, request);
    } else {
      // Call generateContent on this.googleAI.models
      const result = await this.googleAI.models.generateContent(sdkRequest);
      yield this.mapGoogleResponseToAdk(result); 
    }
  }

  /**
   * Processes a streaming response from the Google SDK.
   *
   * @param {AsyncGenerator<SdkGenerateContentResponse, void, unknown>} stream - The async generator yielding response chunks.
   * @param {LlmRequest} request - The original ADK request.
   * @returns {AsyncGenerator<LlmResponse, void, unknown>} An async generator yielding mapped ADK response chunks.
   */
  private async *processStream(
    stream: AsyncGenerator<SdkGenerateContentResponse, void, unknown>,
    _request: LlmRequest 
  ): AsyncGenerator<LlmResponse, void, unknown> {
    // Use const as aggregatedResponse is not reassigned
    const aggregatedResponse: LlmResponse = { rawResponse: [] }; 
    let turnComplete = false;

    try {
      for await (const chunk of stream) {
        const mappedChunk = this.mapGoogleResponseToAdk(chunk);

        // Aggregate content (example: simple text concatenation)
        if (mappedChunk.text) {
          aggregatedResponse.text = (aggregatedResponse.text || '') + mappedChunk.text;
        }
        // TODO: Aggregate function calls, safety ratings, metadata correctly
        if (Array.isArray(aggregatedResponse.rawResponse)) {
          aggregatedResponse.rawResponse.push(chunk); 
        }

        turnComplete = mappedChunk.turnComplete ?? turnComplete; 

        yield { ...mappedChunk, turnComplete: false }; 
      }

      // Yield the final aggregated response
      aggregatedResponse.turnComplete = turnComplete;
      // Finalize aggregation of other fields if necessary
      yield aggregatedResponse;
    } catch (error: unknown) {
      console.error('Error processing Gemini stream:', error);
      // Provide a more specific error type if possible
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini stream processing failed: ${errorMessage}`);
    }
  }

  /**
   * Connects to the model for live interaction.
   *
   * @param request The request to the model
   * @returns A connection to the model
   */
  async connect( 
    request: LlmRequest
  ): Promise<BaseLlmConnection> {
    // Ensure connection uses the unified LlmRequest type
    this.connection = new GeminiLlmConnection(this.apiKey, request);
    return this.connection;
  }
}