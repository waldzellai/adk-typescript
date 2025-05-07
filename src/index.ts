// Export core modules of the Google Agent Development Kit (ADK) for TypeScript
// This file mirrors the structure of the Python SDK as closely as possible

// Explicit imports for potentially ambiguous exports
import { CodeExecutionResult } from './google/adk/code_executors';
import { requestProcessor } from './google/adk/auth';
import { BaseTool } from './google/adk/tools';

// Export all modules
export * from './google/adk/agents';
export * from './google/adk/artifacts';
export * from './google/adk/auth';
export * from './google/adk/code_executors';
export * from './google/adk/evaluation';
export * from './google/adk/events';
export * from './google/adk/examples';
export * from './google/adk/flows';
export * from './google/adk/memory';
export * from './google/adk/models';
export * from './google/adk/planners';
export * from './google/adk/sessions';
export * from './google/adk/tools';
export * from './google/adk/version';

// Explicit exports
export {
  CodeExecutionResult, // Primarily from code_executors
  requestProcessor,  // Primarily from auth
  BaseTool           // Primarily from tools
};

// Export version
export { version } from './google/adk/version';