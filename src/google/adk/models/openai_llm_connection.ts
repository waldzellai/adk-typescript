// OpenAI LLM connection module for the Google Agent Development Kit (ADK) in TypeScript
// Provides a simplified implementation of the OpenAI connection functionality

import { BaseLlmConnection } from './base_llm_connection';
import { Content, LlmRequest, AdkGenerationConfig } from './base_llm';
import { LlmResponse } from './llm_response';
import OpenAI from 'openai';
import { AdkTool, AdkSchema } from './base_llm';

/**
 * OpenAI LLM connection class for the Google Agent Development Kit (ADK)
 * Implements the BaseLlmConnection interface to provide a consistent API for OpenAI models
 */
export class OpenAiLlmConnection extends BaseLlmConnection {
  // The OpenAI client
  private openaiClient: OpenAI;
  
  // The model name to use
  private modelName: string;
  
  // The history of messages
  private history: Content[] = [];
  
  // Pending events to be yielded
  private pendingEvents: LlmResponse[] = [];
  
  // Generation config
  private generationConfig: AdkGenerationConfig;

  /**
   * Creates a new OpenAiLlmConnection.
   * 
   * @param apiKey The API key for OpenAI
   * @param initialRequest The initial request to set up the connection
   */
  constructor(
    private apiKey: string,
    private initialRequest: LlmRequest
  ) {
    super();
    
    // Create the OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: this.apiKey
    });
    
    // Store the model name
    this.modelName = initialRequest.model || 'o4-mini-high';
    
    // Store the generation config
    this.generationConfig = initialRequest.generationConfig || {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      candidateCount: 1,
      maxOutputTokens: 2048
    };
    
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
      
      // Convert history to OpenAI format
      const messages = this.convertContentsToOpenAIMessages(this.history);
      
      // Add system instruction if provided
      if (this.initialRequest.systemInstruction) {
        messages.unshift({
          role: 'system',
          content: this.initialRequest.systemInstruction // This is now string | undefined
        });
      }
      
      // Convert tools if provided
      const tools = this.convertToolsToOpenAITools(this.initialRequest.tools || []);
      
      // Set up generation parameters
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.modelName,
        messages,
        temperature: this.generationConfig.temperature,
        max_tokens: this.generationConfig.maxOutputTokens,
        top_p: this.generationConfig.topP,
        stream: false
      };
      
      // Add tools if available
      if (tools.length > 0) {
        params.tools = tools;
      }
      
      // Send to the model
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
        this.pendingEvents.push(response);
        
        // Add model response to history
        this.history.push({
          role: 'model',
          parts: [{ text: choice.message.content }]
        });
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
        this.pendingEvents.push(response);
        
        // Add model response to history
        this.history.push({
          role: 'model',
          parts: [{
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments)
            }
          }]
        });
      }
    } catch (error) {
      console.error('Error sending content to OpenAI:', error);
      this.pendingEvents.push(new LlmResponse({
        errorCode: 'OPENAI_ERROR',
        errorMessage: error instanceof Error ? error.message : String(error),
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
    // OpenAI doesn't support realtime data in the same way as Gemini
    console.warn('sendRealtime is not fully implemented for OpenAI');
  }

  /**
   * Receives responses from the model.
   * 
   * @returns An async generator yielding responses from the model
   */
  async *receive(): AsyncGenerator<LlmResponse, void, unknown> {
    // Yield any pending events
    while (this.pendingEvents.length > 0) {
      yield this.pendingEvents.shift()!;
    }
  }

  /**
   * Closes the connection.
   */
  async close(): Promise<void> {
    // Nothing specific to close for OpenAI
  }

  /**
   * Converts ADK content format to OpenAI message format
   * 
   * @param contents The contents to convert
   * @returns The OpenAI messages
   */
  private convertContentsToOpenAIMessages(contents: Content[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return contents.map(content => {
      // Handle different part types and assign roles specifically

      // Case 1: Message with functionCall (must be role: 'assistant')
      if (content.parts?.some(part => part.functionCall)) {
        const functionCallPart = content.parts.find(part => part.functionCall);
        if (functionCallPart?.functionCall) {
          return {
            role: 'assistant',
            content: null, // Assistant message with tool_calls should have null content
            tool_calls: [{
              id: 'call_' + functionCallPart.functionCall.name, // Simplistic ID generation
              type: 'function',
              function: {
                name: functionCallPart.functionCall.name,
                arguments: JSON.stringify(functionCallPart.functionCall.args)
              }
            }]
          } as OpenAI.Chat.ChatCompletionAssistantMessageParam; // Explicit cast
        }
      }

      // Case 2: Message with functionResponse (must be role: 'tool')
      if (content.parts?.some(part => part.functionResponse)) {
        const functionResponsePart = content.parts.find(part => part.functionResponse);
        if (functionResponsePart?.functionResponse) {
          return {
            role: 'tool',
            content: JSON.stringify(functionResponsePart.functionResponse.response),
            tool_call_id: 'call_' + functionResponsePart.functionResponse.name // This is a simplification
          } as OpenAI.Chat.ChatCompletionToolMessageParam; // Explicit cast
        }
      }

      // Case 3: Simple text messages or combined text parts (user, assistant, system)
      const textContent = content.parts
        ?.filter(part => part.text)
        .map(part => part.text)
        .join('\n') || '';

      switch (content.role) {
      case 'user':
        return {
          role: 'user',
          content: textContent
        } as OpenAI.Chat.ChatCompletionUserMessageParam;
      case 'model': // ADK 'model' maps to OpenAI 'assistant'
        return {
          role: 'assistant',
          content: textContent
        } as OpenAI.Chat.ChatCompletionAssistantMessageParam;
      case 'system':
        return {
          role: 'system',
          content: textContent
        } as OpenAI.Chat.ChatCompletionSystemMessageParam;
        // 'tool' role is handled by functionResponse case above, but if it somehow reaches here with text:
      case 'tool':
        return {
          role: 'tool',
          content: textContent,
          tool_call_id: 'unknown_tool_call_id' // Fallback, needs proper ID if this case is possible
        } as OpenAI.Chat.ChatCompletionToolMessageParam;
      default:
        // Fallback for any unexpected role, though TypeScript should prevent this.
        // Consider throwing an error or handling as a default user message.
        return {
          role: 'user', // Defaulting to 'user' as a safeguard
          content: textContent
        } as OpenAI.Chat.ChatCompletionUserMessageParam;
      }
    });
  }

  /**
   * Converts ADK tools to OpenAI tools format
   * 
   * @param tools The tools to convert
   * @returns The OpenAI tools
   */
  private convertToolsToOpenAITools(tools: AdkTool[]): OpenAI.Chat.ChatCompletionTool[] {
    const openAITools: OpenAI.Chat.ChatCompletionTool[] = [];
    
    for (const tool of tools) {
      // Ensure functionDeclarations exists and is an array before iterating
      if (tool.functionDeclarations && Array.isArray(tool.functionDeclarations)) {
        for (const functionDeclaration of tool.functionDeclarations) {
          // Ensure functionDeclaration and its name are defined
          if (functionDeclaration) {
            openAITools.push({
              type: 'function',
              function: {
                name: functionDeclaration.name || '', // Provide a default for potentially undefined name
                description: functionDeclaration.description,
                parameters: this.convertSchemaToOpenAISchema(functionDeclaration.parameters)
              }
            });
          }
        }
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
  private convertSchemaToOpenAISchema(adkSchema: AdkSchema | undefined): OpenAI.FunctionParameters {
    if (!adkSchema) {
      return { type: 'object', properties: {} }; // OpenAI expects this for no params
    }

    // Handle 'oneOf' for Union types
    if (adkSchema.oneOf && adkSchema.oneOf.length > 0) {
      const openAISchema: OpenAI.FunctionParameters = {
        // For a schema with 'oneOf', 'type' is not typically specified at this top level
        // The type of each sub-schema within 'oneOf' will be defined individually.
      };
      if (adkSchema.description) {
        openAISchema.description = adkSchema.description;
      }
      openAISchema.oneOf = adkSchema.oneOf.map(subSchema => 
        this.convertSchemaToOpenAISchema(subSchema)
      );
      return openAISchema;
    }

    // Existing logic for other schema types
    const openAISchema: OpenAI.FunctionParameters = {
      // Type is now optional, so handle potential undefined
      type: adkSchema.type || 'object', // Default to 'object' if type is undefined, though oneOf should handle union cases
    };

    if (adkSchema.description) {
      openAISchema.description = adkSchema.description;
    }

    if (adkSchema.format) {
      openAISchema.format = adkSchema.format;
    }

    // Ensure adkSchema.type is checked before accessing properties specific to that type
    if (adkSchema.type === 'object' && adkSchema.properties) {
      const convertedProperties: Record<string, OpenAI.FunctionParameters> = {};
      for (const propName in adkSchema.properties) {
        if (Object.prototype.hasOwnProperty.call(adkSchema.properties, propName)) {
          convertedProperties[propName] = this.convertSchemaToOpenAISchema(
            adkSchema.properties[propName]
          );
        }
      }
      openAISchema.properties = convertedProperties;

      if (adkSchema.required && adkSchema.required.length > 0) {
        openAISchema.required = adkSchema.required;
      }
    }

    if (adkSchema.type === 'array' && adkSchema.items) {
      openAISchema.items = this.convertSchemaToOpenAISchema(adkSchema.items);
    }

    return openAISchema;
  }
}
