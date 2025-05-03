// OpenAI LLM connection module for the Google Agent Development Kit (ADK) in TypeScript
// Provides a simplified implementation of the OpenAI connection functionality

import { BaseLlmConnection } from './base_llm_connection';
import { Content, LlmRequest } from './llm_types';
import { LlmResponse } from './llm_response';
import OpenAI from 'openai';

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
  private generationConfig: any;

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
          content: this.initialRequest.systemInstruction
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
   * @param data The data to send
   */
  async sendRealtime(data: unknown): Promise<void> {
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
  private convertToolsToOpenAITools(tools: any[]): OpenAI.Chat.ChatCompletionTool[] {
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
}
