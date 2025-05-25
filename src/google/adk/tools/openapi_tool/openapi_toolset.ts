// OpenAPI toolset for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the OpenAPI toolset functionality from the Python SDK

import { AuthCredential } from '../../auth/auth_credential';
import { AuthScheme } from '../../auth/auth_schemes';
import { OpenApiSpecParser } from './openapi_spec_parser/openapi_spec_parser';
import { RestApiTool } from './openapi_spec_parser/rest_api_tool';
import { ParsedOperation } from './openapi_spec_parser/operation_parser';

/**
 * Class for parsing OpenAPI spec into a list of RestApiTool.
 *
 * Usage:
 * ```typescript
 * // Initialize OpenAPI toolset from a spec string.
 * const openApiToolset = new OpenAPIToolset({
 *   specStr: openApiSpecStr,
 *   specStrType: "json"
 * });
 * 
 * // Or, initialize OpenAPI toolset from a spec dictionary.
 * const openApiToolset = new OpenAPIToolset({
 *   specDict: openApiSpecDict
 * });
 *
 * // Add all tools to an agent.
 * const agent = new Agent({
 *   tools: [...openApiToolset.getTools()]
 * });
 * 
 * // Or, add a single tool to an agent.
 * const agent = new Agent({
 *   tools: [openApiToolset.getTool('tool_name')]
 * });
 * ```
 */
export class OpenAPIToolset {
  /**
   * The list of REST API tools parsed from the OpenAPI spec.
   */
  private tools: RestApiTool[] = [];

  /**
   * Creates a new OpenAPIToolset.
   * 
   * @param options The options for the OpenAPI toolset
   */
  constructor(options: {
    /**
     * The OpenAPI spec dictionary. If provided, it will be used instead of loading the spec from a string.
     */
    specDict?: Record<string, unknown>;
    
    /**
     * The OpenAPI spec string in JSON or YAML format. It will be used when specDict is not provided.
     */
    specStr?: string;
    
    /**
     * The type of the OpenAPI spec string. Can be "json" or "yaml".
     */
    specStrType?: 'json' | 'yaml';
    
    /**
     * The auth scheme to use for all tools.
     */
    authScheme?: AuthScheme;
    
    /**
     * The auth credential to use for all tools.
     */
    authCredential?: AuthCredential;
  }) {
    const { specDict, specStr, specStrType = 'json', authScheme, authCredential } = options;
    
    // Load the spec from string if no dictionary is provided
    const parsedSpec = specDict || this.loadSpec(specStr, specStrType);
    
    if (!parsedSpec) {
      throw new Error('Either specDict or specStr must be provided');
    }
    
    // Parse the spec into tools
    this.tools = this.parse(parsedSpec);
    
    // Configure auth for all tools if provided
    if (authScheme || authCredential) {
      this.configureAuthAll(authScheme, authCredential);
    }
  }

  /**
   * Gets all tools in the toolset.
   * 
   * @returns The list of tools in the toolset
   */
  getTools(): RestApiTool[] {
    return this.tools;
  }

  /**
   * Gets a tool by name.
   * 
   * @param toolName The name of the tool to get
   * @returns The tool with the given name, or undefined if not found
   */
  getTool(toolName: string): RestApiTool | undefined {
    return this.tools.find(tool => tool.name === toolName);
  }

  /**
   * Configures auth scheme and credential for all tools.
   * 
   * @param authScheme The auth scheme to use for all tools
   * @param authCredential The auth credential to use for all tools
   */
  private configureAuthAll(authScheme?: AuthScheme, authCredential?: AuthCredential): void {
    for (const tool of this.tools) {
      if (authScheme) {
        tool.configureAuthScheme(authScheme);
      }
      if (authCredential) {
        tool.configureAuthCredential(authCredential);
      }
    }
  }

  /**
   * Loads the OpenAPI spec string into a dictionary.
   * 
   * @param specStr The OpenAPI spec string
   * @param specType The type of the OpenAPI spec string
   * @returns The OpenAPI spec dictionary
   */
  private loadSpec(specStr?: string, specType: 'json' | 'yaml' = 'json'): Record<string, unknown> | undefined {
    if (!specStr) {
      return undefined;
    }
    
    if (specType === 'json') {
      return JSON.parse(specStr);
    } else if (specType === 'yaml') {
      throw new Error('YAML parsing is not implemented yet');
      // In a real implementation, you would use a YAML parser like js-yaml
    } else {
      throw new Error(`Unsupported spec type: ${specType}`);
    }
  }

  /**
   * Parses the OpenAPI spec into a list of RestApiTool.
   * 
   * @param openApiSpecDict The OpenAPI spec dictionary
   * @returns The list of parsed RestApiTool
   */
  private parse(openApiSpecDict: Record<string, unknown>): RestApiTool[] {
    // Parse the OpenAPI spec into operations
    const operations: ParsedOperation[] = new OpenApiSpecParser().parse(openApiSpecDict);
    
    // Create a RestApiTool for each operation
    const tools: RestApiTool[] = [];
    for (const operation of operations) {
      const tool = RestApiTool.fromParsedOperation(operation);
      console.log(`Parsed tool: ${tool.name}`);
      tools.push(tool);
    }
    
    return tools;
  }
}