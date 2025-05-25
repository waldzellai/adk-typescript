// Gemini LLM connection module for the Google Agent Development Kit (ADK) in TypeScript
// Provides a simplified implementation of the Gemini connection functionality

import { BaseLlmConnection } from './base_llm_connection';
import { Content, LlmRequest, HarmCategory, HarmProbability, AdkPart } from './llm_types';
import { LlmResponse } from './llm_response';
import { GoogleGenAI } from '@google/genai';
import type { Chat as GenAIChat } from '@google/genai';

// Define interfaces to match the @google/genai types
interface ModelPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
  fileData?: {
    fileUri: string;
    mimeType: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface SafetyRating {
  category: string;
  probability: string | number;
}

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
  promptFeedback?: {
    safetyRatings?: Array<SafetyRating>;
  };
}

interface GenerativeModel {
  startChat(params: {
    history?: { role: string, parts: ModelPart[] }[];
    generationConfig?: Record<string, unknown>;
    safetySettings?: Record<string, unknown>[];
  }): GenAIChat;
}

/**
 * Connection to a Gemini model.
 */
export class GeminiLlmConnection extends BaseLlmConnection {
  /**
   * The chat session with the model.
   */
  private chatSession: GenAIChat;
  
  /**
   * The conversation history.
   */
  private history: Content[] = [];
  
  /**
   * Events that have been received but not yet yielded.
   */
  private pendingEvents: LlmResponse[] = [];
  
  /**
   * Indicates whether the connection is closed.
   */
  private isClosed: boolean = false;

  /**
   * Creates a new GeminiLlmConnection.
   * 
   * @param apiKey The API key for Gemini
   * @param initialRequest The initial request to set up the connection
   */
  constructor(
    private apiKey: string,
    private initialRequest: LlmRequest
  ) {
    super();
    
    // Create the genAI client and model
    const genAI = new GoogleGenAI({ apiKey });
    const model = genAI.models.get({ model: 'gemini-pro' }) as unknown as GenerativeModel;
    
    // Initialize the chat session
    this.chatSession = model.startChat({
      history: this.convertContents(initialRequest.contents || []),
      generationConfig: initialRequest.generationConfig as unknown as Record<string, unknown>,
      safetySettings: initialRequest.safetySettings as unknown as Record<string, unknown>[]
    });
    
    // Store the initial history
    this.history = initialRequest.contents || [];
  }

  /**
   * Sends history to the model.
   * 
   * @param contents The content history to send
   */
  async sendHistory(contents: Content[]): Promise<void> {
    this.history = contents;
    
    // Create the genAI client and model again to reset the chat
    const genAI = new GoogleGenAI({ apiKey: this.apiKey });
    const model = genAI.models.get({ model: 'gemini-pro' }) as unknown as GenerativeModel;
    
    // Update the chat session history
    this.chatSession = model.startChat({
      history: this.convertContents(contents),
      generationConfig: this.initialRequest.generationConfig as unknown as Record<string, unknown>,
      safetySettings: this.initialRequest.safetySettings as unknown as Record<string, unknown>[]
    });
  }

  /**
   * Sends content to the model.
   * 
   * @param content The content to send
   */
  async sendContent(content: Content): Promise<void> {
    try {
      // Add content to history
      this.history.push(content);
      
      // Convert content to Google Generative AI format
      const convertedContent = this.convertContent(content);
      
      // Send to the model
      const response = await this.chatSession.sendMessage({
        message: convertedContent.parts
      });
      
      // Store the response
      this.pendingEvents.push(this.convertToLlmResponse(response as unknown as ModelResponse));
    } catch (error) {
      console.error('Error sending content to Gemini:', error);
      this.pendingEvents.push(new LlmResponse({
        content: {
          role: 'model',
          parts: [{ text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        }
      }));
    }
  }

  /**
   * Sends realtime data to the model.
   * 
   * @param _data The data to send
   */
  async sendRealtime(_data: unknown): Promise<void> {
    // This is a simplified implementation as the TypeScript SDK doesn't
    // currently support the same realtime functionality as the Python SDK
    console.warn('Realtime data functionality is not fully implemented for Gemini in TypeScript');
  }

  /**
   * Receives responses from the model.
   * 
   * @returns An async generator yielding responses from the model
   */
  async *receive(): AsyncGenerator<LlmResponse, void, unknown> {
    while (!this.isClosed) {
      // Yield any pending events
      while (this.pendingEvents.length > 0) {
        yield this.pendingEvents.shift()!;
      }
      
      // Wait briefly before checking again
      if (!this.isClosed) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Closes the connection.
   */
  async close(): Promise<void> {
    this.isClosed = true;
    // Any other cleanup would go here
  }
  
  /**
   * Converts ADK content format to Google Generative AI SDK format.
   * 
   * @param content The ADK content
   * @returns Content in Google Generative AI format
   */
  private convertContent(content: Content): { role: string, parts: ModelPart[] } {
    const role = content.role || 'user';
    const parts = content.parts || [];
    return {
      role,
      parts: (parts as AdkPart[]).map(part => {
        if (part.text) {
          return { text: part.text };
        } else if (part.inlineData) {
          return {
            inlineData: {
              mimeType: part.inlineData?.mimeType || '',
              data: part.inlineData?.data || ''
            }
          };
        } else if (part.fileData) {
          return {
            fileData: {
              mimeType: part.fileData?.mimeType || '',
              fileUri: part.fileData?.fileUri || ''
            }
          };
        } else if (part.functionCall) {
          return {
            functionCall: {
              name: part.functionCall.name || '',
              args: part.functionCall.args || {}
            }
          };
        } else if (part.functionResponse) {
          return {
            functionResponse: {
              name: part.functionResponse.name || '',
              response: part.functionResponse.response || {}
            }
          };
        }
        return { text: '' };
      })
    };
  }
  
  /**
   * Converts ADK content array format to Google Generative AI SDK format.
   * 
   * @param contents The ADK content array
   * @returns Contents in Google Generative AI format
   */
  private convertContents(contents: Content[]): { role: string, parts: ModelPart[] }[] {
    return contents.map(content => this.convertContent(content));
  }
  
  /**
   * Converts a Google Generative AI response to an LlmResponse.
   * 
   * @param response The Google Generative AI response
   * @returns An LlmResponse
   */
  private convertToLlmResponse(response: ModelResponse): LlmResponse {
    // Extract the candidate
    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    
    // Build the LlmResponse
    const llmResponse = new LlmResponse({
      content: content ? {
        role: content.role || 'model',
        parts: content.parts?.map((part: ModelPart) => {
          if (part.text) {
            return { text: part.text };
          } else if (part.inlineData) {
            return {
              inlineData: {
                mimeType: part.inlineData.mimeType,
                data: part.inlineData.data
              }
            };
          } else if (part.functionCall) {
            return {
              functionCall: {
                name: part.functionCall.name,
                args: part.functionCall.args
              }
            };
          }
          return { text: '' };
        }) || []
      } : undefined,
      finishReason: candidate?.finishReason || undefined,
      safetyRatings: response.promptFeedback?.safetyRatings?.map(rating => ({
        category: rating.category as HarmCategory,
        probability: typeof rating.probability === 'string' ? rating.probability as HarmProbability : HarmProbability.HARM_PROBABILITY_UNSPECIFIED
      })) || [],
      usageMetadata: {
        promptTokenCount: response.usageMetadata?.promptTokenCount,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount,
        totalTokenCount: response.usageMetadata?.totalTokenCount
      }
    });
    
    // Extract function call
    if (content?.parts?.some((part: ModelPart) => part.functionCall)) {
      const functionCallPart = content.parts.find((part: ModelPart) => part.functionCall);
      if (functionCallPart && functionCallPart.functionCall) {
        llmResponse.functionCall = {
          name: functionCallPart.functionCall.name,
          args: functionCallPart.functionCall.args
        };
      }
    }
    
    return llmResponse;
  }
}