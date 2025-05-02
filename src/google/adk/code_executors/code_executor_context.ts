// Code executor context for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the code executor context functionality from the Python SDK

import { File } from './code_execution_utils';

// State type for session state
type State = Record<string, any>;

// Constants for keys
const CONTEXT_KEY = '_code_execution_context';
const SESSION_ID_KEY = 'execution_session_id';
const PROCESSED_FILE_NAMES_KEY = 'processed_input_files';
const INPUT_FILE_KEY = '_code_executor_input_files';
const ERROR_COUNT_KEY = '_code_executor_error_counts';
const CODE_EXECUTION_RESULTS_KEY = '_code_execution_results';

/**
 * The persistent context used to configure the code executor.
 */
export class CodeExecutorContext {
  /**
   * The context data.
   */
  private context: Record<string, any>;

  /**
   * The session state.
   */
  private sessionState: State;

  /**
   * Initializes the code executor context.
   * 
   * @param sessionState The session state to get the code executor context from
   */
  constructor(sessionState: State) {
    this.context = this.getCodeExecutorContext(sessionState);
    this.sessionState = sessionState;
  }

  /**
   * Gets the state delta to update in the persistent session state.
   * 
   * @returns The state delta to update in the persistent session state
   */
  getStateDelta(): Record<string, any> {
    const contextToUpdate = JSON.parse(JSON.stringify(this.context));
    return { [CONTEXT_KEY]: contextToUpdate };
  }

  /**
   * Gets the session ID for the code executor.
   * 
   * @returns The session ID for the code executor context
   */
  getExecutionId(): string | null {
    if (!(SESSION_ID_KEY in this.context)) {
      return null;
    }
    return this.context[SESSION_ID_KEY];
  }

  /**
   * Sets the session ID for the code executor.
   * 
   * @param sessionId The session ID for the code executor
   */
  setExecutionId(sessionId: string): void {
    this.context[SESSION_ID_KEY] = sessionId;
  }

  /**
   * Gets the processed file names from the session state.
   * 
   * @returns A list of processed file names in the code executor context
   */
  getProcessedFileNames(): string[] {
    if (!(PROCESSED_FILE_NAMES_KEY in this.context)) {
      return [];
    }
    return this.context[PROCESSED_FILE_NAMES_KEY];
  }

  /**
   * Adds the processed file names to the session state.
   * 
   * @param fileNames The processed file names to add to the session state
   */
  addProcessedFileNames(fileNames: string[]): void {
    if (!(PROCESSED_FILE_NAMES_KEY in this.context)) {
      this.context[PROCESSED_FILE_NAMES_KEY] = [];
    }
    this.context[PROCESSED_FILE_NAMES_KEY].push(...fileNames);
  }

  /**
   * Gets the code executor input files from the session state.
   * 
   * @returns A list of input files in the code executor context
   */
  getInputFiles(): File[] {
    if (!(INPUT_FILE_KEY in this.sessionState)) {
      return [];
    }
    return this.sessionState[INPUT_FILE_KEY].map((file: any) => 
      new File({
        name: file.name,
        content: file.content,
        mimeType: file.mimeType
      })
    );
  }

  /**
   * Adds the input files to the code executor context.
   * 
   * @param inputFiles The input files to add to the code executor context
   */
  addInputFiles(inputFiles: File[]): void {
    if (!(INPUT_FILE_KEY in this.sessionState)) {
      this.sessionState[INPUT_FILE_KEY] = [];
    }
    for (const inputFile of inputFiles) {
      this.sessionState[INPUT_FILE_KEY].push({
        name: inputFile.name,
        content: inputFile.content,
        mimeType: inputFile.mimeType
      });
    }
  }

  /**
   * Removes the input files and processed file names to the code executor context.
   */
  clearInputFiles(): void {
    if (INPUT_FILE_KEY in this.sessionState) {
      this.sessionState[INPUT_FILE_KEY] = [];
    }
    if (PROCESSED_FILE_NAMES_KEY in this.context) {
      this.context[PROCESSED_FILE_NAMES_KEY] = [];
    }
  }

  /**
   * Gets the error count from the session state.
   * 
   * @param invocationId The invocation ID to get the error count for
   * @returns The error count for the given invocation ID
   */
  getErrorCount(invocationId: string): number {
    if (!(ERROR_COUNT_KEY in this.sessionState)) {
      return 0;
    }
    return this.sessionState[ERROR_COUNT_KEY][invocationId] || 0;
  }

  /**
   * Increments the error count from the session state.
   * 
   * @param invocationId The invocation ID to increment the error count for
   */
  incrementErrorCount(invocationId: string): void {
    if (!(ERROR_COUNT_KEY in this.sessionState)) {
      this.sessionState[ERROR_COUNT_KEY] = {};
    }
    this.sessionState[ERROR_COUNT_KEY][invocationId] = this.getErrorCount(invocationId) + 1;
  }

  /**
   * Resets the error count from the session state.
   * 
   * @param invocationId The invocation ID to reset the error count for
   */
  resetErrorCount(invocationId: string): void {
    if (!(ERROR_COUNT_KEY in this.sessionState)) {
      return;
    }
    if (invocationId in this.sessionState[ERROR_COUNT_KEY]) {
      delete this.sessionState[ERROR_COUNT_KEY][invocationId];
    }
  }

  /**
   * Updates the code execution result.
   * 
   * @param invocationId The invocation ID to update the code execution result for
   * @param code The code to execute
   * @param resultStdout The standard output of the code execution
   * @param resultStderr The standard error of the code execution
   */
  updateCodeExecutionResult(
    invocationId: string,
    code: string,
    resultStdout: string,
    resultStderr: string
  ): void {
    if (!(CODE_EXECUTION_RESULTS_KEY in this.sessionState)) {
      this.sessionState[CODE_EXECUTION_RESULTS_KEY] = {};
    }
    if (!(invocationId in this.sessionState[CODE_EXECUTION_RESULTS_KEY])) {
      this.sessionState[CODE_EXECUTION_RESULTS_KEY][invocationId] = [];
    }
    this.sessionState[CODE_EXECUTION_RESULTS_KEY][invocationId].push({
      code,
      result_stdout: resultStdout,
      result_stderr: resultStderr,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  /**
   * Gets the code executor context from the session state.
   * 
   * @param sessionState The session state to get the code executor context from
   * @returns A dict of code executor context
   */
  private getCodeExecutorContext(sessionState: State): Record<string, any> {
    if (!(CONTEXT_KEY in sessionState)) {
      sessionState[CONTEXT_KEY] = {};
    }
    return sessionState[CONTEXT_KEY];
  }
}