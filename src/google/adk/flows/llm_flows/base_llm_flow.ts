// Base LLM flow module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base LLM flow functionality from the Python SDK

import { BaseAgent } from '../../agents/base_agent';
import { InvocationContext, CallbackContext } from '../../agents/invocation_context';
import { Event } from '../../events/event';
import { LlmRequest, LlmResponse, Content } from '../../models';
import { BaseLlmResponseProcessor, BaseLlmRequestProcessor } from './_base_llm_processor';
import { ToolContext } from '../../tools/tool_context';
import { BaseLlm } from '../../models/base_llm';
import { BaseLlmConnection } from '../../models/base_llm_connection';
import { LiveRequest, LiveRequestQueue } from '../../agents/live_request_queue';
import { TranscriptionEntry } from '../../agents/transcription_entry';
import { StreamingMode } from '../../agents/run_config';
import * as functions from './functions';

// Interface for a tool that can process LLM requests
interface Tool {
  processLlmRequest(toolContext: ToolContext, request: LlmRequest): Promise<void>;
}

// Interface for agents that support canonical tools
interface AgentWithTools extends BaseAgent {
  canonicalTools: Tool[];
}

/**
 * A basic flow that calls the LLM in a loop until a final response is generated.
 *
 * This flow ends when it transfers to another agent.
 */
export abstract class BaseLlmFlow {
  /**
   * Request processors for the flow.
   */
  requestProcessors: BaseLlmRequestProcessor[] = [];

  /**
   * Response processors for the flow.
   */
  responseProcessors: BaseLlmResponseProcessor[] = [];

  /**
   * Runs the flow using live API.
   *
   * @param _invocationContext The invocation context
   * @returns An async generator yielding events
   */
  async *runLive(
    _invocationContext: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    const llmRequest = new LlmRequest();
    const eventId = Event.newId();

    // Preprocess before calling the LLM
    for await (const event of this.preprocessAsync(_invocationContext, llmRequest)) {
      yield event;
    }

    if (_invocationContext.endInvocation) {
      return;
    }

    const llm = this.getLlm(_invocationContext);
    console.debug(
      `Establishing live connection for agent: ${_invocationContext.agent.name} with llm request:`,
      llmRequest
    );

    const llmConnection = await llm.connect(llmRequest);

    try {
      if (llmRequest.contents) {
        // Sends the conversation history to the model
        if (_invocationContext.transcriptionCache) {
          // Handle audio transcription (simplified)
          const contents = this.transcribeFile(_invocationContext);
          console.debug('Sending history to model:', contents);
          await llmConnection.sendHistory(contents);
          _invocationContext.transcriptionCache = null;
        } else {
          await llmConnection.sendHistory(llmRequest.contents);
        }
      }

      // Receive from model
      for await (const event of this.receiveFromModel(
        llmConnection,
        eventId,
        _invocationContext,
        llmRequest
      )) {
        // Empty event means the queue is closed
        if (!event) {
          break;
        }

        console.debug('Receive new event:', event);
        yield event;

        // Send back the function response
        if (event.getFunctionResponses().length > 0) {
          console.debug('Sending back last function response event:', event);
          const content = event.getContent();
          if (content) {
            _invocationContext.requestQueue.sendContent(content);
          }
        }

        // Handle transfer to agent
        const parts = event.getContent()?.parts;
        if (
          parts &&
          parts.length > 0 &&
          parts[0]?.functionResponse?.name === 'transfer_to_agent'
        ) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Close connection
          await llmConnection.close();
          break;
        }
      }
    } finally {
      // Clean up
      await llmConnection.close();
    }
  }

  /**
   * Sends data to model.
   *
   * @param llmConnection The LLM connection
   * @param invocationContext The invocation context
   */
  private async sendToModel(
    llmConnection: BaseLlmConnection,
    invocationContext: InvocationContext
  ): Promise<void> {
    const liveRequestQueue = invocationContext.requestQueue;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // Get live request with timeout
        const liveRequest = await this.getRequestWithTimeout(liveRequestQueue, 250);

        // Duplicate the live request to all active streams
        console.debug(
          `Sending live request ${liveRequest} to active streams:`,
          invocationContext.activeStreamingTools
        );

        if (invocationContext.activeStreamingTools) {
          for (const [, activeStreamingTool] of Object.entries(invocationContext.activeStreamingTools)) {
            if (activeStreamingTool.stream) {
              activeStreamingTool.stream.send(liveRequest);
            }
          }
        }

        // Small yield to allow other tasks to run
        await new Promise(resolve => setTimeout(resolve, 0));

        if (liveRequest.close) {
          await llmConnection.close();
          return;
        }

        if (liveRequest.blob) {
          // Cache audio data for transcription
          if (!invocationContext.transcriptionCache) {
            invocationContext.transcriptionCache = [];
          }
          invocationContext.transcriptionCache.push(
            new TranscriptionEntry({ role: 'user', data: liveRequest.blob })
          );
          await llmConnection.sendRealtime(liveRequest.blob);
        }

        if (liveRequest.content) {
          await llmConnection.sendContent(liveRequest.content);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          continue; // Timeout, try again
        }
        throw error; // Rethrow other errors
      }
    }
  }

  /**
   * Gets a request from the queue with a timeout.
   *
   * @param queue The live request queue
   * @param timeout Timeout in milliseconds
   * @returns The live request
   */
  private async getRequestWithTimeout(
    queue: LiveRequestQueue,
    timeout: number
  ): Promise<LiveRequest> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('TimeoutError'));
      }, timeout);

      queue.get()
        .then(request => {
          clearTimeout(timer);
          resolve(request);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Receive data from model and process events using BaseLlmConnection.
   *
   * @param llmConnection The LLM connection
   * @param eventId The event ID
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @returns An async generator yielding events
   */
  private async *receiveFromModel(
    llmConnection: BaseLlmConnection,
    eventId: string,
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown> {
    try {
      while (true) {
        for await (const llmResponse of llmConnection.receive()) {
          const modelResponseEvent = new Event({
            author: 'agent',
            content: {
              role: 'model',
              parts: [{ text: JSON.stringify({ type: 'interaction_start', stage: 'start' }) }]
            }
          });

          for await (const event of this.postprocessLive(
            invocationContext,
            llmRequest,
            llmResponse as LlmResponse,
            modelResponseEvent
          )) {
            if (
              event.getContent() &&
              event.getContent()!.parts &&
              event.getContent()?.parts?.[0]?.text &&
              !event.isPartial()
            ) {
              if (!invocationContext.transcriptionCache) {
                invocationContext.transcriptionCache = [];
              }
              invocationContext.transcriptionCache.push(
                new TranscriptionEntry({ role: 'model', data: event.getContent()! })
              );
            }
            yield event;
          }
        }
        // Small yield to allow other tasks to run
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (error) {
      // Handle connection closed
      if (error instanceof Error && error.name === 'ConnectionClosedOK') {
        return;
      }
      throw error;
    }
  }

  /**
   * Runs the flow.
   *
   * @param invocationContext The invocation context
   * @returns An async generator yielding events
   */
  async *runAsync(
    invocationContext: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    while (true) {
      let lastEvent: Event | null = null;
      for await (const event of this.runOneStepAsync(invocationContext)) {
        lastEvent = event;
        yield event;
      }
      if (!lastEvent || lastEvent.isFinalResponse()) {
        break;
      }
    }
  }

  /**
   * One step means one LLM call.
   *
   * @param invocationContext The invocation context
   * @returns An async generator yielding events
   */
  private async *runOneStepAsync(
    invocationContext: InvocationContext
  ): AsyncGenerator<Event, void, unknown> {
    const llmRequest = new LlmRequest();

    // Preprocess before calling the LLM
    for await (const event of this.preprocessAsync(invocationContext, llmRequest)) {
      yield event;
    }

    if (invocationContext.endInvocation) {
      return;
    }

    // Calls the LLM
    const modelResponseEvent = new Event({
      author: 'agent',
      content: {
        role: 'model',
        parts: [{ text: JSON.stringify({ type: 'interaction_end', stage: 'end', llm_response: null }) }]
      }
    });

    for await (const llmResponse of this.callLlmAsync(
      invocationContext,
      llmRequest,
      modelResponseEvent
    )) {
      // Postprocess after calling the LLM
      for await (const event of this.postprocessAsync(
        invocationContext,
        llmRequest,
        llmResponse,
        modelResponseEvent
      )) {
        yield event;
      }
    }
  }

  /**
   * Preprocess before calling the LLM.
   *
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @returns An async generator yielding events
   */
  private async *preprocessAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown> {
    const agent = invocationContext.agent;

    if (!agent || !('canonicalTools' in agent)) {
      return;
    }

    // Assert agent as having canonical tools
    const agentWithTools = agent as AgentWithTools;

    // Run processors
    for (const processor of this.requestProcessors) {
      for await (const event of processor.runAsync(invocationContext, llmRequest)) {
        yield event;
      }
    }

    // Run processors for tools
    for (const tool of agentWithTools.canonicalTools) {
      const toolContext = new ToolContext(invocationContext);
      await tool.processLlmRequest(toolContext, llmRequest);
    }
  }

  /**
   * Postprocess after calling the LLM.
   *
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @param llmResponse The LLM response
   * @param modelResponseEvent The model response event
   * @returns An async generator yielding events
   */
  private async *postprocessAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest,
    llmResponse: LlmResponse,
    modelResponseEvent: Event
  ): AsyncGenerator<Event, void, unknown> {
    // Run processors
    for await (const event of this.postprocessRunProcessorsAsync(
      invocationContext,
      llmResponse
    )) {
      yield event;
    }

    // Skip the model response event if there is no content
    if (!llmResponse.content) {
      return;
    }

    // Build the event
    const finalizedEvent = this.finalizeModelResponseEvent(
      llmRequest,
      llmResponse,
      modelResponseEvent
    );
    yield finalizedEvent;

    // Handle function calls
    if (finalizedEvent.getFunctionCalls().length > 0) {
      for await (const event of this.postprocessHandleFunctionCallsAsync(
        invocationContext,
        finalizedEvent,
        llmRequest
      )) {
        yield event;
      }
    }
  }

  /**
   * Postprocess after calling the LLM in live mode.
   *
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @param llmResponse The LLM response
   * @param modelResponseEvent The model response event
   * @returns An async generator yielding events
   */
  private async *postprocessLive(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest,
    llmResponse: LlmResponse,
    modelResponseEvent: Event
  ): AsyncGenerator<Event, void, unknown> {
    // Run processors
    for await (const event of this.postprocessRunProcessorsAsync(
      invocationContext,
      llmResponse
    )) {
      yield event;
    }

    // Skip the model response event if there is no content
    if (!llmResponse.content) {
      return;
    }

    // Build the event
    const finalizedEvent = this.finalizeModelResponseEvent(
      llmRequest,
      llmResponse,
      modelResponseEvent
    );
    yield finalizedEvent;

    // Handle function calls
    if (finalizedEvent.getFunctionCalls().length > 0) {
      const functionResponseEvent = await functions.handleFunctionCallsLive(
        invocationContext,
        finalizedEvent,
        llmRequest.toolsDict || {}
      );

      if (functionResponseEvent) {
        yield functionResponseEvent;

        const transferToAgent = functionResponseEvent.getActions().transferToAgent;
        if (transferToAgent) {
          const agentToRun = this.getAgentToRun(
            invocationContext,
            transferToAgent
          );

          for await (const event of agentToRun.runLive(invocationContext)) {
            yield event;
          }
        }
      }
    }
  }

  /**
   * Run response processors.
   *
   * @param invocationContext The invocation context
   * @param llmResponse The LLM response
   * @returns An async generator yielding events
   */
  private async *postprocessRunProcessorsAsync(
    invocationContext: InvocationContext,
    llmResponse: LlmResponse
  ): AsyncGenerator<Event, void, unknown> {
    for (const processor of this.responseProcessors) {
      for await (const event of processor.runAsync(invocationContext, llmResponse)) {
        yield event;
      }
    }
  }

  /**
   * Handle function calls.
   *
   * @param invocationContext The invocation context
   * @param functionCallEvent The function call event
   * @param llmRequest The LLM request
   * @returns An async generator yielding events
   */
  private async *postprocessHandleFunctionCallsAsync(
    invocationContext: InvocationContext,
    functionCallEvent: Event,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown> {
    const functionResponseEvent = await functions.handleFunctionCallsAsync(
      invocationContext,
      functionCallEvent,
      llmRequest.toolsDict || {}
    );

    if (functionResponseEvent) {
      const authEvent = functions.generateAuthEvent(
        invocationContext,
        functionResponseEvent
      );

      if (authEvent) {
        yield authEvent;
      }

      yield functionResponseEvent;

      const transferToAgent = functionResponseEvent.getActions().transferToAgent;
      if (transferToAgent) {
        const agentToRun = this.getAgentToRun(
          invocationContext,
          transferToAgent
        );

        for await (const event of agentToRun.runAsync(invocationContext)) {
          yield event;
        }
      }
    }
  }

  /**
   * Get the agent to run.
   *
   * @param invocationContext The invocation context
   * @param transferToAgent The agent to transfer to
   * @returns The agent to run
   */
  private getAgentToRun(
    invocationContext: InvocationContext,
    transferToAgent: string
  ): BaseAgent {
    const rootAgent = invocationContext.agent.rootAgent;
    const agentToRun = rootAgent.findAgent(transferToAgent);

    if (!agentToRun) {
      throw new Error(`Agent ${transferToAgent} not found in the agent tree.`);
    }

    return agentToRun;
  }

  /**
   * Call the LLM.
   *
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @param modelResponseEvent The model response event
   * @returns An async generator yielding LLM responses
   */
  private async *callLlmAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest,
    modelResponseEvent: Event
  ): AsyncGenerator<LlmResponse, void, unknown> {
    // Execute the before model callback if defined.
    const beforeCallbackResponse = this.handleBeforeModelCallback(
      invocationContext,
      llmRequest,
      modelResponseEvent
    );
    if (beforeCallbackResponse) {
      yield beforeCallbackResponse;
      return;
    }

    // Call the LLM
    const llm = this.getLlm(invocationContext);

    if (invocationContext.runConfig.supportCfc) {
      invocationContext.requestQueue = new LiveRequestQueue();

      for await (const event of this.runLive(invocationContext)) {
        // Execute the after model callback if defined.
        if (event.isPartial() && event.getContent()) {
          const llmResponse = new LlmResponse({
            content: event.getContent() || undefined,
            partial: event.isPartial()
          });

          const alteredLlmResponse = this.handleAfterModelCallback(
            invocationContext,
            llmResponse,
            modelResponseEvent
          );

          if (alteredLlmResponse) {
            yield alteredLlmResponse;
          } else {
            yield llmResponse;
          }
        }

        if (event.getActions() && event.getActions().turnComplete) {
          invocationContext.requestQueue.close();
        }
      }
    } else {
      // Check if we can make this llm call or not
      invocationContext.incrementLlmCallCount();

      for await (const llmResponse of llm.generateContentAsync(
        llmRequest,
        invocationContext.runConfig.streamingMode === StreamingMode.SSE
      )) {
        // Execute the after model callback if defined.
        const alteredLlmResponse = this.handleAfterModelCallback(
          invocationContext,
          llmResponse,
          modelResponseEvent
        );

        if (alteredLlmResponse) {
          yield alteredLlmResponse;
        } else {
          yield llmResponse;
        }
      }
    }
  }

  /**
   * Handle before model callback.
   *
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @param _modelResponseEvent The model response event
   * @returns The LLM response if the callback returns one
   */
  protected handleBeforeModelCallback(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest,
    _modelResponseEvent: Event
  ): LlmResponse | null {
    const agent = invocationContext.agent;

    // Check if agent and the callback exist
    if (agent && 'beforeModelCallback' in agent && typeof agent.beforeModelCallback === 'function') {
      const callbackContext = new CallbackContext(invocationContext);

      // Call the agent's callback
      // Note: Assuming callback signature matches Python (context, request)
      return agent.beforeModelCallback(
        callbackContext,
        llmRequest
      );
    }
    return null;
  }

  /**
   * Handle after model callback.
   *
   * @param invocationContext The invocation context
   * @param llmResponse The LLM response
   * @param _modelResponseEvent The model response event
   * @returns The altered LLM response if the callback returns one
   */
  protected handleAfterModelCallback(
    invocationContext: InvocationContext,
    llmResponse: LlmResponse,
    _modelResponseEvent: Event
  ): LlmResponse | null {
    const agent = invocationContext.agent;

    // Check if agent and the callback exist
    if (agent && 'afterModelCallback' in agent && typeof agent.afterModelCallback === 'function') {
      const callbackContext = new CallbackContext(invocationContext);

      // Call the agent's callback
      // Note: Assuming callback signature matches Python (context, response)
      return agent.afterModelCallback(
        callbackContext,
        llmResponse
      );
    }
    return null;
  }

  /**
   * Finalize the model response event.
   *
   * @param llmRequest The LLM request
   * @param llmResponse The LLM response
   * @param _modelResponseEvent The model response event
   * @returns The finalized event
   */
  private finalizeModelResponseEvent(
    llmRequest: LlmRequest,
    llmResponse: LlmResponse,
    _modelResponseEvent: Event
  ): Event {
    // Create a new event with the merged properties
    let finalizedEvent = new Event({
      author: 'agent',
      content: {
        role: 'model',
        parts: [{ text: JSON.stringify({ type: 'interaction_end', stage: 'end', llm_response: llmResponse }) }]
      }
    });

    // Handle function calls
    if (finalizedEvent.getContent()) {
      const functionCalls = finalizedEvent.getFunctionCalls();

      if (functionCalls.length > 0) {
        functions.populateClientFunctionCallId(finalizedEvent);

        // Create a new Event with long running tool IDs
        const longRunningToolIds = new Set(
          functions.getLongRunningFunctionCalls(
            functionCalls,
            llmRequest.toolsDict || {}
          )
        );

        finalizedEvent = finalizedEvent.withModifications({
          longRunningToolIds
        });
      }
    }

    return finalizedEvent;
  }

  /**
   * Get the LLM from the invocation context.
   *
   * @param invocationContext The invocation context
   * @returns The LLM
   */
  private getLlm(invocationContext: InvocationContext): BaseLlm {
    const agent = invocationContext.agent;

    if (!agent || !('canonicalModel' in agent)) {
      throw new Error('Agent must have a canonical model');
    }

    return agent.canonicalModel as BaseLlm;
  }

  /**
   * Transcribe audio file (simplified implementation).
   *
   * @param invocationContext The invocation context
   * @returns The transcribed content
   */
  private transcribeFile(_invocationContext: InvocationContext): Content[] {
    // This is a simplified implementation
    // In a real implementation, this would use an audio transcription service
    console.warn('Audio transcription not fully implemented');
    return [];
  }
}