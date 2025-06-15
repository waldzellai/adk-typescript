// Code execution utilities for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the code execution utilities from the Python SDK

import { Content, Part } from '@google/genai';

/**
 * A structure that contains a file name and its content.
 */
export class File {
  /**
   * The name of the file with file extension (e.g., "file.csv").
   */
  name: string;

  /**
   * The base64-encoded bytes of the file content.
   */
  content: string;

  /**
   * The mime type of the file (e.g., "image/png").
   */
  mimeType: string;

  /**
   * Creates a new File.
   */
  constructor(data: {
    name: string;
    content: string;
    mimeType?: string;
  }) {
    this.name = data.name;
    this.content = data.content;
    this.mimeType = data.mimeType || 'text/plain';
  }
}

/**
 * A structure that contains the input of code execution.
 */
export class CodeExecutionInput {
  /**
   * The code to execute.
   */
  code: string;

  /**
   * The input files available to the code.
   */
  inputFiles: File[];

  /**
   * The execution ID for the stateful code execution.
   */
  executionId?: string;

  /**
   * Creates a new CodeExecutionInput.
   */
  constructor(data: {
    code: string;
    inputFiles?: File[];
    executionId?: string;
  }) {
    this.code = data.code;
    this.inputFiles = data.inputFiles || [];
    this.executionId = data.executionId;
  }
}

/**
 * A structure that contains the result of code execution.
 */
export class CodeExecutionResult {
  /**
   * The standard output of the code execution.
   */
  stdout: string;

  /**
   * The standard error of the code execution.
   */
  stderr: string;

  /**
   * The output files from the code execution.
   */
  outputFiles: File[];

  /**
   * Creates a new CodeExecutionResult.
   */
  constructor(data: {
    stdout?: string;
    stderr?: string;
    outputFiles?: File[];
  }) {
    this.stdout = data.stdout || '';
    this.stderr = data.stderr || '';
    this.outputFiles = data.outputFiles || [];
  }
}

/**
 * Utility functions for code execution.
 */
export class CodeExecutionUtils {
  /**
   * Gets the file content as a base64-encoded string.
   * 
   * @param data The file content as a string
   * @returns The file content as a base64-encoded string
   */
  static getEncodedFileContent(data: string): string {
    // Helper function to check if a string is base64 encoded
    function isBase64Encoded(data: string): boolean {
      try {
        return btoa(atob(data)) === data;
      } catch (error) {
        return false;
      }
    }

    return isBase64Encoded(data) ? data : btoa(data);
  }

  /**
   * Extracts the first code block from the content and truncates everything after it.
   * 
   * @param content The mutable content to extract the code from
   * @param codeBlockDelimiters The list of the enclosing delimiters to identify the code blocks
   * @returns The first code block if found, otherwise undefined
   */
  static extractCodeAndTruncateContent(
    content: Content,
    codeBlockDelimiters: [string, string][]
  ): string | undefined {
    if (!content || !content.parts || content.parts.length === 0) {
      return undefined;
    }

    // Extract the code from the executable code parts if there're no associated
    // code execution result parts.
    for (let idx = 0; idx < content.parts.length; idx++) {
      const part = content.parts[idx];
      if (
        part.executableCode &&
        (idx === content.parts.length - 1 || !content.parts[idx + 1].codeExecutionResult)
      ) {
        content.parts = content.parts.slice(0, idx + 1);
        return part.executableCode.code;
      }
    }

    // Extract the code from the text parts.
    const textParts = content.parts.filter(p => p.text);
    if (textParts.length === 0) {
      return undefined;
    }

    const firstTextPart = { ...textParts[0] };
    const responseText = textParts.map(p => p.text).join('\n');

    // Find the first code block.
    for (const [leadingDelimiter, trailingDelimiter] of codeBlockDelimiters) {
      const leadingIndex = responseText.indexOf(leadingDelimiter);
      if (leadingIndex === -1) continue;

      const codeStartIndex = leadingIndex + leadingDelimiter.length;
      const trailingIndex = responseText.indexOf(trailingDelimiter, codeStartIndex);
      if (trailingIndex === -1) continue;

      const codeStr = responseText.substring(codeStartIndex, trailingIndex);
      if (!codeStr) continue;

      content.parts = [];
      if (leadingIndex > 0) {
        firstTextPart.text = responseText.substring(0, leadingIndex);
        content.parts.push(firstTextPart as Part);
      }
      content.parts.push(
        CodeExecutionUtils.buildExecutableCodePart(codeStr)
      );
      return codeStr;
    }

    return undefined;
  }

  /**
   * Builds an executable code part with code string.
   * 
   * @param code The code string
   * @returns The constructed executable code part
   */
  static buildExecutableCodePart(code: string): Part {
    return {
      executableCode: {
        code,
        // @ts-expect-error: Type '"PYTHON"' is not assignable to type 'Language | undefined'.
        language: 'PYTHON'
      }
    };
  }

  /**
   * Builds the code execution result part from the code execution result.
   * 
   * @param codeExecutionResult The code execution result
   * @returns The constructed code execution result part
   */
  static buildCodeExecutionResultPart(
    codeExecutionResult: CodeExecutionResult
  ): Part {
    if (codeExecutionResult.stderr) {
      return {
        codeExecutionResult: {
          // @ts-expect-error: Type '"OUTCOME_FAILED"' is not assignable to type 'Outcome | undefined'.
          outcome: 'OUTCOME_FAILED',
          output: codeExecutionResult.stderr
        }
      };
    }

    const finalResult: string[] = [];
    if (codeExecutionResult.stdout || codeExecutionResult.outputFiles.length === 0) {
      finalResult.push(
        'Code execution result:\n' + codeExecutionResult.stdout + '\n'
      );
    }
    if (codeExecutionResult.outputFiles.length > 0) {
      finalResult.push(
        'Saved artifacts:\n' +
        codeExecutionResult.outputFiles.map(f => `\`${f.name}\``).join(',')
      );
    }

    return {
      codeExecutionResult: {
        // @ts-expect-error: Type '"OUTCOME_OK"' is not assignable to type 'Outcome | undefined'.
        outcome: 'OUTCOME_OK',
        output: finalResult.join('\n\n')
      }
    };
  }

  /**
   * Converts the code execution parts to text parts in a Content.
   * 
   * @param content The mutable content to convert the code execution parts to text parts
   * @param codeBlockDelimiter The delimiter to format the code block
   * @param executionResultDelimiters The delimiter to format the code execution result
   */
  static convertCodeExecutionParts(
    content: Content,
    codeBlockDelimiter: [string, string],
    executionResultDelimiters: [string, string]
  ): void {
    if (!content.parts || content.parts.length === 0) {
      return;
    }

    // Handle the conversion of trailing executable code parts.
    if (content.parts[content.parts.length - 1].executableCode) {
      content.parts[content.parts.length - 1] = {
        text: (
          codeBlockDelimiter[0] +
          content.parts[content.parts.length - 1].executableCode!.code +
          codeBlockDelimiter[1]
        )
      };
    }
    // Handle the conversion of trailing code execution result parts.
    // Skip if the Content has multiple parts, which means the Content is
    // likely generated by the model.
    else if (
      content.parts.length === 1 &&
      content.parts[content.parts.length - 1].codeExecutionResult
    ) {
      content.parts[content.parts.length - 1] = {
        text: (
          executionResultDelimiters[0] +
          content.parts[content.parts.length - 1].codeExecutionResult!.output +
          executionResultDelimiters[1]
        )
      };
      content.role = 'user';
    }
  }
}