// Base example provider module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base example provider functionality from the Python SDK

import { Example } from './example';

/**
 * Base class for example providers.
 * 
 * This class defines the interface for providing examples for a given query.
 */
export abstract class BaseExampleProvider {
  /**
   * Returns a list of examples for a given query.
   * 
   * @param query The query to get examples for
   * @returns A list of Example objects
   */
  abstract getExamples(query: string): Example[] | Promise<Example[]>;
}