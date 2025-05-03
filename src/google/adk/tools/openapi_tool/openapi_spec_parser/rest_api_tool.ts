// REST API tool for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the REST API tool functionality from the Python SDK

import fetch from 'node-fetch';
import { ParsedOperation, ParsedParameter } from './operation_parser';
import { BaseTool } from '../../base_tool';
import { ToolContext } from '../../tool_context';
import { FunctionDeclaration, Schema, Type } from '../../../models/llm_types';
import { AuthCredential } from '../../../auth/auth_credential';
import { AuthScheme } from '../../../auth/auth_schemes';
import { ToolAuthHandler } from './tool_auth_handler';

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
  protected override getDeclaration(): FunctionDeclaration | null {
    if (!this.operation) {
      return {
        name: this.name,
        description: this.description || '',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      };
    }

    const parameters: Record<string, Schema> = {};

    // Convert operation parameters to function parameters
    if (this.operation.parameters) {
      for (const param of this.operation.parameters) {
        parameters[param.name] = this.convertParameterToSchema(param);
      }
    }

    // Add request body if present
    if (this.operation.requestBody) {
      parameters['body'] = {
        type: Type.OBJECT,
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
        type: Type.OBJECT,
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
  private convertParameterToSchema(param: ParsedParameter): Schema {
    const schema: Schema = {
      description: param.description,
    };

    // Convert OpenAPI schema type to ADK schema type
    if (param.schema?.type) {
      const schemaType = typeof param.schema.type === 'string' ? param.schema.type : '';
      switch (schemaType) {
      case 'string':
        schema.type = Type.STRING;
        break;
      case 'integer':
        schema.type = Type.INTEGER;
        break;
      case 'number':
        schema.type = Type.NUMBER;
        break;
      case 'boolean':
        schema.type = Type.BOOLEAN;
        break;
      case 'array':
        schema.type = Type.ARRAY;
        if (param.schema.items) {
          schema.items = {
            type: this.mapOpenApiTypeToAdkType(String((param.schema.items as Record<string, unknown>).type || '')),
          };
        }
        break;
      case 'object':
        schema.type = Type.OBJECT;
        if (param.schema.properties) {
          schema.properties = {};
          for (const [propName, propSchema] of Object.entries(
            param.schema.properties
          )) {
            schema.properties[propName] = {
              type: this.mapOpenApiTypeToAdkType(String((propSchema as Record<string, unknown>).type || '')),
            };
          }
        }
        break;
      default:
        schema.type = Type.TYPE_UNSPECIFIED;
      }
    } else {
      schema.type = Type.TYPE_UNSPECIFIED;
    }

    // Add enum values if present
    if (param.schema?.enum) {
      schema.enum = Array.isArray(param.schema.enum) ? param.schema.enum.map(String) : [];
    }

    return schema;
  }

  /**
   * Maps an OpenAPI type to an ADK type.
   *
   * @param openApiType The OpenAPI type
   * @returns The ADK type
   */
  private mapOpenApiTypeToAdkType(openApiType: string): Type {
    if (!openApiType.trim()) {
      return Type.TYPE_UNSPECIFIED;
    }

    switch (openApiType) {
    case 'string':
      return Type.STRING;
    case 'integer':
      return Type.INTEGER;
    case 'number':
      return Type.NUMBER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'array':
      return Type.ARRAY;
    case 'object':
      return Type.OBJECT;
    default:
      return Type.TYPE_UNSPECIFIED;
    }
  }
}
