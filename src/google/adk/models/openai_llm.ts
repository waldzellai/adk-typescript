// OpenAI LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Implements OpenAI integration for the ADK

import { BaseLlm } from './base_llm';
import { BaseLlmConnection } from './base_llm_connection';
import { LlmRequest, Content, Tool, Schema } from './llm_types';
import { LlmResponse } from './llm_response';
import { OpenAiLlmConnection } from './openai_llm_connection';
import OpenAIClient from 'openai';

/**
 * Configuration for the OpenAiLlm.
 */
export interface OpenAiLlmConfig {
  // Currently no specific OpenAI config options are directly used by the constructor
  // beyond apiKey and modelName, which are passed as direct parameters.
  // This interface can be expanded in the future.
  [key: string]: unknown; // Allow arbitrary other options for future flexibility
}

/**
 * OpenAI LLM class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlm interface to provide a consistent API for OpenAI models
 */
export class OpenAiLlm extends BaseLlm {
  // The API key for authenticating with the OpenAI API
  private apiKey: string;
  
  // The OpenAI client
  private openaiClient: OpenAIClient | null = null;

  // Optional OpenAI LLM connection
  private connection: OpenAiLlmConnection | null = null;

  /**
   * Creates a new OpenAiLlm.
   * 
   * @param apiKey The API key for OpenAI.
   * @param modelName The model name to use.
   * @param _config Optional configuration for OpenAI LLM (currently unused beyond apiKey and modelName).
   */
  constructor(apiKey: string, modelName: string, _config?: OpenAiLlmConfig) {
    super(modelName);
    this.apiKey = apiKey;
    // _config can be used here if specific OpenAI settings need to be initialized.
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
    const result = await generator.next();
    if (result.done) {
      // Generator finished. If result.value is undefined (void), it means no LlmResponse was yielded before completion.
      // This could indicate an error or an empty stream where a response was still expected.
      return new LlmResponse({
        errorCode: 'GENERATOR_DONE_UNEXPECTEDLY',
        errorMessage: 'Content generation finished without a final response.',
        turnComplete: true,
      });
    }
    // If not done, result.value is LlmResponse
    return result.value;
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
      this.openaiClient = new OpenAIClient({
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
    const params: OpenAIClient.Chat.ChatCompletionCreateParams = {
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
        const streamResponse = await this.openaiClient.chat.completions.create(params as OpenAIClient.Chat.ChatCompletionCreateParamsStreaming);
        
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
        const completion = await this.openaiClient.chat.completions.create(params as OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming);
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
  private convertContentsToOpenAIMessages(contents: Content[]): OpenAIClient.Chat.ChatCompletionMessageParam[] {
    return contents.map((content): OpenAIClient.Chat.ChatCompletionMessageParam => {
      const adkRole = content.role;
      const adkParts = content.parts;

      if (adkRole === 'system') {
        const textContent = adkParts.filter(p => p.text).map(p => p.text).join('\n');
        return { role: 'system', content: textContent } as OpenAIClient.Chat.ChatCompletionSystemMessageParam;
      }

      if (adkRole === 'user') {
        const textContent = adkParts.filter(p => p.text).map(p => p.text).join('\n');
        // TODO: Handle multi-modal user content (e.g., images) if OpenAI SDK supports it in this structure
        return { role: 'user', content: textContent } as OpenAIClient.Chat.ChatCompletionUserMessageParam;
      }

      if (adkRole === 'model') { // maps to 'assistant'
        const functionCallPartData = adkParts.find(p => p.functionCall)?.functionCall;
        if (functionCallPartData) {
          // Ensure unique ID for each tool call if multiple are possible in one message.
          // For simplicity, using name and timestamp. Robust solution might need ADK type changes.
          return {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: `toolcall_${functionCallPartData.name}_${Date.now()}`,
              type: 'function',
              function: { name: functionCallPartData.name, arguments: JSON.stringify(functionCallPartData.args) }
            }]
          } as OpenAIClient.Chat.ChatCompletionAssistantMessageParam;
        }
        const textContent = adkParts.filter(p => p.text).map(p => p.text).join('\n');
        return { role: 'assistant', content: textContent || null } as OpenAIClient.Chat.ChatCompletionAssistantMessageParam;
      }

      if (adkRole === 'tool') {
        const functionResponsePartData = adkParts.find(p => p.functionResponse)?.functionResponse;
        if (functionResponsePartData) {
          // Forcing a value here for type compliance, but this ID needs to be the actual one.
          // A better temporary strategy might be to have the ADK tool execution framework pass back the ID it's responding to.
          return {
            role: 'tool',
            content: JSON.stringify(functionResponsePartData.response),
            tool_call_id: functionResponsePartData.name // Assuming name is the ID. Needs proper ID propagation.
          } as OpenAIClient.Chat.ChatCompletionToolMessageParam;
        }
        // This case should ideally not be reached if ADK 'tool' roles always have functionResponse.
        console.warn('Invalid ADK Content: role "tool" without functionResponse part.');
        // Fallback to satisfy TypeScript, but this indicates a problem upstream or in ADK logic.
        return {
          role: 'tool',
          content: 'Error: Malformed ADK tool message - missing functionResponse.',
          tool_call_id: 'error_missing_function_response'
        } as OpenAIClient.Chat.ChatCompletionToolMessageParam;
      }

      // Fallback for unknown ADK roles - should ideally not be reached if ADK types are exhaustive.
      console.warn(`Unknown ADK content role: ${adkRole} converted to 'user' role with error content.`);
      const textContent = adkParts.filter(p => p.text).map(p => p.text).join('\n');
      return {
        role: 'user', // Defaulting to 'user' to avoid further type errors, but this is an error state.
        content: `Error: Unknown ADK role '${adkRole}'. Original content: ${textContent || 'N/A'}`
      } as OpenAIClient.Chat.ChatCompletionUserMessageParam;
    });
  }

  /**
   * Converts ADK tools to OpenAI tools format
   * 
   * @param tools The tools to convert
   * @returns The OpenAI tools
   */
  private convertToolsToOpenAITools(tools: Tool[]): OpenAIClient.Chat.ChatCompletionTool[] {
    const openAITools: OpenAIClient.Chat.ChatCompletionTool[] = [];
    if (!tools) return openAITools;

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
   * Converts an ADK schema to an OpenAI schema.
   * @param schema The schema to convert
   * @returns The OpenAI schema
   */
  private convertSchemaToOpenAISchema(schema: Schema | undefined): OpenAIClient.FunctionParameters {
    if (!schema) {
      // Default for OpenAI if no parameters are provided by ADK
      return { type: 'object', properties: {} };
    }

    // Check if the provided ADK schema is an object schema, as required by OpenAI FunctionParameters
    // We assume ADK's Schema type is structurally compatible if its 'type' property is 'object'.
    if (typeof schema === 'object' && schema !== null && (schema as { type?: string }).type === 'object') {
      return schema as OpenAIClient.FunctionParameters;
    }
    
    // If the ADK schema is not an object schema, it's a mismatch for OpenAI's function parameter requirements.
    // Log a warning and return the default empty object schema to ensure type compatibility with OpenAI.
    console.warn(
      `ADK tool's function parameter schema was not of type 'object' or 'type' property was missing. ` +
      `Received schema: ${JSON.stringify(schema)}. Using default empty object schema for OpenAI.`
    );
    return { type: 'object', properties: {} };
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
