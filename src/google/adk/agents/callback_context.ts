/**
 * @fileoverview CallbackContext implementation for the Google Agent Development Kit (ADK) in TypeScript
 * 
 * This module provides a mutable context for callback execution with state management
 * and artifact operations. It extends ReadonlyContext to provide additional functionality
 * for modifying state and managing artifacts during callback execution.
 */

import { InvocationContext } from './invocation_context';
import { State } from '../sessions/state';
import { EventActions } from '../events/event_actions';

/**
 * A mutable context for callback execution with state and artifact management.
 * 
 * This class provides functionality for modifying state and managing artifacts 
 * during callback execution. It maintains a cached mutable state instance and 
 * provides methods for artifact operations.
 * 
 * Unlike ReadonlyContext, this class returns a mutable State instance that
 * wraps the session's state dict, matching the Python implementation.
 */
export class CallbackContext {
  /**
   * Cached mutable state instance for this callback context.
   */
  private _cachedState: State | null = null;

  /**
   * Event actions associated with this callback context.
   */
  private _eventActions: EventActions;

  /**
   * The invocation context for this callback.
   * This property is exposed for test compatibility.
   */
  public readonly invocationContext: InvocationContext;

  /**
   * Creates a new callback context.
   *
   * @param context The invocation context to wrap
   * @param eventActions The event actions for this callback
   */
  /**
   * The underlying invocation context.
   */
  protected readonly _context: InvocationContext;

  constructor(context: InvocationContext, eventActions?: EventActions) {
    this._context = context;
    this._eventActions = eventActions || new EventActions();
    this.invocationContext = context;
  }

  /**
   * Gets the mutable state for this callback context.
   * 
   * This provides a mutable view of the session state that can be modified
   * during callback execution. The state is cached to ensure consistency
   * within a single callback execution.
   *
   * @returns A mutable state instance or null if no session exists
   */
  get state(): State | null {
    if (!this._context.session) {
      return null;
    }

    // Return cached state if available
    if (this._cachedState) {
      return this._cachedState;
    }

    try {
      // Get the session state
      const sessionState = this._context.session.state;
      
      if (!sessionState) {
        return null;
      }

      // Create a new mutable State instance wrapping the session's state dict
      // This matches Python's State(value=invocation_context.session.state, delta=self._event_actions.state_delta)
      this._cachedState = new State(sessionState, this._eventActions.stateDelta || {});
      return this._cachedState;
    } catch (error) {
      // Log error and return null for safety
      console.error('Error creating mutable state:', error);
      return null;
    }
  }

  /**
   * Gets the event actions for this callback context.
   * 
   * @returns The event actions instance
   */
  get eventActions(): EventActions {
    return this._eventActions;
  }

  /**
   * Loads an artifact from the artifact service.
   * 
   * This method provides access to artifacts stored in the artifact service,
   * allowing callbacks to retrieve and process artifact data.
   *
   * @param artifactId The ID of the artifact to load
   * @returns A promise that resolves to the artifact data
   * @throws Error if the artifact service is not available or if loading fails
   */
  async loadArtifact(artifactId: string): Promise<unknown> {
    if (!this._context.artifactService) {
      throw new Error('Artifact service is not available');
    }

    if (!this._context.session) {
      throw new Error('Session is not available for artifact operations');
    }

    try {
      return await this._context.artifactService.loadArtifact(
        this._context.appName,
        this._context.userId,
        this._context.session.id,
        artifactId
      );
    } catch (error) {
      throw new Error(`Failed to load artifact ${artifactId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Saves an artifact to the artifact service.
   * 
   * This method allows callbacks to store artifact data in the artifact service
   * for later retrieval or processing.
   *
   * @param artifactId The ID of the artifact to save
   * @param data The artifact data to save
   * @returns A promise that resolves to the number of bytes saved
   * @throws Error if the artifact service is not available or if saving fails
   */
  async saveArtifact(artifactId: string, data: unknown): Promise<number> {
    if (!this._context.artifactService) {
      throw new Error('Artifact service is not available');
    }

    if (!this._context.session) {
      throw new Error('Session is not available for artifact operations');
    }

    try {
      return await this._context.artifactService.saveArtifact(
        this._context.appName,
        this._context.userId,
        this._context.session.id,
        artifactId,
        data
      );
    } catch (error) {
      throw new Error(`Failed to save artifact ${artifactId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks if there are any state changes in this callback context.
   * 
   * This method checks both the cached state for changes and the event actions
   * for state changes to determine if any modifications have been made.
   *
   * @returns True if there are state changes, false otherwise
   */
  hasStateDelta(): boolean {
    // Check if the cached state has changes
    const stateHasChanges = this._cachedState?.hasDelta() || false;
    
    // Check if event actions have state changes
    const eventActionsHaveChanges = this._eventActions.hasStateChanges();
    
    return stateHasChanges || eventActionsHaveChanges;
  }

  /**
   * Resets the cached state, forcing it to be recreated on next access.
   * 
   * This method is useful for testing or when the underlying session state
   * has been modified externally.
   */
  resetCachedState(): void {
    this._cachedState = null;
  }

  // Getter methods for accessing context properties
  
  /**
   * Gets the agent associated with this context.
   */
  get agent() {
    return this._context.agent;
  }

  /**
   * Gets the run configuration.
   */
  get runConfig() {
    return this._context.runConfig;
  }

  /**
   * Gets the session or null if not available.
   */
  get session() {
    return this._context.session;
  }

  /**
   * Gets the user content.
   */
  get userContent() {
    return this._context.userContent;
  }

  /**
   * Gets the application name.
   */
  get appName() {
    return this._context.appName;
  }

  /**
   * Gets the user ID.
   */
  get userId() {
    return this._context.userId;
  }

  /**
   * Gets the artifact service or null if not available.
   */
  get artifactService() {
    return this._context.artifactService;
  }

  /**
   * Gets the memory service or undefined if not available.
   */
  get memoryService() {
    return this._context.memoryService;
  }

  /**
   * Gets the invocation ID.
   */
  get invocationId() {
    return this._context.invocationId;
  }

  /**
   * Gets the branch or null if not set.
   */
  get branch() {
    return this._context.branch;
  }
}