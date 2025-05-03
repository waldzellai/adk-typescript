// Gemini LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the Gemini integration functionality from the Python SDK

import { BaseLlm } from './base_llm';
import { BaseLlmConnection } from './base_llm_connection';
import { LlmRequest } from './llm_types';
import { LlmResponse } from './llm_response';
import { GeminiLlmConnection } from './gemini_llm_connection';

// Import the Google Generative AI SDK
import { GoogleGenAI } from '@google/genai';

// Define interfaces to match the @google/genai types
interface ModelPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

interface ModelContent {
  role: string;
  parts: ModelPart[];
}

interface SafetySetting {
  category: string;
  threshold: string;
}

interface FunctionDeclarationSpec {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

interface ToolSpec {
  functionDeclarations: FunctionDeclarationSpec[];
}

interface GenerateContentRequest {
  contents: ModelContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: SafetySetting[];
  tools?: ToolSpec[];
}

// Define interfaces for response types
interface ModelResponse {
  candidates?: Array<{
    content?: {
      role?: string;
      parts?: ModelPart[];
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// Define a type for the model returned by GoogleGenAI
interface GenerativeModelType {
  generateContent(params: {
    contents: ModelContent[];
    generationConfig?: Record<string, unknown>;
    tools?: ToolSpec[];
  }): Promise<ModelResponse>;
}

/**
 * Gemini LLM class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlm interface to provide a consistent API for different LLMs
 */
export class GeminiLlm extends BaseLlm {
  // The API key for authenticating with the Google Generative AI API
  private apiKey: string;
  
  // The model name (e.g., "gemini-pro", "gemini-pro-vision")
  private modelName: string;
  
  // The Google Generative AI API client
  private genAIClient: GoogleGenAI | null = null;

  // Optional Gemini LLM connection
  private connection: GeminiLlmConnection | null = null;

  /**
   * Creates a new GeminiLlm instance
   * 
   * @param apiKey - The API key for authenticating with the Google Generative AI API
   * @param modelName - The model name to use (e.g., "gemini-pro")
   */
  constructor(apiKey: string, modelName: string = 'gemini-pro') {
    super(modelName);
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * Gets or creates the client connection
   * 
   * @returns A connection to the LLM
   */
  getConnection(): BaseLlmConnection {
    if (!this.connection) {
      // Create a minimal LlmRequest instead of just passing the modelName
      const request: LlmRequest = {
        contents: [],
        // Default generation config with required fields
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
   * Initialize the model for making requests
   * 
   * @param apiKey - Optional API key to use instead of the one provided in the constructor
   * @param modelName - Optional model name to use instead of the one provided in the constructor
   * @returns The model object
   */
  private async initializeModel(apiKey?: string, modelName?: string): Promise<GenerativeModelType> {
    // Use provided values or fall back to instance properties
    const key = apiKey || this.apiKey;
    const model = modelName || this.modelName;
    
    // Initialize client if needed
    if (!this.genAIClient) {
      // Pass the API key as part of options object
      this.genAIClient = new GoogleGenAI({ apiKey: key });
    }
    
    // Get the model from the client
    const genModel = this.genAIClient.models.get({ model });
    return genModel as unknown as GenerativeModelType;
  }

  /**
   * Maybe append user content to the end of the request if needed
   * 
   * @param request - The LLM request to possibly modify
   */
  private maybeAppendUserContent(request: LlmRequest) {
    // If the last role is not 'user', add an empty user message
    const contents = request.contents || [];
    if (contents.length > 0) {
      const lastContent = contents[contents.length - 1];
      if (lastContent.role !== 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: '' }],
        });
      }
    }
  }

  /**
   * Convert an LLM request to a Gemini-specific GenerateContentRequest
   * 
   * @param request - The LLM request to convert
   * @returns A Gemini-specific GenerateContentRequest
   */
  private convertToGenerateRequest(request: LlmRequest): GenerateContentRequest {
    // Convert contents to Gemini format
    const contents = (request.contents || []).map((content) => {
      // Map content role to Gemini role (user, model)
      let role = content.role;
      if (role === 'assistant') {
        role = 'model'; // Gemini uses 'model' instead of 'assistant'
      }
      
      // Convert content parts to Gemini parts
      const parts = content.parts.map((part) => {
        if (part.text) {
          return { text: part.text };
        } else if (part.inlineData) {
          return { 
            inlineData: {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            }
          };
        } else {
          // Handle other content types as needed
          return { text: JSON.stringify(part) };
        }
      });
      
      return { role, parts };
    });
    
    // Build generation config from parameters
    const generationConfig = request.generationConfig ? {
      temperature: request.generationConfig.temperature,
      topP: request.generationConfig.topP,
      topK: request.generationConfig.topK,
      maxOutputTokens: request.generationConfig.maxOutputTokens,
      stopSequences: request.generationConfig.stopSequences || [],
    } : undefined;
    
    // Convert tool calls if present
    const tools = request.tools ? request.tools.map((tool) => {
      return {
        functionDeclarations: tool.functionDeclarations.map(decl => ({
          name: decl.name,
          description: decl.description,
          parameters: decl.parameters as Record<string, unknown>
        }))
      };
    }) : undefined;
    
    // Build the final request
    return {
      contents,
      generationConfig,
      tools,
    };
  }

  /**
   * Convert a Gemini response to an LLM response
   * 
   * @param response - The Gemini response to convert
   * @returns An LLMResponse object
   */
  private convertToLlmResponse(response: ModelResponse): LlmResponse {
    // Extract the main candidate content from the response
    const candidate = response.candidates?.[0];
    if (!candidate) {
      return new LlmResponse();
    }
    
    const content = candidate.content;
    if (!content) {
      return new LlmResponse();
    }
    
    // Extract parts from content
    const parts = content.parts || [];
    
    // Check for function calls in the response
    const functionCallPart = parts.find((part: ModelPart) => part.functionCall);
    const functionCall = functionCallPart?.functionCall;
    
    // Build the response object with the content
    const llmResponse = new LlmResponse({
      content: {
        role: content.role || 'model',
        parts: parts.map((part: ModelPart) => {
          if (part.text) {
            return { text: part.text };
          }
          // Handle other part types as needed
          return { text: JSON.stringify(part) };
        })
      },
      finishReason: candidate.finishReason,
      usageMetadata: response.usageMetadata
    });
    
    // Add function call if present
    if (functionCall) {
      llmResponse.functionCall = {
        name: functionCall.name,
        args: functionCall.args,
      };
    }
    
    return llmResponse;
  }

  /**
   * Generate content using the Gemini model
   * 
   * @param request - The LLM request
   * @param stream - Whether to stream the response (currently not supported)
   * @returns A promise resolving to an LLMResponse
   */
  async generateContent(
    request: LlmRequest,
    _stream: boolean = false
  ): Promise<LlmResponse> {
    // Ensure we have user content at the end if needed
    this.maybeAppendUserContent(request);
    
    // Convert to Gemini request format
    const generateRequest = this.convertToGenerateRequest(request);
    
    // Initialize the model
    const model = await this.initializeModel();
    
    try {
      // Generate content
      const response = await model.generateContent({
        contents: generateRequest.contents,
        generationConfig: generateRequest.generationConfig,
        tools: generateRequest.tools,
      });
      
      // Convert response to LlmResponse
      return this.convertToLlmResponse(response);
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      throw error;
    }
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
    // Ensure we have user content at the end if needed
    this.maybeAppendUserContent(request);
    
    // Convert to Gemini request format
    const generateRequest = this.convertToGenerateRequest(request);
    
    // Initialize the model
    const model = await this.initializeModel();
    
    try {
      if (stream) {
        // Use streaming API if available
        console.warn('Streaming not fully implemented for GeminiLlm');
        // Yield non-streaming response for now
        const response = await model.generateContent({
          contents: generateRequest.contents,
          generationConfig: generateRequest.generationConfig,
          tools: generateRequest.tools,
        });
        yield this.convertToLlmResponse(response);
      } else {
        // Non-streaming response
        const response = await model.generateContent({
          contents: generateRequest.contents,
          generationConfig: generateRequest.generationConfig,
          tools: generateRequest.tools,
        });
        yield this.convertToLlmResponse(response);
      }
    } catch (error) {
      console.error('Error in generateContentAsync:', error);
      throw error;
    }
  }

  /**
   * Connects to the model for live interaction.
   * 
   * @param request The request to the model
   * @returns A connection to the model
   */
  async connect(_request: LlmRequest): Promise<BaseLlmConnection> {
    // Create and return a connection
    if (!this.connection) {
      // Create a proper request object to initialize the connection
      const connectionRequest: LlmRequest = {
        contents: _request.contents || [],
        generationConfig: _request.generationConfig || {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          candidateCount: 1,
          maxOutputTokens: 2048
        }
      };
      this.connection = new GeminiLlmConnection(this.apiKey, connectionRequest);
    }
    return this.connection;
  }
}