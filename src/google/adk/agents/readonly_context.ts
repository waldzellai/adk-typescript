/**
 * @fileoverview ReadonlyContext implementation for the Google Agent Development Kit (ADK) in TypeScript
 * 
 * This module provides a read-only view of the invocation context for safe data access.
 * It ensures that context data cannot be modified while still providing access to all
 * necessary properties and state information.
 */

import { BaseAgent } from './base_agent';
import { RunConfig } from './run_config';
import { InvocationContext } from './invocation_context';
import { BaseArtifactService } from '../artifacts';
import { BaseMemoryService } from '../memory';
import { Session } from '../sessions';
import { Content } from '../models/base_llm';

/**
 * A read-only view of the invocation context for safe data access.
 * 
 * This class provides access to all properties of the invocation context
 * while preventing modifications. The state property returns a deeply
 * frozen view of the session state to ensure immutability.
 */
export class ReadonlyContext {
  /**
   * The wrapped invocation context.
   */
  protected _context: InvocationContext;

  /**
   * Creates a new read-only context.
   *
   * @param context The invocation context to wrap
   */
  constructor(context: InvocationContext) {
    this._context = context;
  }

  /**
   * Gets the agent from the invocation context.
   * 
   * @returns The agent instance
   */
  get agent(): BaseAgent {
    return this._context.agent;
  }

  /**
   * Gets the run configuration from the invocation context.
   * 
   * @returns The run configuration
   */
  get runConfig(): RunConfig {
    return this._context.runConfig;
  }

  /**
   * Gets the session from the invocation context.
   * 
   * @returns The session instance or null if no session exists
   */
  get session(): Session | null {
    return this._context.session;
  }

  /**
   * Gets the user content from the invocation context.
   * 
   * @returns The user content or null if no content exists
   */
  get userContent(): Content | null {
    return this._context.userContent;
  }

  /**
   * Gets the application name from the invocation context.
   * 
   * @returns The application name
   */
  get appName(): string {
    return this._context.appName;
  }

  /**
   * Gets the user ID from the invocation context.
   * 
   * @returns The user ID
   */
  get userId(): string {
    return this._context.userId;
  }

  /**
   * Gets the artifact service from the invocation context.
   * 
   * @returns The artifact service instance or null
   */
  get artifactService(): BaseArtifactService | null {
    return this._context.artifactService;
  }

  /**
   * Gets the memory service from the invocation context.
   * 
   * @returns The memory service instance or null if no service exists
   */
  get memoryService(): BaseMemoryService | null {
    return this._context.memoryService;
  }

  /**
   * Gets the invocation ID from the invocation context.
   * 
   * @returns The invocation ID
   */
  get invocationId(): string {
    return this._context.invocationId;
  }

  /**
   * Gets the branch from the invocation context.
   * 
   * @returns The branch name or null if no branch is set
   */
  get branch(): string | null {
    return this._context.branch;
  }

  /**
   * Gets a read-only view of the session state.
   * 
   * This provides safe access to the state without allowing modifications.
   * The returned state is deeply frozen to prevent any mutations.
   *
   * Based on Python implementation, this returns a frozen view of the 
   * session's state dict, not a State instance.
   *
   * @returns A read-only view of the state object or null if no session exists
   */
  get state(): Readonly<Record<string, unknown>> | null {
    if (!this._context.session) {
      return null;
    }
    
    try {
      // Get the session state (which is a plain object/dict)
      const sessionState = this._context.session.state;
      
      if (!sessionState) {
        return null;
      }
      
      // Return a deeply frozen view of the state object
      // This matches Python's MappingProxyType(session.state)
      return deepFreeze({...sessionState});
    } catch (error) {
      // Log error and return null for safety
      console.error('Error accessing session state:', error);
      return null;
    }
  }
}

/**
 * Recursively freezes an object to make it deeply immutable.
 * 
 * This function ensures that the object and all its nested properties
 * are frozen, preventing any modifications to the object structure.
 *
 * @param obj The object to freeze
 * @returns The deeply frozen object
 */
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key as keyof T];
        // Only freeze non-function values to preserve methods
        if (typeof value !== 'function') {
          deepFreeze(value);
        }
      }
    }
  }
  return obj;
}

