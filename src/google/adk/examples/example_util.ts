// Example utility module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the example utility functionality from the Python SDK

import { Example } from './example';
import { BaseExampleProvider } from './base_example_provider';
import { Session } from '../sessions/session';

// Constant parts of the example string
const EXAMPLES_INTRO =
    '<EXAMPLES>\nBegin few-shot\nThe following are examples of user queries and' +
    ' model responses using the available tools.\n\n';
const EXAMPLES_END = 'End few-shot\n<EXAMPLES>';
const EXAMPLE_START = 'EXAMPLE {}:\nBegin example\n';
const EXAMPLE_END = 'End example\n\n';
const USER_PREFIX = '[user]\n';
const MODEL_PREFIX = '[model]\n';
const FUNCTION_PREFIX = '```\n';
const FUNCTION_CALL_PREFIX = '```tool_code\n';
const FUNCTION_CALL_SUFFIX = '\n```\n';
const FUNCTION_RESPONSE_PREFIX = '```tool_outputs\n';
const FUNCTION_RESPONSE_SUFFIX = '\n```\n';

/**
 * Converts a list of examples to a string that can be used in a system instruction.
 * 
 * @param examples The list of examples to convert
 * @param model The model name
 * @returns A string representation of the examples
 */
export function convertExamplesToText(
  examples: Example[],
  model?: string
): string {
  let examplesStr = '';
  
  for (let exampleNum = 0; exampleNum < examples.length; exampleNum++) {
    const example = examples[exampleNum];
    let output = `${EXAMPLE_START.replace('{}', String(exampleNum + 1))}${USER_PREFIX}`;
    
    if (example.input && example.input.parts) {
      output += example.input.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n') + '\n';
    }

    const gemini2 = !model || model.includes('gemini-2');
    let previousRole: string | null = null;
    
    for (const content of example.output) {
      const role = content.role === 'model' ? MODEL_PREFIX : USER_PREFIX;
      if (role !== previousRole) {
        output += role;
      }
      previousRole = role;
      
      for (const part of content.parts) {
        if (part.functionCall) {
          const args: string[] = [];
          // Convert function call part to TypeScript-like function call
          for (const [k, v] of Object.entries(part.functionCall.args)) {
            if (typeof v === 'string') {
              args.push(`${k}='${v}'`);
            } else {
              args.push(`${k}=${v}`);
            }
          }
          const prefix = gemini2 ? FUNCTION_PREFIX : FUNCTION_CALL_PREFIX;
          output += `${prefix}${part.functionCall.name}(${args.join(', ')})${FUNCTION_CALL_SUFFIX}`;
        }
        // Convert function response part to JSON string
        else if (part.functionResponse) {
          const prefix = gemini2 ? FUNCTION_PREFIX : FUNCTION_RESPONSE_PREFIX;
          output += `${prefix}${JSON.stringify(part.functionResponse)}${FUNCTION_RESPONSE_SUFFIX}`;
        }
        else if (part.text) {
          output += `${part.text}\n`;
        }
      }
    }

    output += EXAMPLE_END;
    examplesStr += output;
  }

  return `${EXAMPLES_INTRO}${examplesStr}${EXAMPLES_END}`;
}

/**
 * Gets the latest message from the user.
 * 
 * @param session The session to get the latest message from
 * @returns The latest message from the user, or an empty string if not found
 */
export function getLatestMessageFromUser(session: Session): string {
  const events = session.events;
  if (!events || events.length === 0) {
    return '';
  }

  const event = events[events.length - 1];
  if (event.getAuthor() === 'user' && event.getFunctionResponses().length === 0) {
    if (event.getContent() && event.getContent()!.parts && event.getContent()!.parts.length > 0) {
      const firstPart = event.getContent()!.parts[0];
      if (firstPart.text) {
        return firstPart.text;
      }
    }
    
    console.warn('No message from user for fetching example.');
  }

  return '';
}

/**
 * Builds example system instructions.
 * 
 * @param examples The examples or example provider
 * @param query The query to get examples for
 * @param model The model name
 * @returns A string representation of the examples
 */
export function buildExampleSi(
  examples: Example[] | BaseExampleProvider,
  query: string,
  model?: string
): string | Promise<string> {
  if (Array.isArray(examples)) {
    return convertExamplesToText(examples, model);
  }
  
  if (examples instanceof BaseExampleProvider) {
    const examplesResult = examples.getExamples(query);
    
    if (examplesResult instanceof Promise) {
      return examplesResult.then(resolvedExamples => 
        convertExamplesToText(resolvedExamples, model)
      );
    }
    
    return convertExamplesToText(examplesResult, model);
  }

  throw new Error('Invalid example configuration');
}