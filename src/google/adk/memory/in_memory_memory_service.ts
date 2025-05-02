// In-memory memory service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the in-memory memory service functionality from the Python SDK

import { Event } from '../events/event';
import { Session } from '../sessions/session';
import { BaseMemoryService, MemoryResult, SearchMemoryResponse } from './base_memory_service';

/**
 * An in-memory memory service for prototyping purpose only.
 * 
 * Uses keyword matching instead of semantic search.
 */
export class InMemoryMemoryService extends BaseMemoryService {
  /**
   * Keys are app_name/user_id/session_id.
   * Each entry contains a list of events from that session.
   */
  private sessionEvents: Record<string, Event[]> = {};

  /**
   * Creates a new InMemoryMemoryService.
   */
  constructor() {
    super();
  }

  /**
   * Adds a session to the memory service.
   * 
   * @param session The session to add
   */
  addSessionToMemory(session: Session): void {
    const key = `${session.appName}/${session.userId}/${session.id}`;
    this.sessionEvents[key] = session.events.filter(event => event.getContent());
  }

  /**
   * Searches for sessions that match the query.
   * 
   * @param appName The name of the application
   * @param userId The id of the user
   * @param query The query to search for
   * @returns A SearchMemoryResponse containing the matching memories
   */
  searchMemory(
    appName: string,
    userId: string,
    query: string
  ): SearchMemoryResponse {
    // Split query into keywords for matching
    const keywords = new Set(query.toLowerCase().split(/\s+/));
    const response = new SearchMemoryResponse();
    
    // Check each session
    for (const [key, events] of Object.entries(this.sessionEvents)) {
      // Skip sessions that don't belong to this app/user
      if (!key.startsWith(`${appName}/${userId}/`)) {
        continue;
      }
      
      const matchedEvents: Event[] = [];
      
      // Check each event for keyword matches
      for (const event of events) {
        const content = event.getContent();
        if (!content || !content.parts || content.parts.length === 0) {
          continue;
        }
        
        // Combine all text parts
        const text = content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('\n')
          .toLowerCase();
        
        // Check for any keyword match
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            matchedEvents.push(event);
            break;
          }
        }
      }
      
      // Add matching events to response
      if (matchedEvents.length > 0) {
        const sessionId = key.split('/').pop() || '';
        response.memories.push(
          new MemoryResult({
            sessionId,
            events: matchedEvents
          })
        );
      }
    }
    
    return response;
  }
}