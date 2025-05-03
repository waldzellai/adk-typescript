// Tests for the OpenAI LLM implementation

import { OpenAiLlm } from '../../src/google/adk/models/openai_llm';
import { LlmRequest } from '../../src/google/adk/models/llm_types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Mocked OpenAI response',
                  role: 'assistant'
                },
                finish_reason: 'stop'
              }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15
              }
            })
          }
        }
      };
    })
  };
});

describe('OpenAiLlm', () => {
  let openaiLlm: OpenAiLlm;
  
  beforeEach(() => {
    openaiLlm = new OpenAiLlm({
      model: 'o4-mini-high',
      apiKey: 'test-api-key'
    });
  });
  
  it('should generate content', async () => {
    const request: LlmRequest = {
      contents: [{
        role: 'user',
        parts: [{ text: 'Hello, OpenAI!' }]
      }]
    };
    
    const response = await openaiLlm.generateContent(request);
    
    expect(response.content).toBeDefined();
    expect(response.content?.role).toBe('model');
    expect(response.content?.parts[0].text).toBe('Mocked OpenAI response');
    expect(response.finishReason).toBe('STOP');
    expect(response.usageMetadata).toBeDefined();
    expect(response.usageMetadata?.promptTokenCount).toBe(10);
    expect(response.usageMetadata?.candidatesTokenCount).toBe(5);
    expect(response.usageMetadata?.totalTokenCount).toBe(15);
  });
  
  it('should create a connection', async () => {
    const request: LlmRequest = {
      contents: [{
        role: 'user',
        parts: [{ text: 'Hello, OpenAI!' }]
      }]
    };
    
    const connection = await openaiLlm.connect(request);
    
    expect(connection).toBeDefined();
  });
  
  it('should support o4-mini-high model', () => {
    expect(OpenAiLlm.supportedModels()).toContain('o4-.*');
  });
});
