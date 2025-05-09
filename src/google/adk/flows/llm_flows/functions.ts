// Functions module for the Google Agent Development Kit (ADK) in TypeScript
// Implementation of functions handling, ported from Python ADK.

import { v4 as uuidv4 } from 'uuid';
import { InvocationContext } from '../../agents/invocation_context';
import { Event, FunctionCallPart as AdkFunctionCallPart } from '../../events/event';
import { Content as AdkContent } from '../../models/llm_types';
import { BaseTool } from '../../tools/base_tool';

// Using imported types directly or aliasing for clarity if needed.
// AdkFunctionCallPart from event.ts already defines functionCall with an optional id.
// So, the structure { name: string; args: Record<string, unknown>; id?: string; } is what we'll work with.
// No need for a separate GenAI_FunctionCall alias if AdkFunctionCallPart.functionCall is sufficient.

/**
 * Prefix for ADK-generated function call IDs.
 */
export const AF_FUNCTION_CALL_ID_PREFIX = 'adk-';

/**
 * Constant for transfer to agent function call. (Kept from original TS)
 */
export const TRANSFER_TO_AGENT_FUNCTION_CALL_NAME = 'transfer_to_agent';

/**
 * Constant for request credential function call.
 * (Renamed from REQUEST_EUC_FUNCTION_CALL_NAME to align with Python's adk_request_credential)
 */
export const ADK_REQUEST_CREDENTIAL_FUNCTION_CALL_NAME = 'adk_request_credential';

/**
 * Generates a client-side function call ID with a specific prefix.
 * @returns A new function call ID string.
 */
export function generateClientFunctionCallId(): string {
  return `${AF_FUNCTION_CALL_ID_PREFIX}${uuidv4()}`;
}

/**
 * Populates client function call IDs in an event if they are missing.
 * Assumes event.getFunctionCalls() returns an array of `FunctionCallPart` objects from `../../events/event`.
 * Each `FunctionCallPart` has an optional `functionCall` property.
 * @param modelResponseEvent The event to populate.
 */
export function populateClientFunctionCallId(modelResponseEvent: Event): void {
  // modelResponseEvent.getFunctionCalls() returns AdkFunctionCallPart[]
  // AdkFunctionCallPart is { functionCall?: { name: string; args: Record<string, unknown>; id?: string; }; ... }
  const functionCallParts = modelResponseEvent.getFunctionCalls();
  if (!functionCallParts) {
    return;
  }
  for (const part of functionCallParts) { // part is AdkFunctionCallPart
    // part.functionCall is { name: string; args: Record<string, unknown>; }
    // We need to add 'id' for ADK tracking.
    if (part.functionCall && !part.functionCall.id) {
      part.functionCall.id = generateClientFunctionCallId();
    }
  }
}

/**
 * Removes client-generated function call IDs from content parts.
 * This is typically done before sending content to the model.
 * @param content The content object (AdkContent)
 */
export function removeClientFunctionCallId(content: AdkContent): void {
  if (content && content.parts && Array.isArray(content.parts)) {
    for (const part of content.parts) { // part is AdkPart. Its functionCall property does not have 'id'.
      if (
        part.functionCall &&
        part.functionCall.id &&
        typeof part.functionCall.id === 'string' &&
        part.functionCall.id.startsWith(AF_FUNCTION_CALL_ID_PREFIX)
      ) {
        part.functionCall.id = undefined; // Using undefined instead of null for TypeScript
      }
      if (
        part.functionResponse &&
        part.functionResponse.id &&
        typeof part.functionResponse.id === 'string' &&
        part.functionResponse.id.startsWith(AF_FUNCTION_CALL_ID_PREFIX)
      ) {
        part.functionResponse.id = undefined; // Using undefined instead of null for TypeScript
      }
    }
  }
}

/**
 * Gets the long running function calls from a list of function calls.
 *
 * @param functionCallParts The function call parts (AdkFunctionCallPart[] from Event.getFunctionCalls())
 * @param toolsDict The tools dictionary
 * @returns A Set of long running function call IDs
 */
export function getLongRunningFunctionCalls(
  functionCallParts: AdkFunctionCallPart[],
  toolsDict: Record<string, BaseTool>
): Set<string> {
  const longRunningToolIds = new Set<string>();
  if (!functionCallParts) {
    return longRunningToolIds;
  }

  for (const part of functionCallParts) { // part is AdkFunctionCallPart
    // part.functionCall is { name: string; args: Record<string, unknown>; }
    // We need to read the 'id' that populateClientFunctionCallId would have added.
    if (!part.functionCall) continue;

    const toolName = part.functionCall.name;
    const tool = toolsDict[toolName]; // tool is BaseTool

    if (tool && tool.isLongRunning && part.functionCall.id) {
      longRunningToolIds.add(part.functionCall.id);
    }
  }

  return longRunningToolIds;
}

/**
 * Handles function calls in live mode.
 * Placeholder - to be fully implemented.
 * @param invocationContext The invocation context
 * @param functionCallEvent The function call event
 * @param toolsDict The tools dictionary
 * @returns The function response event
 */
export async function handleFunctionCallsLive(
  invocationContext: InvocationContext,
  functionCallEvent: Event,
  _toolsDict: Record<string, BaseTool> // Prefixed with underscore to indicate unused parameter
): Promise<Event | null> {
  // Simplified placeholder from original TS
  const functionCallParts = functionCallEvent.getFunctionCalls(); // Returns AdkFunctionCallPart[]
  if (!functionCallParts || functionCallParts.length === 0) {
    return null;
  }

  // In a real implementation, this would actually call the functions
  // This is a placeholder and needs to be replaced with logic similar to Python's
  // handle_function_calls_live and _process_function_live_helper
  console.warn('[ADK] handleFunctionCallsLive is a simplified placeholder and needs full implementation.');

  const responseEvent = new Event({
    // id: Event.newId(), // id is generated by constructor if not provided
    invocationId: invocationContext.invocationId || '',
    author: functionCallEvent.getAuthor(),
    branch: functionCallEvent.getBranch(),
    content: null, // Placeholder for content
    actions: undefined // Placeholder for actions, will default to new EventActions()
  });

  return responseEvent;
}

/**
 * Handles function calls asynchronously.
 * Placeholder - to be fully implemented.
 * @param invocationContext The invocation context
 * @param functionCallEvent The function call event
 * @param toolsDict The tools dictionary
 * @param filters Optional set of function call IDs to filter by
 * @returns The function response event
 */
export async function handleFunctionCallsAsync(
  invocationContext: InvocationContext,
  functionCallEvent: Event,
  _toolsDict: Record<string, BaseTool>, // Prefixed with underscore to indicate unused parameter
  _filters?: Set<string> // Prefixed with underscore to indicate unused parameter
): Promise<Event | null> {
  // Simplified placeholder from original TS
  const functionCallParts = functionCallEvent.getFunctionCalls(); // Returns AdkFunctionCallPart[]
  if (!functionCallParts || functionCallParts.length === 0) {
    return null;
  }

  // In a real implementation, this would actually call the functions
  // This is a placeholder and needs to be replaced with logic similar to Python's
  // handle_function_calls_async
  console.warn('[ADK] handleFunctionCallsAsync is a simplified placeholder and needs full implementation.');

  const responseEvent = new Event({
    // id: Event.newId(),
    invocationId: invocationContext.invocationId || '',
    author: functionCallEvent.getAuthor(),
    branch: functionCallEvent.getBranch(),
    content: null, // Placeholder for content
    actions: undefined // Placeholder for actions
  });

  return responseEvent;
}

/**
 * Generates an auth event if needed.
 * Placeholder - to be fully implemented.
 * @param invocationContext The invocation context
 * @param functionResponseEvent The function response event
 * @returns The auth event if needed
 */
export function generateAuthEvent(
  _invocationContext: InvocationContext, // Prefixed with underscore to indicate unused parameter
  _functionResponseEvent: Event // Prefixed with underscore to indicate unused parameter
): Event | null {
  // Simplified placeholder from original TS
  // In a real implementation, this would check for auth needs and generate an auth event
  // This needs to be replaced with logic similar to Python's generate_auth_event
  console.warn('[ADK] generateAuthEvent is a simplified placeholder and needs full implementation.');
  return null;
}

// Original helper function to generate a random ID - now replaced by generateClientFunctionCallId
// function generateId(): string {
//   return Math.random().toString(36).substring(2, 15);
// }