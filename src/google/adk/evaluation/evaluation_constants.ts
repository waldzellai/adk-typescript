// Evaluation constants module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the evaluation constants from the Python SDK

// Evaluation keys
export const TOOL_TRAJECTORY_SCORE_KEY = 'tool_trajectory_avg_score';
export const RESPONSE_EVALUATION_SCORE_KEY = 'response_evaluation_score';
export const RESPONSE_MATCH_SCORE_KEY = 'response_match_score';

// Data column keys
export const QUERY_COLUMN = 'query';
export const REFERENCE_COLUMN = 'reference';
export const EXPECTED_TOOL_USE_COLUMN = 'expected_tool_use';

// Default criteria thresholds
export const DEFAULT_CRITERIA = {
  [TOOL_TRAJECTORY_SCORE_KEY]: 1.0,  // 1-point scale; 1.0 is perfect.
  [RESPONSE_MATCH_SCORE_KEY]: 0.8,  // Rouge-1 text match; 0.8 is default.
};

// Allowed criteria keys
export const ALLOWED_CRITERIA = [
  TOOL_TRAJECTORY_SCORE_KEY,
  RESPONSE_EVALUATION_SCORE_KEY,
  RESPONSE_MATCH_SCORE_KEY,
];

// Default number of evaluation runs
export const NUM_RUNS = 2;