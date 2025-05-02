// Google Agent Development Kit (ADK) - TypeScript
// This file serves as the entry point for the SDK, mirroring the Python SDK structure

import { version } from './version';
import { LlmAgent } from './agents/llm_agent';
import { Runner } from './runners';

// Export core components
export { version };
export const Agent = LlmAgent; // Default agent type mirroring Python SDK
export { Runner };
