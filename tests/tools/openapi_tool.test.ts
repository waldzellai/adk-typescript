// Tests for the OpenAPI tool implementation

import { OpenAPIToolset } from '../../src/google/adk/tools/openapi_tool/openapi_toolset';
import { RestApiTool } from '../../src/google/adk/tools/openapi_tool/openapi_spec_parser/rest_api_tool';
import { ToolContext } from '../../src/google/adk/tools/tool_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';

// Define interface for API response
interface ApiResponse {
  status: number;
  data: Record<string, unknown>;
}

// Mock fetch
jest.mock('node-fetch', () => jest.fn().mockImplementation(() => 
  Promise.resolve({
    status: 200,
    statusText: 'OK',
    headers: {
      get: () => 'application/json'
    },
    json: () => Promise.resolve({ message: 'success' }),
    text: () => Promise.resolve('success')
  })
));

describe('OpenAPIToolset', () => {
  // Create a mock ToolContext
  const createToolContext = () => {
    // Create minimal mock agent
    const mockAgent = {
      name: 'TestAgent',
      description: '',
      getTools: jest.fn().mockReturnValue([]),
      run: jest.fn(),
      runAsync: jest.fn(),
    } as unknown as BaseAgent;

    const invocationContext = new InvocationContext({
      agent: mockAgent,
      runConfig: new RunConfig({}),
    });
    
    return new ToolContext(invocationContext);
  };

  // Simple OpenAPI spec for testing
  const simpleOpenApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'https://api.example.com'
      }
    ],
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List all pets',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'How many items to return',
              required: false,
              schema: {
                type: 'integer',
                format: 'int32'
              }
            }
          ],
          responses: {
            '200': {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'integer'
                        },
                        name: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    type: {
                      type: 'string'
                    }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Pet created'
            }
          }
        }
      },
      '/pets/{petId}': {
        get: {
          operationId: 'getPetById',
          summary: 'Get a pet by ID',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Pet details'
            }
          }
        }
      }
    }
  };

  describe('constructor', () => {
    it('should create an OpenAPIToolset from a spec dictionary', () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      expect(toolset).toBeDefined();
      expect(toolset.getTools()).toBeDefined();
      expect(toolset.getTools().length).toBe(3); // 3 operations in the spec
    });

    it('should create an OpenAPIToolset from a spec string', () => {
      const toolset = new OpenAPIToolset({
        specStr: JSON.stringify(simpleOpenApiSpec),
        specStrType: 'json'
      });
      
      expect(toolset).toBeDefined();
      expect(toolset.getTools()).toBeDefined();
      expect(toolset.getTools().length).toBe(3); // 3 operations in the spec
    });
  });

  describe('getTools', () => {
    it('should return all tools', () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const tools = toolset.getTools();
      expect(tools.length).toBe(3);
      expect(tools[0]).toBeInstanceOf(RestApiTool);
      expect(tools[1]).toBeInstanceOf(RestApiTool);
      expect(tools[2]).toBeInstanceOf(RestApiTool);
    });
  });

  describe('getTool', () => {
    it('should get a tool by name', () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const tool = toolset.getTool('listPets');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('listPets');
      expect(tool?.description).toBe('List all pets');
    });

    it('should return undefined for a non-existent tool', () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const tool = toolset.getTool('nonExistentTool');
      expect(tool).toBeUndefined();
    });
  });

  describe('RestApiTool', () => {
    it('should have a proper function declaration', () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const tool = toolset.getTool('listPets');
      // @ts-expect-error - accessing protected method
      const declaration = tool?.getDeclaration();
      
      expect(declaration).toBeDefined();
      expect(declaration?.name).toBe('listPets');
      expect(declaration?.parameters?.properties?.limit).toBeDefined();
    });

    it('should handle path parameters', async () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const tool = toolset.getTool('getPetById');
      expect(tool).toBeDefined();
      
      // Execute the tool
      const toolContext = createToolContext();
      const result = await tool?.runAsync({ petId: 123 }, toolContext);
      
      expect(result).toBeDefined();
      expect((result as ApiResponse).status).toBe(200);
      expect((result as ApiResponse).data).toEqual({ message: 'success' });
    });

    it('should handle query parameters and request body', async () => {
      const toolset = new OpenAPIToolset({
        specDict: simpleOpenApiSpec
      });
      
      const toolContext = createToolContext();
      
      // Test listPets with query parameter
      const listTool = toolset.getTool('listPets');
      const listResult = await listTool?.runAsync({ limit: 10 }, toolContext);
      expect(listResult).toBeDefined();
      expect((listResult as ApiResponse).status).toBe(200);
      
      // Test createPet with request body
      const createTool = toolset.getTool('createPet');
      const createResult = await createTool?.runAsync(
        { body: { name: 'Fluffy', type: 'cat' } }, 
        toolContext
      );
      expect(createResult).toBeDefined();
      expect((createResult as ApiResponse).status).toBe(200);
    });
  });
});