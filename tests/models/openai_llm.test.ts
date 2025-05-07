import { OpenAiLlm } from '../../src/google/adk/models/openai_llm';
import { LlmRequest, AdkPart } from '../../src/google/adk/models/base_llm';

// Set a dummy API key for the entire test suite
const originalApiKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock the OpenAI API client
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn((params: any) => {
            if (params.stream) {
              // Mock streaming response
              return (async function* () {
                yield { choices: [{ delta: { content: 'HardcodedStreamChunk1' }, finish_reason: null }] };
                yield { choices: [{ delta: { content: 'HardcodedStreamChunk2' }, finish_reason: 'stop' }] };
              })();
            } else {
              // Mock non-streaming response
              return Promise.resolve({
                choices: [{ message: { content: 'HardcodedTestString', role: 'assistant' }, finish_reason: 'stop' }],
                usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
              });
            }
          }),
        },
      },
    })),
  };
});

describe('OpenAiLlm', () => {
  let openaiLlm: OpenAiLlm;

  beforeAll(() => {
    // If truly necessary to restore after all tests in this file, do it here.
    // For now, the top-level set should suffice for these tests.
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalApiKey; // Restore original API key after all tests in this file
  });

  beforeEach(() => {
    openaiLlm = new OpenAiLlm({ model: 'gpt-3.5-turbo' });
  });

  it('should generate content successfully', async () => {
    const request: LlmRequest = {
      contents: [{ parts: [{ text: 'Hello' }], role: 'user' }],
      name: 'test-request' // Added name as it's a required property in LlmRequest
    };
    
    const response = await openaiLlm.generateContent(request);
    
    expect(response.candidates).toBeDefined();
    expect(response.candidates!.length).toBeGreaterThan(0); 
    const candidate = response.candidates![0];
    expect(candidate.content).toBeDefined();
    expect(candidate.content.role).toBe('model');
    expect(candidate.content.parts).toBeDefined();
    if (candidate.content.parts) {
      expect(candidate.content.parts.length).toBeGreaterThan(0);
      candidate.content.parts.forEach((part: AdkPart) => {
        if (part.text) {
          console.log('OpenAI LLM Response Part Text:', part.text);
        }
      });
      expect(candidate.content.parts[0].text!).toBe('HardcodedTestString');
    }
    expect(response.finishReason).toBe('STOP'); // This comes from the mapped candidate
    expect(response.usageMetadata).toBeDefined();
    expect(response.usageMetadata?.promptTokenCount).toBe(10);
    expect(response.usageMetadata?.candidatesTokenCount).toBe(20); // Ensure this is correctly mapped if applicable
    expect(response.usageMetadata?.totalTokenCount).toBe(30);
  });

  it('should handle streaming content generation', async () => {
    const request: LlmRequest = {
      contents: [{ parts: [{ text: 'Stream hello' }], role: 'user' }],
      name: 'test-stream-request' // Added name
    };

    let firstChunk = true;
    let accumulatedText = '';

    for await (const chunk of openaiLlm.generateContentAsync(request, true)) {
      expect(chunk.candidates).toBeDefined();
      expect(chunk.candidates!.length).toBeGreaterThan(0);
      const candidate = chunk.candidates![0];
      expect(candidate.content).toBeDefined();
      expect(candidate.content.role).toBe('model');
      expect(candidate.content.parts).toBeDefined();
      if (candidate.content.parts) {
        expect(candidate.content.parts.length).toBeGreaterThan(0);
        
        // Accumulate text from parts
        candidate.content.parts.forEach((part: AdkPart) => {
          if (part.text) {
            accumulatedText += part.text;
          }
        });
      }
      if (firstChunk) {
        // For this mock, the first chunk contains the whole message.
        // More sophisticated mocks might break it into smaller pieces.
        expect(accumulatedText).toBe('HardcodedStreamChunk1');
        firstChunk = false;
      }
      // Potentially check finishReason on the last chunk if the mock provides it
    }
    expect(firstChunk).toBe(false); // Ensure the loop ran
    expect(accumulatedText).toBe('HardcodedStreamChunk1HardcodedStreamChunk2'); // Verify full content
  });

});