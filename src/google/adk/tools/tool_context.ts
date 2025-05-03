// Tool context module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the tool context functionality from the Python SDK

import { InvocationContext, CallbackContext } from '../agents/invocation_context';
import { AuthConfig } from '../auth/auth_tool';
import { AuthCredential } from '../auth/auth_credential';
import { AuthHandler } from '../auth/auth_handler';
import { SearchMemoryResponse } from '../memory/base_memory_service';
import { EventActions } from '../events/event_actions';

/**
 * The context of the tool.
 * 
 * This class provides the context for a tool invocation, including access to
 * the invocation context, function call ID, event actions, and authentication
 * response. It also provides methods for requesting credentials, retrieving
 * authentication responses, listing artifacts, and searching memory.
 */
export class ToolContext extends CallbackContext {
  /**
   * The function call id of the current tool call. This id was returned in the function call
   * event from LLM to identify a function call. If LLM didn't return this id, ADK will
   * assign one to it. This id is used to map function call response to the original function call.
   */
  functionCallId?: string;

  /**
   * Creates a new ToolContext.
   * 
   * @param invocationContext The invocation context of the tool
   * @param functionCallId The function call ID
   * @param eventActions The event actions
   */
  constructor(
    invocationContext: InvocationContext,
    functionCallId?: string,
    eventActions?: Partial<{
      requestedAuthConfigs?: Record<string, unknown>;
      transferToAgent?: string;
      stateDelta?: Record<string, unknown>;
      skipSummarization?: boolean;
      escalate?: boolean;
      turnComplete?: boolean;
    }>
  ) {
    // Create EventActions instance from plain object
    const eventActionsInstance = eventActions ? new EventActions(eventActions) : new EventActions();
    super(invocationContext, eventActionsInstance);
    this.functionCallId = functionCallId;
  }

  /**
   * Gets the actions for the event.
   */
  get actions(): EventActions {
    return this.eventActions;
  }

  /**
   * Requests credentials for the tool.
   * 
   * @param authConfig The auth configuration
   */
  requestCredential(authConfig: AuthConfig): void {
    if (!this.functionCallId) {
      throw new Error('functionCallId is not set.');
    }
    
    if (!this.eventActions.requestedAuthConfigs) {
      this.eventActions.requestedAuthConfigs = {};
    }
    
    this.eventActions.requestedAuthConfigs[this.functionCallId] =
      new AuthHandler(authConfig).generateAuthRequest();
  }

  /**
   * Gets the authentication response for the tool.
   * 
   * @param authConfig The auth configuration
   * @returns The authentication credential
   */
  getAuthResponse(authConfig: AuthConfig): AuthCredential {
    const response = new AuthHandler(authConfig).getAuthResponse(this.state);
    if (!response) {
      throw new Error('Authentication response is not available.');
    }
    return response;
  }

  /**
   * Saves an artifact to the current session.
   * 
   * @param filename The filename of the artifact
   * @param artifact The artifact to save
   * @returns The revision ID
   */
  saveArtifact(filename: string, artifact: unknown): number {
    if (!this._invocationContext.artifactService) {
      throw new Error('Artifact service is not initialized.');
    }
    
    return this._invocationContext.artifactService.saveArtifact(
      this._invocationContext.appName,
      this._invocationContext.userId,
      this._invocationContext.session?.id || '',
      filename,
      artifact
    );
  }

  /**
   * Loads an artifact from the current session.
   * 
   * @param filename The filename of the artifact
   * @param version Optional version of the artifact
   * @returns The artifact or null if not found
   */
  loadArtifact(filename: string, version?: number): unknown | null {
    if (!this._invocationContext.artifactService) {
      throw new Error('Artifact service is not initialized.');
    }
    
    return this._invocationContext.artifactService.loadArtifact(
      this._invocationContext.appName,
      this._invocationContext.userId,
      this._invocationContext.session?.id || '',
      filename,
      version
    );
  }

  /**
   * Lists the filenames of the artifacts attached to the current session.
   * 
   * @returns A list of artifact keys
   */
  listArtifacts(): string[] {
    if (!this._invocationContext.artifactService) {
      throw new Error('Artifact service is not initialized.');
    }
    
    return this._invocationContext.artifactService.listArtifactKeys(
      this._invocationContext.appName,
      this._invocationContext.userId,
      this._invocationContext.session?.id || ''
    );
  }

  /**
   * Searches the memory of the current user.
   * 
   * @param query The query to search for
   * @returns The search memory response
   */
  searchMemory(query: string): SearchMemoryResponse {
    if (!this._invocationContext.memoryService) {
      throw new Error('Memory service is not available.');
    }
    
    return this._invocationContext.memoryService.searchMemory(
      this._invocationContext.appName,
      this._invocationContext.userId,
      query
    );
  }
}