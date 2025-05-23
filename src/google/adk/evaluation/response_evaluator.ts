// Response evaluator module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the response evaluator functionality from the Python SDK

import { EvaluationResult } from './evaluation_generator';
import { 
  RESPONSE_EVALUATION_SCORE_KEY,
  RESPONSE_MATCH_SCORE_KEY
} from './evaluation_constants';

/**
 * Results of the response evaluation.
 */
export interface ResponseEvaluationResult {
  metrics: Record<string, number>;
  details: ResponseEvaluationDetails[];
}

/**
 * Detailed results for a specific response evaluation.
 */
export interface ResponseEvaluationDetails {
  query: string;
  response: string;
  reference: string;
  match_score: number;
  coherence_score: number;
}

/**
 * Responsible for evaluating agent responses against reference responses.
 */
export class ResponseEvaluator {
  /**
   * Evaluates generated responses against reference answers.
   * 
   * @param evaluationResponse The responses generated by the agent
   * @param criteria Evaluation criteria
   * @param printDetailedResults Whether to print detailed results
   * @returns Evaluation metrics
   */
  static evaluate(
    evaluationResponse: EvaluationResult,
    criteria: Record<string, number>,
    printDetailedResults: boolean = false
  ): ResponseEvaluationResult {
    const details: ResponseEvaluationDetails[] = [];
    let totalMatchScore = 0;
    let totalCoherenceScore = 0;
    let validResponseCount = 0;
    
    // Process each response
    for (const response of evaluationResponse.responses) {
      if (!response.response || !response.reference) {
        continue;
      }
      
      validResponseCount++;
      
      // Calculate ROUGE-1 similarity (simple word overlap for this implementation)
      const matchScore = this.calculateTextSimilarity(response.response, response.reference);
      
      // Calculate coherence (in a real implementation, this would use an LLM)
      const coherenceScore = this.evaluateCoherence(response.query, response.response);
      
      totalMatchScore += matchScore;
      totalCoherenceScore += coherenceScore;
      
      details.push({
        query: response.query,
        response: response.response,
        reference: response.reference,
        match_score: matchScore,
        coherence_score: coherenceScore
      });
    }
    
    // Calculate averages
    const avgMatchScore = validResponseCount > 0 ? totalMatchScore / validResponseCount : 0;
    const avgCoherenceScore = validResponseCount > 0 ? totalCoherenceScore / validResponseCount : 0;
    
    // Create metrics
    const metrics: Record<string, number> = {
      'rouge_1/mean': avgMatchScore,
      'coherence/mean': avgCoherenceScore,
      'valid_responses': validResponseCount
    };
    
    // Print detailed results if requested
    if (printDetailedResults) {
      console.log('Detailed results of response evaluation:');
      console.log('----------------------------------------');
      
      for (const detail of details) {
        console.log(`Query: ${detail.query}`);
        console.log(`Response: ${detail.response}`);
        console.log(`Reference: ${detail.reference}`);
        console.log(`Match Score: ${detail.match_score.toFixed(3)}`);
        console.log(`Coherence Score: ${detail.coherence_score.toFixed(3)}`);
        console.log('----------------------------------------');
      }
      
      console.log(`Average Match Score: ${avgMatchScore.toFixed(3)}`);
      console.log(`Average Coherence Score: ${avgCoherenceScore.toFixed(3)}`);
      console.log(`Valid Responses: ${validResponseCount} / ${evaluationResponse.responses.length}`);
      
      // Check against criteria
      if (RESPONSE_MATCH_SCORE_KEY in criteria) {
        const threshold = criteria[RESPONSE_MATCH_SCORE_KEY];
        console.log(`Match Score Threshold: ${threshold.toFixed(3)}`);
        console.log(`Match Score Result: ${avgMatchScore >= threshold ? 'PASS' : 'FAIL'}`);
      }
      
      if (RESPONSE_EVALUATION_SCORE_KEY in criteria) {
        const threshold = criteria[RESPONSE_EVALUATION_SCORE_KEY];
        console.log(`Coherence Score Threshold: ${threshold.toFixed(3)}`);
        console.log(`Coherence Score Result: ${avgCoherenceScore >= threshold ? 'PASS' : 'FAIL'}`);
      }
    }
    
    return {
      metrics,
      details
    };
  }
  
  /**
   * Calculates the text similarity between two strings.
   * 
   * This is a simplified implementation of ROUGE-1 that uses word overlap.
   * In a real implementation, you would use a proper ROUGE implementation.
   * 
   * @param text1 The first text
   * @param text2 The second text
   * @returns A similarity score between 0 and 1
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
    
    // Calculate intersection size (avoiding spread operator due to downlevelIteration issues)
    const intersection = new Set();
    words1.forEach(word => {
      if (words2.has(word)) intersection.add(word);
    });
    
    // Calculate Jaccard similarity (avoiding spread operator)
    const union = new Set();
    words1.forEach(word => union.add(word));
    words2.forEach(word => union.add(word));
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  /**
   * Evaluates the coherence of a response.
   * 
   * In a real implementation, this would use an LLM to evaluate coherence.
   * This implementation provides a simple heuristic based on length and query relevance.
   * 
   * @param query The user's query
   * @param response The agent's response
   * @returns A coherence score between 0 and 1
   */
  private static evaluateCoherence(query: string, response: string): number {
    // Simple length-based heuristic (longer is generally better, up to a point)
    const lengthScore = Math.min(response.length / 500, 1) * 0.5;
    
    // Simple relevance heuristic based on query term presence
    const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const responseLower = response.toLowerCase();
    let termMatches = 0;
    
    for (const term of queryTerms) {
      if (responseLower.includes(term)) {
        termMatches++;
      }
    }
    
    const relevanceScore = queryTerms.length > 0 
      ? Math.min(termMatches / queryTerms.length * 1.5, 1) * 0.5
      : 0.4; // Default if no meaningful query terms
    
    return lengthScore + relevanceScore;
  }
}