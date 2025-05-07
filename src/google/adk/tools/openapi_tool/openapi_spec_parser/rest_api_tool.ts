// REST API tool for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the REST API tool functionality from the Python SDK

import fetch from 'node-fetch';
import { ParsedOperation, ParsedParameter } from './operation_parser';
import { BaseTool } from '../../base_tool';
import { ToolContext } from '../../tool_context';
import { AdkFunctionDeclaration, AdkSchema, AdkType } from '../../../models/llm_types';
import { AuthCredential } from '../../../auth/auth_credential';
import { AuthScheme } from '../../../auth/auth_schemes';
import { ToolAuthHandler } from './tool_auth_handler';
import { OpenAPIV3 } from 'openapi-types'; // Added import

/**
 * A tool that wraps an operation from an OpenAPI spec.
 */
export class RestApiTool extends BaseTool {
  /**
   * The parsed operation from the OpenAPI spec.
   */
  private operation: ParsedOperation;

  /**
   * The auth handler for the tool.
   */
  private authHandler: ToolAuthHandler;

  /**
   * Creates a new RestApiTool.
   *
   * @param operation The parsed operation from the OpenAPI spec
   */
  constructor(operation: ParsedOperation) {
    super(
      operation.operationId,
      operation.summary ||
        operation.description ||
        `${operation.method} ${operation.path}`,
      false // isLongRunning
    );

    this.operation = operation;
    this.authHandler = new ToolAuthHandler();
  }

  /**
   * Creates a RestApiTool from a parsed operation.
   *
   * @param operation The parsed operation from the OpenAPI spec
   * @returns A new RestApiTool
   */
  static fromParsedOperation(operation: ParsedOperation): RestApiTool {
    return new RestApiTool(operation);
  }

  /**
   * Configures the auth scheme for the tool.
   *
   * @param authScheme The auth scheme
   */
  configureAuthScheme(authScheme: AuthScheme): void {
    this.authHandler.setAuthScheme(authScheme);
  }

  /**
   * Configures the auth credential for the tool.
   *
   * @param authCredential The auth credential
   */
  configureAuthCredential(authCredential: AuthCredential): void {
    this.authHandler.setAuthCredential(authCredential);
  }

  /**
   * Gets the OpenAPI specification of this tool in the form of a FunctionDeclaration.
   *
   * @returns The FunctionDeclaration of this tool
   */
  protected override getDeclaration(): AdkFunctionDeclaration | null {
    if (!this.operation) {
      return {
        name: this.name,
        description: this.description || '',
        parameters: {
          type: AdkType.OBJECT,
          properties: {},
        },
      };
    }

    const parameters: Record<string, AdkSchema> = {};

    // Convert operation parameters to function parameters
    if (this.operation.parameters) {
      for (const param of this.operation.parameters) {
        parameters[param.name] = this.convertParameterToSchema(param);
      }
    }

    // Add request body if present
    if (this.operation.requestBody) {
      parameters['body'] = {
        type: AdkType.OBJECT,
        description: this.operation.requestBody.description || 'Request body',
      };
    }

    // Create required parameters list
    const required = this.operation.parameters
      ? this.operation.parameters
        .filter((param) => param.required)
        .map((param) => param.name)
      : [];

    if (this.operation.requestBody?.required) {
      required.push('body');
    }

    // Create function declaration
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: AdkType.OBJECT,
        properties: parameters,
        required: required.length > 0 ? required : undefined,
      },
    };
  }

  /**
   * Runs the REST API operation with the given arguments.
   *
   * @param args The arguments for the operation
   * @param _toolContext The tool context (unused)
   * @returns The response from the operation
   */
  override async runAsync(
    args: Record<string, unknown>,
    _toolContext: ToolContext
  ): Promise<unknown> {
    if (!this.operation) {
      return { error: 'Operation is undefined' };
    }

    try {
      // Build the URL with path parameters and query parameters
      const url = this.buildUrl(args);

      // Build the request
      const requestInit: RequestInit = {
        method: this.operation.method,
        headers: this.buildHeaders(args),
      };

      // Add request body if needed
      if (
        ['POST', 'PUT', 'PATCH'].includes(this.operation.method) &&
        this.operation.requestBody &&
        args.body
      ) {
        requestInit.body =
          typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
      }

      // Apply auth
      this.authHandler.applyAuth(requestInit);

      // Make the request
      const response = await fetch(
        url,
        requestInit as import('node-fetch').RequestInit
      );

      // Parse the response
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        return {
          status: response.status,
          statusText: response.statusText,
          data: jsonResponse,
        };
      } else {
        const textResponse = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          data: textResponse,
        };
      }
    } catch (error) {
      return {
        error: `Error in ${this.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Builds the URL for the operation with path and query parameters.
   *
   * @param args The arguments for the operation
   * @returns The URL with path and query parameters
   */
  private buildUrl(args: Record<string, unknown>): string {
    if (!this.operation) {
      return '';
    }

    let path = this.operation.path;
    const queryParams: URLSearchParams = new URLSearchParams();

    // Replace path parameters and collect query parameters
    if (this.operation.parameters) {
      for (const param of this.operation.parameters) {
        const value = args[param.name];

        if (value !== undefined && value !== null) {
          if (param.in === 'path') {
            // Replace path parameter
            path = path.replace(`{${param.name}}`, String(value));
          } else if (param.in === 'query') {
            // Add query parameter
            if (Array.isArray(value)) {
              // Handle array query parameters
              for (const item of value) {
                queryParams.append(`${param.name}`, String(item));
              }
            } else {
              queryParams.append(param.name, String(value));
            }
          }
        }
      }
    }

    // Build the full URL
    const baseUrl = this.operation.serverUrl.endsWith('/')
      ? this.operation.serverUrl.slice(0, -1)
      : this.operation.serverUrl;

    const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;

    const queryString = queryParams.toString();

    return `${baseUrl}/${pathWithoutLeadingSlash}${
      queryString ? `?${queryString}` : ''
    }`;
  }

  /**
   * Builds the headers for the operation.
   *
   * @param args The arguments for the operation
   * @returns The headers for the operation
   */
  private buildHeaders(args: Record<string, unknown>): Record<string, string> {
    if (!this.operation) {
      return {
        Accept: 'application/json',
        'User-Agent': 'GoogleADK/TypeScript',
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'GoogleADK/TypeScript',
    };

    // If sending a JSON body, add content-type
    if (['POST', 'PUT', 'PATCH'].includes(this.operation.method) && args.body) {
      headers['Content-Type'] = 'application/json';
    }

    // Add header parameters
    if (this.operation.parameters) {
      for (const param of this.operation.parameters) {
        if (param.in === 'header' && args[param.name] !== undefined) {
          headers[param.name] = String(args[param.name]);
        }
      }
    }

    return headers;
  }

  /**
   * Converts an OpenAPI parameter to a schema.
   *
   * @param param The parameter to convert
   * @returns The schema for the parameter
   */
  private convertParameterToSchema(param: ParsedParameter): AdkSchema {
    const adkSchema: AdkSchema = {};

    if (param.description) {
      adkSchema.description = param.description;
    }

    // OpenAPI 3.0 has schema object, OpenAPI 2.0 might have type/enum directly on param
    const sourceSchema = param.schema || param;
    const sourceSchemaAsOpenApi = sourceSchema as OpenAPIV3.SchemaObject; // For convenience

    if (sourceSchema.type) {
      adkSchema.type = this.mapOpenApiTypeToAdkType(sourceSchema.type as string);
    } else if (sourceSchemaAsOpenApi.properties) {
      adkSchema.type = AdkType.OBJECT;
    } else if (sourceSchemaAsOpenApi.type === 'array' && sourceSchemaAsOpenApi.items) {
      adkSchema.type = AdkType.ARRAY;
    } else {
      adkSchema.type = AdkType.STRING; // Default to STRING if type is not determinable
    }

    if (sourceSchema.required && Array.isArray(sourceSchema.required)) {
      adkSchema.required = sourceSchema.required as string[];
    }

    if (sourceSchemaAsOpenApi.properties) {
      adkSchema.properties = {};
      for (const [propName, propSchema] of Object.entries(
        sourceSchemaAsOpenApi.properties as Record<string, OpenAPIV3.SchemaObject>
      )) {
        adkSchema.properties[propName] = this.convertOpenApiSchemaToAdkSchema(
          propSchema
        );
      }
    }

    if (adkSchema.type === AdkType.ARRAY && sourceSchemaAsOpenApi.type === 'array' && sourceSchemaAsOpenApi.items) {
      adkSchema.items = this.convertOpenApiSchemaToAdkSchema(
        (sourceSchemaAsOpenApi as OpenAPIV3.ArraySchemaObject).items
      );
    }
    
    if (sourceSchema.enum && Array.isArray(sourceSchema.enum)) {
      adkSchema.enum = sourceSchema.enum.filter(
        (e): e is string | number | boolean => 
          typeof e === 'string' || typeof e === 'number' || typeof e === 'boolean'
      );
    }

    if (sourceSchemaAsOpenApi.oneOf && Array.isArray(sourceSchemaAsOpenApi.oneOf)) {
      adkSchema.oneOf = ((sourceSchemaAsOpenApi.oneOf as OpenAPIV3.SchemaObject[]).map((s) => 
        this.convertOpenApiSchemaToAdkSchema(s)
      ));
    }

    if (sourceSchemaAsOpenApi.format) {
      adkSchema.format = (sourceSchemaAsOpenApi.format as string);
    }

    return adkSchema;
  }

  private convertOpenApiSchemaToAdkSchema(openApiSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): AdkSchema {
    const adkSchema: AdkSchema = {};

    // Handle ReferenceObject (if necessary, though current ADK schema might not support $ref directly)
    if ('$ref' in openApiSchema) {
      // For now, return an empty schema or throw an error, as $ref resolution is complex.
      // console.warn(`Encountered $ref: ${openApiSchema.$ref}. ADK does not currently support $ref resolution.`);
      adkSchema.description = `Reference to ${openApiSchema.$ref}`;
      adkSchema.type = AdkType.OBJECT; // Or some other placeholder
      return adkSchema;
    }

    // At this point, openApiSchema is OpenAPIV3.SchemaObject
    const schemaObject = openApiSchema as OpenAPIV3.SchemaObject;

    if (schemaObject.description) {
      adkSchema.description = schemaObject.description;
    }

    // OpenAPIV3.SchemaObject.type can be an array, handle the first one or default
    const type = Array.isArray(schemaObject.type) ? schemaObject.type[0] : schemaObject.type;

    // Corrected if/else if structure
    if (type === 'array') {
      adkSchema.type = AdkType.ARRAY;
      // Ensure .items is accessed safely after confirming type is 'array'
      // No direct .items access here for type determination, but for adkSchema.items later
    } else if (type) { // If type is defined (e.g., 'string', 'object', 'number')
      adkSchema.type = this.mapOpenApiTypeToAdkType(type);
    } else if (schemaObject.properties) { // No explicit type, but has properties, implies OBJECT
      adkSchema.type = AdkType.OBJECT;
    } else if ('items' in schemaObject && schemaObject.items) { // Use 'in' operator type guard
      // No explicit type, but has items. This implies array.
      adkSchema.type = AdkType.ARRAY;
    } else {
      adkSchema.type = AdkType.STRING; // Default for unknown types
    }

    if (schemaObject.required && Array.isArray(schemaObject.required)) {
      adkSchema.required = schemaObject.required;
    }

    if (schemaObject.properties) {
      adkSchema.properties = {};
      for (const [propName, propSchema] of Object.entries(schemaObject.properties)) {
        adkSchema.properties[propName] = this.convertOpenApiSchemaToAdkSchema(propSchema);
      }
    }

    // Handle items property for arrays
    if (adkSchema.type === AdkType.ARRAY) {
      // If adkSchema.type is ARRAY, schemaObject must have an items property
      // either because schemaObject.type was 'array' or 'items' was found by 'in' operator.
      // We use 'in' operator for safety then cast to ArraySchemaObject to access .items.
      if ('items' in schemaObject && schemaObject.items) {
        adkSchema.items = this.convertOpenApiSchemaToAdkSchema(
          (schemaObject as OpenAPIV3.ArraySchemaObject).items
        );
      }
    }

    if (schemaObject.enum && Array.isArray(schemaObject.enum)) {
      adkSchema.enum = schemaObject.enum.filter(
        (e: unknown): e is string | number | boolean =>
          typeof e === 'string' || typeof e === 'number' || typeof e === 'boolean' || e === null // Allow nulls if your AdkSchema permits
      );
    }
    
    if (schemaObject.oneOf && Array.isArray(schemaObject.oneOf)) {
      adkSchema.oneOf = schemaObject.oneOf.map((s: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject) => this.convertOpenApiSchemaToAdkSchema(s));
    }

    if (schemaObject.format) {
      adkSchema.format = schemaObject.format;
    }
    
    // Handle other properties like default, example, nullable, readOnly, writeOnly etc. if needed
    // For example:
    // if (schemaObject.nullable) { adkSchema.nullable = schemaObject.nullable; }
    // if ('default' in schemaObject) { adkSchema.default = schemaObject.default; }

    return adkSchema;
  }

  /**
   * Maps OpenAPI data types to ADK data types.
   * @param openApiType The OpenAPI data type string.
   * @returns The corresponding ADK data type string.
   */
  private mapOpenApiTypeToAdkType(openApiType: string): string {
    switch (openApiType?.toLowerCase()) { // Added optional chaining for safety
    case 'string':
      return AdkType.STRING;
    case 'number':
    case 'float':
    case 'double':
      return AdkType.NUMBER;
    case 'integer':
      return AdkType.INTEGER;
    case 'boolean':
      return AdkType.BOOLEAN;
    case 'array':
      return AdkType.ARRAY;
    case 'object':
      return AdkType.OBJECT;
    default:
      // console.warn(`Unknown OpenAPI type: ${openApiType}, defaulting to STRING.`);
      return AdkType.STRING; // Default for unknown types
    }
  }
}
