// Operation parser for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the operation parser functionality from the Python SDK

/**
 * Represents a parsed parameter from an OpenAPI operation.
 */
export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie' | 'body';
  required: boolean;
  schema?: Record<string, unknown>;
  description?: string;
  example?: unknown;
}

/**
 * Represents a parsed request body from an OpenAPI operation.
 */
export interface ParsedRequestBody {
  required: boolean;
  content: {
    [contentType: string]: {
      schema?: Record<string, unknown>;
      example?: unknown;
    };
  };
  description?: string;
}

/**
 * Represents a parsed response from an OpenAPI operation.
 */
export interface ParsedResponse {
  statusCode: string;
  description: string;
  content: {
    [contentType: string]: {
      schema?: Record<string, unknown>;
      example?: unknown;
    };
  };
}

/**
 * Represents a parsed security requirement from an OpenAPI operation.
 */
export interface ParsedSecurity {
  scheme: string;
  flows?: Record<string, unknown>;
  scopes: string[];
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  in?: 'query' | 'header' | 'cookie';
  name?: string;
}

/**
 * Represents a parsed operation from an OpenAPI spec.
 */
export interface ParsedOperation {
  operationId: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: ParsedResponse[];
  security: ParsedSecurity[];
  tags: string[];
  deprecated: boolean;
  serverUrl: string;
}

/**
 * Options for parsing an operation.
 */
export interface ParseOperationOptions {
  path: string;
  method: string;
  operation: Record<string, unknown>;
  globalSecuritySchemes?: Record<string, unknown>;
  globalSecurity?: Array<Record<string, string[]>>;
  pathParameters?: Array<Record<string, unknown>>;
}

/**
 * Parser for OpenAPI operations.
 */
export class OperationParser {
  /**
   * The base server URL for the API.
   */
  private serverUrl: string;

  /**
   * Creates a new OperationParser.
   * 
   * @param serverUrl The base server URL for the API
   */
  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  /**
   * Parses an OpenAPI operation into a ParsedOperation.
   * 
   * @param options The options for parsing the operation
   * @returns The parsed operation
   */
  parse(options: ParseOperationOptions): ParsedOperation {
    const { path, method, operation, globalSecuritySchemes, globalSecurity, pathParameters } = options;
    
    // Generate a reasonable operationId if one is not provided
    const operationId = operation.operationId as string || 
      `${method.toLowerCase()}${path.replace(/\/{/g, '_').replace(/}/g, '').replace(/\//g, '_')}`;
    
    // Parse parameters
    const parameters = this.parseParameters(
      operation.parameters as Array<Record<string, unknown>> || [], 
      pathParameters || []
    );
    
    // Parse request body
    const requestBody = operation.requestBody ? 
      this.parseRequestBody(operation.requestBody as Record<string, unknown>) : 
      undefined;
    
    // Parse responses
    const responses = this.parseResponses(operation.responses as Record<string, unknown> || {});
    
    // Parse security
    const security = this.parseSecurity(
      operation.security as Array<Record<string, string[]>> || globalSecurity || [],
      globalSecuritySchemes || {}
    );
    
    return {
      operationId,
      path,
      method,
      summary: operation.summary as string || '',
      description: operation.description as string || '',
      parameters,
      requestBody,
      responses,
      security,
      tags: operation.tags as string[] || [],
      deprecated: operation.deprecated as boolean || false,
      serverUrl: this.serverUrl
    };
  }
  
  /**
   * Parses operation parameters.
   * 
   * @param operationParameters The operation parameters
   * @param pathParameters The path parameters
   * @returns The parsed parameters
   */
  private parseParameters(
    operationParameters: Array<Record<string, unknown>> = [], 
    pathParameters: Array<Record<string, unknown>> = []
  ): ParsedParameter[] {
    // Merge path and operation parameters
    const allParameters = [...pathParameters, ...operationParameters];
    
    return allParameters.map(param => ({
      name: param.name as string,
      in: param.in as 'path' | 'query' | 'header' | 'cookie' | 'body',
      required: Boolean(param.required || param.in === 'path'), // Path parameters are always required
      schema: param.schema as Record<string, unknown> | undefined,
      description: param.description as string | undefined,
      example: param.example
    }));
  }
  
  /**
   * Parses a request body.
   * 
   * @param requestBody The request body to parse
   * @returns The parsed request body
   */
  private parseRequestBody(requestBody: Record<string, unknown>): ParsedRequestBody {
    return {
      required: Boolean(requestBody.required) || false,
      content: requestBody.content as Record<string, { schema?: Record<string, unknown>; example?: unknown }> || {},
      description: requestBody.description as string | undefined
    };
  }
  
  /**
   * Parses operation responses.
   * 
   * @param responses The responses to parse
   * @returns The parsed responses
   */
  private parseResponses(responses: Record<string, unknown>): ParsedResponse[] {
    return Object.entries(responses).map(([statusCode, response]) => ({
      statusCode,
      description: (response as Record<string, unknown>).description as string || '',
      content: (response as Record<string, unknown>).content as Record<string, { schema?: Record<string, unknown>; example?: unknown }> || {}
    }));
  }
  
  /**
   * Parses security requirements.
   * 
   * @param securityRequirements The security requirements
   * @param securitySchemes The security schemes
   * @returns The parsed security requirements
   */
  private parseSecurity(
    securityRequirements: Array<Record<string, string[]>>,
    securitySchemes: Record<string, unknown>
  ): ParsedSecurity[] {
    const parsedSecurity: ParsedSecurity[] = [];
    
    // Process each security requirement
    for (const requirement of securityRequirements) {
      for (const [schemeName, scopes] of Object.entries(requirement)) {
        // Find the security scheme
        const scheme = securitySchemes[schemeName] as Record<string, unknown>;
        if (!scheme) {
          console.warn(`Security scheme "${schemeName}" not found`);
          continue;
        }
        
        parsedSecurity.push({
          scheme: schemeName,
          flows: scheme.flows as Record<string, unknown> | undefined,
          scopes,
          type: scheme.type as 'apiKey' | 'http' | 'oauth2' | 'openIdConnect',
          in: scheme.in as 'query' | 'header' | 'cookie' | undefined,
          name: scheme.name as string | undefined
        });
      }
    }
    
    return parsedSecurity;
  }
}