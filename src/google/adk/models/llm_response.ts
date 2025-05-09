// LLM response module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the LLM response functionality from the Python SDK

import { Content } from './llm_types';
import { FunctionCall, SafetyRating, UsageMetadata } from './llm_types';
import { EventActions } from '../events/event_actions';

/**
 * Response from a language model.
 */
export class LlmResponse {
  /**
   * Unique identifier for the response.
   */
  id?: string;

  /**
   * The content generated by the model.
   */
  content?: Content;

  /**
   * Error code if there was an error.
   */
  errorCode?: string;

  /**
   * Error message if there was an error.
   */
  errorMessage?: string;

  /**
   * Whether the response was interrupted.
   */
  interrupted?: boolean;

  /**
   * Whether the response is partial.
   */
  partial?: boolean;

  /**
   * Whether the turn is complete.
   */
  turnComplete?: boolean;

  /**
   * Actions to take based on the response.
   */
  actions?: EventActions;

  /**
   * Usage metadata for token counts.
   */
  usageMetadata?: UsageMetadata;

  /**
   * Index of the candidate response.
   */
  candidateIndex?: number;

  /**
   * Reason why the model finished generating.
   */
  finishReason?: string;

  /**
   * Safety ratings for the response.
   */
  safetyRatings?: SafetyRating[];

  /**
   * Function call requested by the model.
   */
  functionCall?: FunctionCall;

  /**
   * Creates a new LlmResponse.
   */
  constructor(data: {
    id?: string;
    content?: Content;
    errorCode?: string;
    errorMessage?: string;
    interrupted?: boolean;
    partial?: boolean;
    turnComplete?: boolean;
    actions?: EventActions;
    usageMetadata?: UsageMetadata;
    candidateIndex?: number;
    finishReason?: string;
    safetyRatings?: SafetyRating[];
    functionCall?: FunctionCall;
  } = {}) {
    this.id = data.id;
    this.content = data.content;
    this.errorCode = data.errorCode;
    this.errorMessage = data.errorMessage;
    this.interrupted = data.interrupted;
    this.partial = data.partial;
    this.turnComplete = data.turnComplete;
    this.actions = data.actions;
    this.usageMetadata = data.usageMetadata;
    this.candidateIndex = data.candidateIndex;
    this.finishReason = data.finishReason;
    this.safetyRatings = data.safetyRatings;
    this.functionCall = data.functionCall;
  }
}