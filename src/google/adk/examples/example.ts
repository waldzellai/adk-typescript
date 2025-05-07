// Example module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the example functionality from the Python SDK

import { Content } from '@google/genai';

/**
 * A few-shot example.
 */
export class Example {
  /**
   * The input content for the example.
   */
  input: Content;

  /**
   * The expected output content for the example.
   */
  output: Content[];

  /**
   * Creates a new Example.
   */
  constructor(data: {
    input: Content;
    output: Content[];
  }) {
    this.input = data.input;
    this.output = data.output;
  }
}