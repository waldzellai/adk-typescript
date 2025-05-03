// OpenAPI spec parser for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the OpenAPI spec parser functionality from the Python SDK

import { OperationParser, ParsedOperation } from './operation_parser';

/**
 * Parser for OpenAPI specifications.
 */
export class OpenApiSpecParser {
  /**
   * Parses an OpenAPI spec dictionary into a list of parsed operations.
   * 
   * @param openApiSpec The OpenAPI spec dictionary
   * @returns A list of parsed operations
   */
  parse(openApiSpec: Record<string, unknown>): ParsedOperation[] {
    // Validate the OpenAPI spec
    this.validateOpenApiSpec(openApiSpec);
    
    // Parse the paths and operations
    const operations: ParsedOperation[] = [];
    const paths = openApiSpec.paths as Record<string, unknown> || {};
    const serverUrl = this.getServerUrl(openApiSpec);
    
    // Create operation parser with server URL
    const operationParser = new OperationParser(serverUrl);
    
    // Parse each path and method
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== 'object') {
        continue;
      }
      
      // Extract operations (HTTP methods) from the path item
      for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
        // Skip non-HTTP method keys (e.g., parameters, summary)
        if (!this.isHttpMethod(method) || !operation) {
          continue;
        }
        
        try {
          // Parse the operation
          const parsedOperation = operationParser.parse({
            path,
            method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
            operation: operation as Record<string, unknown>,
            globalSecuritySchemes: (openApiSpec.components as Record<string, unknown>)?.securitySchemes as Record<string, unknown>,
            globalSecurity: openApiSpec.security as Array<Record<string, string[]>>,
            pathParameters: (pathItem as Record<string, unknown>).parameters as Array<Record<string, unknown>>
          });
          
          operations.push(parsedOperation);
        } catch (error) {
          console.warn(`Error parsing operation ${method} ${path}:`, error);
          // Continue with the next operation
        }
      }
    }
    
    return operations;
  }
  
  /**
   * Validates the OpenAPI spec format.
   * 
   * @param openApiSpec The OpenAPI spec to validate
   * @throws Error if the spec is invalid
   */
  private validateOpenApiSpec(openApiSpec: Record<string, unknown>): void {
    if (!openApiSpec) {
      throw new Error('OpenAPI spec is null or undefined');
    }
    
    if (typeof openApiSpec !== 'object') {
      throw new Error('OpenAPI spec is not an object');
    }
    
    if (!openApiSpec.openapi) {
      throw new Error('OpenAPI spec is missing the "openapi" field');
    }
    
    if (!openApiSpec.paths) {
      throw new Error('OpenAPI spec is missing the "paths" field');
    }
    
    if (typeof openApiSpec.paths !== 'object') {
      throw new Error('OpenAPI "paths" field is not an object');
    }
  }
  
  /**
   * Gets the server URL from the OpenAPI spec.
   * 
   * @param openApiSpec The OpenAPI spec
   * @returns The server URL
   */
  private getServerUrl(openApiSpec: Record<string, unknown>): string {
    // Check for servers array
    if (openApiSpec.servers && Array.isArray(openApiSpec.servers) && openApiSpec.servers.length > 0) {
      const firstServer = openApiSpec.servers[0] as Record<string, unknown>;
      if (firstServer && typeof firstServer.url === 'string') {
        return firstServer.url as string;
      }
    }
    
    // Fallback to default URL
    return 'https://api.example.com';
  }
  
  /**
   * Checks if a string is an HTTP method.
   * 
   * @param method The method to check
   * @returns True if the string is an HTTP method, false otherwise
   */
  private isHttpMethod(method: string): boolean {
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    return httpMethods.includes(method.toLowerCase());
  }
}