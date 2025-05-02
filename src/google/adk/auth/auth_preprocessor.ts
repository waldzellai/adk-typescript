// Auth preprocessor module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the auth preprocessor functionality from the Python SDK

import { InvocationContext } from '../agents/invocation_context';
import { Event } from '../events/event';
import { AuthHandler } from './auth_handler';
import { AuthConfig, AuthToolArguments } from './auth_tool';
import { LlmRequest } from '../models/llm_types';

// Constants for function call names
const REQUEST_EUC_FUNCTION_CALL_NAME = 'request_euc';

/**
 * Base class for LLM request processors.
 */
interface BaseLlmRequestProcessor {
  runAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown>;
}

/**
 * Handles auth information to build the LLM request.
 */
class AuthLlmRequestProcessor implements BaseLlmRequestProcessor {
  /**
   * Processes the LLM request for authentication.
   * 
   * @param invocationContext The invocation context
   * @param llmRequest The LLM request
   * @returns An async generator yielding events
   */
  async *runAsync(
    invocationContext: InvocationContext,
    llmRequest: LlmRequest
  ): AsyncGenerator<Event, void, unknown> {
    // Check if agent is an LlmAgent
    if (!invocationContext.agent || !('canonicalTools' in invocationContext.agent)) {
      return;
    }

    const agent = invocationContext.agent;
    
    if (!invocationContext.session || !invocationContext.session.events) {
      return;
    }
    
    const events = invocationContext.session.events;
    if (!events || events.length === 0) {
      return;
    }

    const requestEucFunctionCallIds = new Set<string>();
    
    // Find events authored by user with function responses
    for (let k = events.length - 1; k >= 0; k--) {
      const event = events[k];
      
      // Look for first event authored by user
      if (!event.getAuthor() || event.getAuthor() !== 'user') {
        continue;
      }
      
      const responses = event.getFunctionResponses();
      if (!responses || responses.length === 0) {
        return;
      }

      for (const functionCallResponse of responses) {
        if (!functionCallResponse.functionResponse) {
          continue;
        }
        
        if (functionCallResponse.functionResponse.name !== REQUEST_EUC_FUNCTION_CALL_NAME) {
          continue;
        }
        
        // Found the function call response for the system long running request euc function call
        requestEucFunctionCallIds.add(functionCallResponse.functionResponse.name);
        
        const authConfig = new AuthConfig({
          authScheme: functionCallResponse.functionResponse.response.authScheme,
          rawAuthCredential: functionCallResponse.functionResponse.response.rawAuthCredential,
          exchangedAuthCredential: functionCallResponse.functionResponse.response.exchangedAuthCredential
        });
        
        new AuthHandler(authConfig).parseAndStoreAuthResponse(
          invocationContext.session.state || {}
        );
      }
      
      break;
    }

    if (requestEucFunctionCallIds.size === 0) {
      return;
    }

    // Find the system long running request euc function call
    for (let i = events.length - 2; i >= 0; i--) {
      const event = events[i];
      
      // Looking for the system long running request euc function call
      const functionCalls = event.getFunctionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        continue;
      }

      const toolsToResume = new Set<string>();

      for (const functionCall of functionCalls) {
        if (!functionCall.functionCall) {
          continue;
        }
        
        if (!requestEucFunctionCallIds.has(functionCall.functionCall.name)) {
          continue;
        }
        
        const args = new AuthToolArguments({
          functionCallId: functionCall.functionCall.args.functionCallId,
          authConfig: new AuthConfig({
            authScheme: functionCall.functionCall.args.authConfig.authScheme,
            rawAuthCredential: functionCall.functionCall.args.authConfig.rawAuthCredential,
            exchangedAuthCredential: functionCall.functionCall.args.authConfig.exchangedAuthCredential
          })
        });

        toolsToResume.add(args.functionCallId);
      }
      
      if (toolsToResume.size === 0) {
        continue;
      }

      // Found the the system long running request euc function call
      // Looking for original function call that requests euc
      for (let j = i - 1; j >= 0; j--) {
        const event = events[j];
        const functionCalls = event.getFunctionCalls();
        
        if (!functionCalls || functionCalls.length === 0) {
          continue;
        }
        
        for (const functionCall of functionCalls) {
          if (!functionCall.functionCall) {
            continue;
          }
          
          let functionResponseEvent = null;
          
          if (toolsToResume.has(functionCall.functionCall.name)) {
            // In the Python version, this calls an async function to handle function calls
            // We would need to implement that functionality 
            // functionResponseEvent = await handleFunctionCallsAsync(
            //   invocationContext,
            //   event,
            //   (agent as LlmAgent).canonicalTools.reduce((acc, tool) => ({ ...acc, [tool.name]: tool }), {}),
            //   toolsToResume
            // );
            
            // For now, create a placeholder event
            functionResponseEvent = new Event(
              Event.newId(),
              invocationContext.invocationId,
              agent.name,
              invocationContext.branch,
              null,
              {}
            );
          }
          
          if (functionResponseEvent) {
            yield functionResponseEvent;
          }
          
          return;
        }
      }
      
      return;
    }
  }
}

// Export the request processor instance
export const requestProcessor = new AuthLlmRequestProcessor();