// Base memory service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base memory service functionality from the Python SDK

import { Event } from '../events/event';
import { Session } from '../sessions/session';

/**
 * Represents a single memory retrieval result.
 */
export class MemoryResult {
  /**
   * The session id associated with the memory.
   */
  sessionId: string;

  /**
   * A list of events in the session.
   */
  events: Event[];

  /**
   * Creates a new MemoryResult.
   */
  constructor(data: {
    sessionId: string;
    events: Event[];
  }) {
    this.sessionId = data.sessionId;
    this.events = data.events;
  }
}

/**
 * Represents the response from a memory search.
 */
export class SearchMemoryResponse {
  /**
   * A list of memory results matching the search query.
   */
  memories: MemoryResult[];

  /**
   * Creates a new SearchMemoryResponse.
   */
  constructor(data: {
    memories?: MemoryResult[];
  } = {}) {
    this.memories = data.memories || [];
  }
}

/**
 * Base class for memory services.
 * 
 * The service provides functionalities to ingest sessions into memory so that
 * the memory can be used for user queries.
 */
export abstract class BaseMemoryService {
  /**
   * Adds a session to the memory service.
   * 
   * A session may be added multiple times during its lifetime.
   * 
   * @param session The session to add
   */
  abstract addSessionToMemory(session: Session): void;

  /**
   * Searches for sessions that match the query.
   * 
   * @param appName The name of the application
   * @param userId The id of the user
   * @param query The query to search for
   * @returns A SearchMemoryResponse containing the matching memories
   */
  abstract searchMemory(
    appName: string,
    userId: string,
    query: string
  ): SearchMemoryResponse;
}