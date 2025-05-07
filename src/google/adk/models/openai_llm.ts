// OpenAI LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Implements OpenAI integration for the ADK

import { BaseLlm, LlmRequest, LlmResponse, Content, AdkTool, AdkPart } from './base_llm';
import { BaseLlmConnection } from './base_llm_connection';
import { OpenAiLlmConnection } from './openai_llm_connection';
import OpenAIApi from 'openai';
import {
  ChatCompletion,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';

/**
 * OpenAI LLM class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlm interface to provide a consistent API for OpenAI models
 */
export class OpenAiLlm extends BaseLlm {
  // The API key for authenticating with the OpenAI API
  private apiKey: string;
  
  // The OpenAI client
  private openaiClient: OpenAIApi;
  
  // Optional OpenAI LLM connection
  private connection: OpenAiLlmConnection | null = null;

  /**
   * Creates a new OpenAiLlm.
   * 
   * @param options Configuration options
   */
  constructor(options: { model: string } & LlmRequest) {
    super(options.model);
    // Retrieve API key from environment variables
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found in environment variables (OPENAI_API_KEY)');
    }
    // Initialize the SDK client
    this.openaiClient = new OpenAIApi({ apiKey: this.apiKey });
  }

  async initializeModel() {
    // No need to initialize model here as it's already done in the constructor
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
    const { value, done } = await generator.next();
    if (done || !value) {
      // Handle the case where the generator finishes without yielding a value
      // or yields undefined. This might mean an error occurred upstream
      // or the model had nothing to say. Returning a default/empty response.
      // TODO: Consider more robust error handling or specific return types for these cases.
      return { /* text: '', functionCalls: [], rawResponse: undefined, usageMetadata: undefined */ }; // Return an empty LlmResponse object
    }
    return value; // Return the yielded LlmResponse
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
    // Convert ADK request format to OpenAI format
    const messages = this.convertContentsToOpenAIMessages(request.contents || []);
    
    // Add system instruction if provided
    if (request.systemInstruction) {
      messages.unshift({
        role: 'system',
        content: request.systemInstruction // This is now string | undefined, OpenAI expects string
      });
    }

    // Convert tools if provided
    const tools = this.convertToolsToOpenAITools(request.tools || []);

    // Set up generation parameters
    const params: OpenAIApi.Chat.ChatCompletionCreateParams = {
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
        const streamResponse = await this.openaiClient.chat.completions.create({
          ...params,
          stream: true,
        });
        
        for await (const chunk of streamResponse) {
          if (chunk.choices[0]?.delta?.content) {
            // Create a response object with the partial content
            const response: LlmResponse = {
              text: chunk.choices[0].delta.content,
              // TODO: Map other relevant fields if available in partial chunks
              rawResponse: chunk // Store the chunk as raw response for potential inspection
            };
            yield response;
          } else if (chunk.choices[0]?.delta?.tool_calls) {
            // Handle partial tool calls if necessary (e.g., accumulating args)
            // For now, yield a response indicating a tool call is starting/in progress
            const toolCall = chunk.choices[0].delta.tool_calls[0];
            if (toolCall && toolCall.function) {
              const response: LlmResponse = {
                functionCalls: [{ 
                  name: toolCall.function.name || '', 
                  args: {} // Args likely incomplete here, handle accumulation if needed
                }],
                rawResponse: chunk
              };
              yield response;
            }
          }
          
          // If this is the last chunk, mark it as complete
          if (chunk.choices[0]?.finish_reason) {
            const response: LlmResponse = {
              finishReason: chunk.choices[0].finish_reason.toUpperCase(),
              turnComplete: true,
              usageMetadata: {
                promptTokenCount: chunk.usage?.prompt_tokens,
                candidatesTokenCount: chunk.usage?.completion_tokens,
                totalTokenCount: chunk.usage?.total_tokens
              }
            };
            yield response;
          }
        }
      } else {
        // Handle non-streaming response
        const completion = await this.openaiClient.chat.completions.create(params) as ChatCompletion;
        
        // Use optional chaining and nullish coalescing for safe access
        const choice = completion.choices?.[0]; 
        let textContent: string | undefined = undefined;
        let functionCalls: { name: string; args: Record<string, unknown> }[] | undefined = undefined;

        if (choice?.message?.content) { // Safe access
          textContent = choice.message.content;
        }
        
        if (choice?.message?.tool_calls) { // Safe access
          // Add explicit type for tc
          functionCalls = choice.message.tool_calls.map((tc: ChatCompletionMessageToolCall) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
          }));
        }

        const response: LlmResponse = {
          text: textContent,
          functionCalls: functionCalls,
          rawResponse: completion,
          usageMetadata: {
            // Use optional chaining and nullish coalescing for safe access
            promptTokenCount: completion.usage?.prompt_tokens ?? 0,
            candidatesTokenCount: completion.usage?.completion_tokens ?? 0,
            totalTokenCount: completion.usage?.total_tokens ?? 0
          }
        };
        yield response;
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // Yield an error response object or throw?
      const errorResponse: LlmResponse = {
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, // Provide error message
        rawResponse: error // Include error object
      };
      yield errorResponse; // Ensure semicolon exists
      // Or rethrow: throw error;
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
  private convertContentsToOpenAIMessages(contents: Content[]): OpenAIApi.Chat.ChatCompletionMessageParam[] {
    return contents.map((content) => {
      // TODO: Confirm the correct handling for undefined role. Defaulting to 'user'.
      const role = (content.role || 'user') as OpenAIApi.Chat.ChatCompletionRole;
      
      // Concatenate text from all text parts
      const messageContent = content.parts // Add null check for content.parts
        ? content.parts
          .filter((part: AdkPart) => 'text' in part && !!part.text) // Use AdkPart type
          .map((part: AdkPart) => (part as {text: string}).text) // Use AdkPart type and cast
          .join('\n')
        : ''; // Default to empty string if parts is undefined

      if (role === 'assistant') {
        const functionCallParts = content.parts // Add null check
          ? content.parts
            // Use type guard for functionCall
            // Use AdkPart type for part parameter
            .filter((part: AdkPart): part is { functionCall: { name: string; args: Record<string, unknown> } } =>
              'functionCall' in part && !!part.functionCall
            )
          : [];

        if (functionCallParts.length > 0) {
          const toolCalls: OpenAIApi.Chat.ChatCompletionMessageToolCall[] = functionCallParts.map((part, index) => {
            return {
              id: `call_${index}`, // OpenAI needs an ID for tool_calls in assistant message
              type: 'function' as const,
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args) // Only name and arguments here
              }
            };
          });

          // If there are tool calls, content should be null according to OpenAI spec
          return { role, tool_calls: toolCalls, content: null } as OpenAIApi.Chat.ChatCompletionAssistantMessageParam;
        } else {
          // Regular assistant message with content
          return { role, content: messageContent } as OpenAIApi.Chat.ChatCompletionAssistantMessageParam;
        }
      } else if (role === 'tool') {
        // Handle tool response parts
        const functionResponsePart = content.parts // Add null check
          ? content.parts
            // Use type guard for functionResponse
            // Use AdkPart type for part parameter
            .find((part: AdkPart): part is { functionResponse: { name: string; response: Record<string, unknown> } } =>
              'functionResponse' in part && !!part.functionResponse
            )
          : undefined;
        // Explicit check after find
        if (functionResponsePart && 'functionResponse' in functionResponsePart && functionResponsePart.functionResponse) {
          // Ensure default value for toolCallId if name is undefined
          const toolCallId = functionResponsePart.functionResponse.name || 'unknown_tool_id'; 
          const responseContent = typeof functionResponsePart.functionResponse.response === 'string' 
            ? functionResponsePart.functionResponse.response 
            : JSON.stringify(functionResponsePart.functionResponse.response) || '';

          return {
            role: 'tool' as const,
            tool_call_id: toolCallId,
            content: responseContent,
          } as OpenAIApi.Chat.ChatCompletionToolMessageParam;
        } else {
          // Handle cases where a tool role message doesn't have the expected functionResponse part
          console.warn('Tool role message found without valid functionResponse part:', content);
          // Return a generic tool message or skip? Returning null/undefined might be better if skipping.
          // For now, returning a message with empty content to avoid breaking the map structure.
          return { role: 'tool' as const, tool_call_id: 'unknown_tool_id', content: '' } as OpenAIApi.Chat.ChatCompletionToolMessageParam;
        }
      } else {
        // Handle 'user' role (or default)
        return { role, content: messageContent } as OpenAIApi.Chat.ChatCompletionUserMessageParam;
      }
    });
  }

  /**
   * Converts ADK tools to OpenAI tools format
   * 
   * @param tools The tools to convert
   * @returns The OpenAI tools
   */
  private convertToolsToOpenAITools(tools: AdkTool[]): OpenAIApi.Chat.ChatCompletionTool[] {
    return tools.flatMap((tool) => { // Changed map to flatMap in case a tool has no functionDeclarations
      return tool.functionDeclarations?.map((func) => ({
        type: 'function' as const,
        function: {
          name: func.name || 'unnamed_function', // Provide default for name if undefined
          // Provide default empty string if description is undefined
          description: func.description || '', 
          // Handle potentially undefined parameters and cast to expected type
          parameters: this.convertSchemaToOpenAIParams((func.parameters || {}) as Record<string, unknown>)
        }
      })) || []; // Return empty array if functionDeclarations is undefined
    });
  }

  /**
   * Converts ADK schema to OpenAI parameters format
   * 
   * @param schema The JSON schema for parameters
   * @returns OpenAI compatible parameters object
   */
  private convertSchemaToOpenAIParams(schema: Record<string, unknown>): Record<string, unknown> {
    // Basic validation or transformation can be added here if needed
    // For now, assume the schema is directly compatible or requires minimal changes
    // OpenAI expects a JSON schema object for the 'parameters' field.
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
