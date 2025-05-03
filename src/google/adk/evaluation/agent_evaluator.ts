// Agent evaluator module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the agent evaluator functionality from the Python SDK

import * as fs from 'fs';
import * as path from 'path';

// Constants for default runs and evaluation criteria
export const NUM_RUNS = 2;
export const TOOL_TRAJECTORY_SCORE_KEY = 'tool_trajectory_avg_score';
export const RESPONSE_EVALUATION_SCORE_KEY = 'response_evaluation_score';
export const RESPONSE_MATCH_SCORE_KEY = 'response_match_score';

export const ALLOWED_CRITERIA = [
  TOOL_TRAJECTORY_SCORE_KEY,
  RESPONSE_EVALUATION_SCORE_KEY,
  RESPONSE_MATCH_SCORE_KEY,
];

export const QUERY_COLUMN = 'query';
export const REFERENCE_COLUMN = 'reference';
export const EXPECTED_TOOL_USE_COLUMN = 'expected_tool_use';

export const DEFAULT_CRITERIA = {
  [TOOL_TRAJECTORY_SCORE_KEY]: 1.0,  // 1-point scale; 1.0 is perfect.
  [RESPONSE_MATCH_SCORE_KEY]: 0.8,  // Rouge-1 text match; 0.8 is default.
};

/**
 * Helper function to load JSON from a file.
 * 
 * @param filePath Path to the JSON file
 * @returns Parsed JSON content
 */
function loadJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * An evaluator for Agents, mainly intended for helping with test cases.
 */
export class AgentEvaluator {
  /**
   * Find the test_config.json file in the same folder as the test file.
   * 
   * @param testFile Path to the test file
   * @returns Evaluation criteria from the config
   */
  static findConfigForTestFile(testFile: string): Record<string, number> {
    const testFolder = path.dirname(testFile);
    const configPath = path.join(testFolder, 'test_config.json');
    
    if (fs.existsSync(configPath)) {
      const configData = loadJson(configPath) as Record<string, unknown>;
      if (configData.criteria && typeof configData.criteria === 'object') {
        return configData.criteria as Record<string, number>;
      } else {
        throw new Error(`Invalid format for test_config.json at ${configPath}. Expected a 'criteria' dictionary.`);
      }
    }
    
    return DEFAULT_CRITERIA;
  }

  /**
   * Evaluates an Agent given eval data.
   * 
   * @param agentModule The path to TypeScript module that contains the definition of the agent
   * @param evalDatasetFilePathOrDir The eval data set path or directory
   * @param numRuns Number of times all entries in the eval dataset should be assessed
   * @param agentName The name of the agent
   * @param initialSessionFile File that contains initial session state
   */
  static async evaluate(
    agentModule: string,
    evalDatasetFilePathOrDir: string,
    numRuns: number = NUM_RUNS,
    agentName?: string,
    initialSessionFile?: string
  ): Promise<void> {
    const testFiles: string[] = [];
    
    if (fs.existsSync(evalDatasetFilePathOrDir) && fs.statSync(evalDatasetFilePathOrDir).isDirectory()) {
      // Recursive function to find all .test.json files
      const findTestFiles = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            findTestFiles(filePath);
          } else if (file.endsWith('.test.json')) {
            testFiles.push(filePath);
          }
        }
      };
      
      findTestFiles(evalDatasetFilePathOrDir);
    } else {
      testFiles.push(evalDatasetFilePathOrDir);
    }

    let initialSessionState = {};
    if (initialSessionFile) {
      const sessionData = loadJson(initialSessionFile) as Record<string, unknown>;
      initialSessionState = sessionData.state || {};
    }

    // Dynamically import the evaluation classes
    const { EvaluationGenerator } = await import('./evaluation_generator');
    const { ResponseEvaluator } = await import('./response_evaluator');
    const { TrajectoryEvaluator } = await import('./trajectory_evaluator');

    for (const testFile of testFiles) {
      const dataset = this.loadDataset(testFile)[0];
      const criteria = this.findConfigForTestFile(testFile);

      this.validateInput([dataset], criteria);

      const evaluationResponse = await EvaluationGenerator.generateResponses(
        [dataset as Record<string, unknown>[]],
        agentModule,
        numRuns,
        agentName,
        { state: initialSessionState }
      );

      if (this.responseEvaluationRequired(criteria, [dataset])) {
        const responseResult = ResponseEvaluator.evaluate(
          evaluationResponse,
          criteria,
          true // Print detailed results
        );
        
        console.log('Response Evaluation Results:');
        console.log(`Average match score: ${responseResult.metrics['rouge_1/mean'].toFixed(3)}`);
        console.log(`Average coherence score: ${responseResult.metrics['coherence/mean'].toFixed(3)}`);
      }

      if (this.trajectoryEvaluationRequired(criteria, [dataset])) {
        const trajectoryResult = TrajectoryEvaluator.evaluate(
          evaluationResponse,
          criteria,
          true // Print detailed results
        );
        
        console.log('Trajectory Evaluation Results:');
        console.log(`Average trajectory score: ${trajectoryResult.score.toFixed(3)}`);
      }
    }
  }

  /**
   * Load datasets from files or directories.
   * 
   * @param inputData Input data path(s)
   * @returns Loaded datasets
   */
  private static loadDataset(inputData: string | string[] | unknown[]): unknown[][] {
    const loadJsonFile = (filePath: string): unknown[] => {
      const data = loadJson(filePath);
      if (!Array.isArray(data) || !data.every(d => typeof d === 'object')) {
        throw new Error(`${filePath} must contain a list of dictionaries.`);
      }
      return data;
    };

    if (typeof inputData === 'string') {
      if (fs.existsSync(inputData) && fs.statSync(inputData).isDirectory()) {
        const testFiles: string[] = [];
        // Find all .test.json files in the directory
        const findTestFiles = (dir: string) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              findTestFiles(filePath);
            } else if (file.endsWith('.test.json')) {
              testFiles.push(filePath);
            }
          }
        };
        
        findTestFiles(inputData);
        return testFiles.map(f => loadJsonFile(f));
      } else if (fs.existsSync(inputData) && fs.statSync(inputData).isFile()) {
        return [loadJsonFile(inputData)];
      } else {
        throw new Error(`Input path ${inputData} is invalid.`);
      }
    } else if (Array.isArray(inputData)) {
      if (inputData.every(i => typeof i === 'string' && fs.existsSync(i) && fs.statSync(i).isFile())) {
        return inputData.map(i => loadJsonFile(i as string));
      }
      throw new TypeError('Input list must contain valid file paths.');
    }
    
    throw new TypeError('Invalid input type for dataset loading.');
  }

  /**
   * Validates that the evaluation criteria align with the provided dataset.
   * 
   * @param evalDataset Evaluation dataset
   * @param criteria Evaluation criteria
   */
  private static validateInput(evalDataset: unknown[], criteria: Record<string, number>): void {
    if (!evalDataset || evalDataset.length === 0) {
      throw new Error('The evaluation dataset is None or empty.');
    }

    // Check criteria keys
    for (const key in criteria) {
      if (!ALLOWED_CRITERIA.includes(key)) {
        throw new Error(`Invalid criteria key: ${key}. Expected one of ${ALLOWED_CRITERIA}.`);
      }
    }

    const sample = evalDataset[0];
    
    if (!Array.isArray(sample)) {
      throw new Error(`Each evaluation dataset sample must be a list of dictionaries. But it's ${JSON.stringify(evalDataset)}`);
    }
    
    if (sample.length === 0) {
      throw new Error('The evaluation dataset sample is empty.');
    }
    
    const firstQuery = sample[0];
    
    if (!firstQuery || typeof firstQuery !== 'object' || firstQuery === null) {
      throw new Error(`Each dataset entry must be a dictionary. But it's ${JSON.stringify(firstQuery)}`);
    }
    
    const typedFirstQuery = firstQuery as Record<string, unknown>;

    // Check tool trajectory criteria
    if (TOOL_TRAJECTORY_SCORE_KEY in criteria) {
      if (!(QUERY_COLUMN in typedFirstQuery) || !(EXPECTED_TOOL_USE_COLUMN in typedFirstQuery)) {
        throw new Error(
          `Samples for ${TOOL_TRAJECTORY_SCORE_KEY} must include '${QUERY_COLUMN}' and '${EXPECTED_TOOL_USE_COLUMN}' keys. The sample is ${JSON.stringify(sample)}.`
        );
      }
    }

    // Check response evaluation criteria
    if (RESPONSE_EVALUATION_SCORE_KEY in criteria) {
      if (!(QUERY_COLUMN in typedFirstQuery)) {
        throw new Error(
          `Samples for ${RESPONSE_EVALUATION_SCORE_KEY} must include '${QUERY_COLUMN}' key. The sample is ${JSON.stringify(sample)}.`
        );
      }
    }

    // Check response match criteria
    if (RESPONSE_MATCH_SCORE_KEY in criteria) {
      if (!(QUERY_COLUMN in typedFirstQuery) || !(REFERENCE_COLUMN in typedFirstQuery)) {
        throw new Error(
          `Samples for ${RESPONSE_MATCH_SCORE_KEY} must include '${QUERY_COLUMN}' and '${REFERENCE_COLUMN}' keys. The sample is ${JSON.stringify(sample)}.`
        );
      }
    }
  }

  /**
   * Infers evaluation criteria based on the provided dataset.
   * 
   * @param evalDataset Evaluation dataset
   * @returns Inferred evaluation criteria
   */
  private static getInferCriteria(evalDataset: Record<string, unknown>[][]): Record<string, number> {
    const inferredCriteria: Record<string, number> = {};
    const sample = evalDataset[0][0];

    if (QUERY_COLUMN in sample && EXPECTED_TOOL_USE_COLUMN in sample) {
      inferredCriteria[TOOL_TRAJECTORY_SCORE_KEY] = DEFAULT_CRITERIA[TOOL_TRAJECTORY_SCORE_KEY];
    }

    if (QUERY_COLUMN in sample && REFERENCE_COLUMN in sample) {
      inferredCriteria[RESPONSE_MATCH_SCORE_KEY] = DEFAULT_CRITERIA[RESPONSE_MATCH_SCORE_KEY];
    }

    return inferredCriteria;
  }

  /**
   * Generates evaluation responses by running the agent module multiple times.
   * 
   * @param agentModule Agent module path
   * @param evalDataset Evaluation dataset
   * @param numRuns Number of runs
   * @param agentName Agent name
   * @param _initialSession Initial session state
   * @returns Evaluation responses
   */
  private static generateResponses(
    agentModule: string,
    evalDataset: unknown[],
    numRuns: number,
    agentName?: string,
    _initialSession: Record<string, unknown> = {}
  ): unknown {
    // This is a placeholder - in a real implementation, this would use EvaluationGenerator
    return { responses: [], metrics: {} };
  }

  /**
   * Checks if response evaluation is needed.
   * 
   * @param criteria Evaluation criteria
   * @param evalDataset Evaluation dataset
   * @returns Whether response evaluation is required
   */
  private static responseEvaluationRequired(criteria: Record<string, number>, evalDataset: unknown[]): boolean {
    if (!Array.isArray(evalDataset) || !evalDataset.length || 
        !Array.isArray(evalDataset[0]) || !evalDataset[0].length ||
        typeof evalDataset[0][0] !== 'object' || evalDataset[0][0] === null) {
      return false;
    }
    
    const firstEntry = evalDataset[0][0] as Record<string, unknown>;
    
    return REFERENCE_COLUMN in firstEntry &&
      (RESPONSE_EVALUATION_SCORE_KEY in criteria || RESPONSE_MATCH_SCORE_KEY in criteria);
  }

  /**
   * Checks if trajectory evaluation is needed.
   * 
   * @param evaluationCriteria Evaluation criteria
   * @param evalDataset Evaluation dataset
   * @returns Whether trajectory evaluation is required
   */
  private static trajectoryEvaluationRequired(evaluationCriteria: Record<string, number>, evalDataset: unknown[]): boolean {
    if (!Array.isArray(evalDataset) || !evalDataset.length || 
        !Array.isArray(evalDataset[0]) || !evalDataset[0].length ||
        typeof evalDataset[0][0] !== 'object' || evalDataset[0][0] === null) {
      return false;
    }
    
    const firstEntry = evalDataset[0][0] as Record<string, unknown>;
    
    return EXPECTED_TOOL_USE_COLUMN in firstEntry &&
      TOOL_TRAJECTORY_SCORE_KEY in evaluationCriteria;
  }

  /**
   * Evaluates response scores and raises an assertion error if they don't meet the criteria.
   * 
   * @param agentModule Agent module path
   * @param evaluationResponse Evaluation response
   * @param criteria Evaluation criteria
   */
  private static async evaluateResponseScores(
    agentModule: string,
    evaluationResponse: import('./evaluation_generator').EvaluationResult,
    criteria: Record<string, number>
  ): Promise<void> {
    const { ResponseEvaluator } = await import('./response_evaluator');
    
    const results = ResponseEvaluator.evaluate(evaluationResponse, criteria, false);
    
    this.assertScore(
      results.metrics,
      'coherence/mean',
      criteria[RESPONSE_EVALUATION_SCORE_KEY],
      'Average response evaluation score',
      agentModule
    );

    this.assertScore(
      results.metrics,
      'rouge_1/mean',
      criteria[RESPONSE_MATCH_SCORE_KEY],
      'Average response match score',
      agentModule
    );
  }

  /**
   * Evaluates tool trajectory scores and raises an assertion error if they don't meet the criteria.
   * 
   * @param agentModule Agent module path
   * @param evaluationResponse Evaluation response
   * @param criteria Evaluation criteria
   */
  private static async evaluateToolTrajectory(
    agentModule: string,
    evaluationResponse: import('./evaluation_generator').EvaluationResult,
    criteria: Record<string, number>
  ): Promise<void> {
    const { TrajectoryEvaluator } = await import('./trajectory_evaluator');
    
    const results = TrajectoryEvaluator.evaluate(evaluationResponse, criteria, false);
    
    this.assertScore(
      { [TOOL_TRAJECTORY_SCORE_KEY]: results.score },
      TOOL_TRAJECTORY_SCORE_KEY,
      criteria[TOOL_TRAJECTORY_SCORE_KEY],
      'Average tool trajectory evaluation score',
      agentModule
    );
  }

  /**
   * Asserts that a metric meets the specified threshold.
   * 
   * @param metrics Metrics
   * @param metricKey Metric key
   * @param threshold Threshold
   * @param description Description
   * @param agentModule Agent module path
   */
  private static assertScore(
    metrics: Record<string, number>,
    metricKey: string,
    threshold: number,
    description: string,
    agentModule: string
  ): void {
    if (metricKey in metrics) {
      const actualScore = metrics[metricKey];
      console.assert(
        actualScore >= threshold,
        `${description} for ${agentModule} is lower than expected. Expected >= ${threshold}, but got ${actualScore}.`
      );
    }
  }
}