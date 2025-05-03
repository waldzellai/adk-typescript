// OpenAI LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Implements OpenAI integration for the ADK

import { BaseLlm } from './base_llm';
import { BaseLlmConnection } from './base_llm_connection';
import { LlmRequest, Content, Part, Tool } from './llm_types';
import { LlmResponse } from './llm_response';
import { OpenAiLlmConnection } from './openai_llm_connection';
import OpenAI from 'openai';

/**
 * OpenAI LLM class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlm interface to provide a consistent API for OpenAI models
 */
export class OpenAiLlm extends BaseLlm {
  // The API key for authenticating with the OpenAI API
  private apiKey: string;
  
  // The OpenAI client
  private openaiClient: OpenAI | null = null;

  // Optional OpenAI LLM connection
  private connection: OpenAiLlmConnection | null = null;

  /**
   * Creates a new OpenAiLlm.
   * 
   * @param options Configuration options
   */
  constructor(options: {
    model: string;
    apiKey: string;
  }) {
    super(options.model);
    this.apiKey = options.apiKey;
  }

  /**
   * Generates content from the model.
   * 
   * @param request The request to the model
   * @param stream Whether to stream the response
   * @returns The response from the model
   */
  async generateContent(
    request: LlmRequest,
    stream: boolean = false
  ): Promise<LlmResponse> {
    // For non-streaming, we'll use the async generator and just return the first result
    const generator = this.generateContentAsync(request, stream);
    const { value } = await generator.next();
    return value;
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
    // Initialize the OpenAI client if needed
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey
      });
    }

    // Convert ADK request format to OpenAI format
    const messages = this.convertContentsToOpenAIMessages(request.contents || []);
    
    // Add system instruction if provided
    if (request.systemInstruction) {
      messages.unshift({
        role: 'system',
        content: request.systemInstruction
      });
    }

    // Convert tools if provided
    const tools = this.convertToolsToOpenAITools(request.tools || []);

    // Set up generation parameters
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: request.model || this.model,
      messages,
      temperature: request.generationConfig?.temperature ?? 0.7,
      max_tokens: request.generationConfig?.maxOutputTokens,
      top_p: request.generationConfig?.topP,
      stream: stream,
    };

    // Add tools if available
    if (tools.length > 0) {
      params.tools = tools;
    }

    try {
      if (stream) {
        // Handle streaming response
        const streamResponse = await this.openaiClient.chat.completions.create(params);
        
        for await (const chunk of streamResponse) {
          if (chunk.choices[0]?.delta?.content) {
            // Create a response with the partial content
            const response = new LlmResponse({
              content: {
                role: 'model',
                parts: [{ text: chunk.choices[0].delta.content }]
              },
              partial: true
            });
            yield response;
          } else if (chunk.choices[0]?.delta?.tool_calls) {
            // Handle tool calls in streaming mode
            const toolCall = chunk.choices[0].delta.tool_calls[0];
            if (toolCall && toolCall.function) {
              const response = new LlmResponse({
                content: {
                  role: 'model',
                  parts: [{
                    functionCall: {
                      name: toolCall.function.name || '',
                      args: toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
                    }
                  }]
                },
                partial: true
              });
              yield response;
            }
          }
          
          // If this is the last chunk, mark it as complete
          if (chunk.choices[0]?.finish_reason) {
            const response = new LlmResponse({
              finishReason: chunk.choices[0].finish_reason.toUpperCase(),
              turnComplete: true,
              usageMetadata: {
                promptTokenCount: chunk.usage?.prompt_tokens,
                candidatesTokenCount: chunk.usage?.completion_tokens,
                totalTokenCount: chunk.usage?.total_tokens
              }
            });
            yield response;
          }
        }
      } else {
        // Handle non-streaming response
        const completion = await this.openaiClient.chat.completions.create(params);
        const choice = completion.choices[0];
        
        if (choice.message.content) {
          // Handle text response
          const response = new LlmResponse({
            content: {
              role: 'model',
              parts: [{ text: choice.message.content }]
            },
            finishReason: choice.finish_reason?.toUpperCase(),
            turnComplete: true,
            usageMetadata: {
              promptTokenCount: completion.usage?.prompt_tokens,
              candidatesTokenCount: completion.usage?.completion_tokens,
              totalTokenCount: completion.usage?.total_tokens
            }
          });
          yield response;
        } else if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          // Handle tool calls
          const toolCall = choice.message.tool_calls[0];
          const response = new LlmResponse({
            content: {
              role: 'model',
              parts: [{
                functionCall: {
                  name: toolCall.function.name,
                  args: JSON.parse(toolCall.function.arguments)
                }
              }]
            },
            finishReason: choice.finish_reason?.toUpperCase(),
            turnComplete: true,
            usageMetadata: {
              promptTokenCount: completion.usage?.prompt_tokens,
              candidatesTokenCount: completion.usage?.completion_tokens,
              totalTokenCount: completion.usage?.total_tokens
            }
          });
          yield response;
        }
      }
    } catch (error) {
      console.error('Error generating content from OpenAI:', error);
      yield new LlmResponse({
        errorCode: 'OPENAI_ERROR',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Connects to the model for live interaction.
   * 
   * @param request The request to the model
   * @returns A connection to the model
   */
  async connect(request: LlmRequest): Promise<BaseLlmConnection> {
    // Create and return a connection
    if (!this.connection) {
      this.connection = new OpenAiLlmConnection(this.apiKey, request);
    }
    return this.connection;
  }

  /**
   * Gets or creates the client connection
   * 
   * @returns A connection to the LLM
   */
  getConnection(): BaseLlmConnection {
    if (!this.connection) {
      // Create a minimal LlmRequest
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
      this.connection = new OpenAiLlmConnection(this.apiKey, request);
    }
    return this.connection;
  }

  /**
   * Converts ADK content format to OpenAI message format
   * 
   * @param contents The contents to convert
   * @returns The OpenAI messages
   */
  private convertContentsToOpenAIMessages(contents: Content[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return contents.map(content => {
      // Map ADK roles to OpenAI roles
      let role: 'system' | 'user' | 'assistant' | 'tool' = 'user';
      switch (content.role) {
        case 'user':
          role = 'user';
          break;
        case 'model':
          role = 'assistant';
          break;
        case 'system':
          role = 'system';
          break;
        case 'tool':
          role = 'tool';
          break;
      }

      // Handle different part types
      if (content.parts.length === 1 && content.parts[0].text) {
        // Simple text message
        return {
          role,
          content: content.parts[0].text
        };
      } else if (content.parts.some(part => part.functionCall)) {
        // Function call
        const functionCallPart = content.parts.find(part => part.functionCall);
        if (functionCallPart?.functionCall) {
          return {
            role,
            content: '',
            tool_calls: [{
              type: 'function',
              function: {
                name: functionCallPart.functionCall.name,
                arguments: JSON.stringify(functionCallPart.functionCall.args)
              }
            }]
          };
        }
      } else if (content.parts.some(part => part.functionResponse)) {
        // Function response
        const functionResponsePart = content.parts.find(part => part.functionResponse);
        if (functionResponsePart?.functionResponse) {
          return {
            role: 'tool',
            content: JSON.stringify(functionResponsePart.functionResponse.response),
            tool_call_id: 'call_' + functionResponsePart.functionResponse.name // This is a simplification
          };
        }
      }

      // Default case: combine all text parts
      const textContent = content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n');

      return {
        role,
        content: textContent || ''
      };
    });
  }

  /**
   * Converts ADK tools to OpenAI tools format
   * 
   * @param tools The tools to convert
   * @returns The OpenAI tools
   */
  private convertToolsToOpenAITools(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
    const openAITools: OpenAI.Chat.ChatCompletionTool[] = [];
    
    for (const tool of tools) {
      for (const functionDeclaration of tool.functionDeclarations) {
        openAITools.push({
          type: 'function',
          function: {
            name: functionDeclaration.name,
            description: functionDeclaration.description,
            parameters: this.convertSchemaToOpenAISchema(functionDeclaration.parameters)
          }
        });
      }
    }
    
    return openAITools;
  }

  /**
   * Converts ADK schema to OpenAI schema format
   * 
   * @param schema The schema to convert
   * @returns The OpenAI schema
   */
  private convertSchemaToOpenAISchema(schema: any): any {
    if (!schema) return { type: 'object', properties: {} };
    
    // Direct conversion for simple cases
    return schema;
  }

  /**
   * Returns a list of supported models in regex format
   * 
   * @returns Array of regex patterns for supported models
   */
  static supportedModels(): string[] {
    return [
      'gpt-4.*',
      'gpt-3.5.*',
      'o4-.*'
    ];
  }
}

// Export as both OpenAiLlm and OpenAI for consistency with other implementations
export const OpenAI = OpenAiLlm;
