// Base code executor for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base code executor functionality from the Python SDK

import { InvocationContext } from '../agents/invocation_context';
import { CodeExecutionInput, CodeExecutionResult } from './code_execution_utils';

/**
 * Abstract base class for all code executors.
 * 
 * The code executor allows the agent to execute code blocks from model responses
 * and incorporate the execution results into the final response.
 */
export abstract class BaseCodeExecutor {
  /**
   * If true, extract and process data files from the model request
   * and attach them to the code executor.
   * Supported data file MimeTypes are [text/csv].
   * 
   * Default to false.
   */
  optimizeDataFile: boolean = false;

  /**
   * Whether the code executor is stateful. Default to false.
   */
  stateful: boolean = false;

  /**
   * The number of attempts to retry on consecutive code execution errors. Default to 2.
   */
  errorRetryAttempts: number = 2;

  /**
   * The list of the enclosing delimiters to identify the code blocks.
   * For example, the delimiter ['```python\n', '\n```'] can be
   * used to identify code blocks with the following format:
   * 
   * ```python
   * print("hello")
   * ```
   */
  codeBlockDelimiters: [string, string][] = [
    ['```tool_code\n', '\n```'],
    ['```python\n', '\n```'],
  ];

  /**
   * The delimiters to format the code execution result.
   */
  executionResultDelimiters: [string, string] = ['```tool_output\n', '\n```'];

  /**
   * Creates a new BaseCodeExecutor.
   */
  constructor(options: {
    optimizeDataFile?: boolean;
    stateful?: boolean;
    errorRetryAttempts?: number;
    codeBlockDelimiters?: [string, string][];
    executionResultDelimiters?: [string, string];
  } = {}) {
    this.optimizeDataFile = options.optimizeDataFile ?? this.optimizeDataFile;
    this.stateful = options.stateful ?? this.stateful;
    this.errorRetryAttempts = options.errorRetryAttempts ?? this.errorRetryAttempts;
    this.codeBlockDelimiters = options.codeBlockDelimiters ?? this.codeBlockDelimiters;
    this.executionResultDelimiters = options.executionResultDelimiters ?? this.executionResultDelimiters;
  }

  /**
   * Executes code and return the code execution result.
   * 
   * @param invocationContext The invocation context of the code execution
   * @param codeExecutionInput The code execution input
   * @returns The code execution result
   */
  abstract executeCode(
    invocationContext: InvocationContext,
    codeExecutionInput: CodeExecutionInput
  ): CodeExecutionResult | Promise<CodeExecutionResult>;
}