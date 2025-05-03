// Function parameter parsing utility for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the function parameter parsing functionality from the Python SDK

import { FunctionDeclaration, Schema, Type } from '../models/llm_types';

interface BuildFunctionDeclarationOptions {
  ignoreParams?: string[];
  variant?: 'GOOGLE_AI' | 'VERTEX_AI' | 'DEFAULT';
}

/**
 * Mapping from JavaScript types to schema types.
 */
const JS_TYPE_TO_SCHEMA_TYPE: Record<string, Type> = {
  'string': Type.STRING,
  'number': Type.NUMBER,
  'boolean': Type.BOOLEAN,
  'object': Type.OBJECT,
  'array': Type.ARRAY,
  'function': Type.TYPE_UNSPECIFIED,
  'undefined': Type.TYPE_UNSPECIFIED,
  'symbol': Type.TYPE_UNSPECIFIED,
  'bigint': Type.NUMBER
};

/**
 * Builds a function declaration from a function.
 * 
 * @param func The function to build a declaration for
 * @param options Options for building the declaration
 * @returns The function declaration
 */
export function buildFunctionDeclaration(
  func: Function,
  options: BuildFunctionDeclarationOptions = {}
): FunctionDeclaration {
  const { ignoreParams = [], variant = 'GOOGLE_AI' } = options;
  
  // Get function metadata
  const funcStr = func.toString();
  const name = func.name || 'anonymous_function';
  
  // Extract the description from JSDoc comments if available
  const docComment = funcStr.match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
  const description = docComment
    .replace(/\/\*\*|\*\//g, '')
    .replace(/\s*\*\s*/g, ' ')
    .trim() || '';
  
  // Extract parameter information from function signature
  const paramMatch = funcStr.match(/\(([^)]*)\)/);
  const paramString = paramMatch ? paramMatch[1] : '';
  const paramNames = paramString.split(',')
    .map(param => param.trim())
    .filter(param => param && !ignoreParams.includes(param.split(':')[0].trim()))
    .map(param => param.split(':')[0].trim().replace(/[=?].*$/, ''));
  
  // Build the parameter schema
  const properties: Record<string, Schema> = {};
  
  for (const paramName of paramNames) {
    if (!paramName || paramName === '') continue;
    
    // For TypeScript, we don't have runtime type information
    // We'll create a generic schema for each parameter
    properties[paramName] = {
      type: Type.TYPE_UNSPECIFIED,
      description: `Parameter: ${paramName}`
    };
  }
  
  // Build the function declaration
  const functionDeclaration: FunctionDeclaration = {
    name,
    description
  };
  
  // Add parameters if there are any
  if (Object.keys(properties).length > 0) {
    functionDeclaration.parameters = {
      type: Type.OBJECT,
      properties
    };
    
    // Add required parameters for Vertex AI
    if (variant === 'VERTEX_AI') {
      functionDeclaration.parameters.required = paramNames;
    }
  }
  
  return functionDeclaration;
}

/**
 * Infers the type of a value.
 * 
 * @param value The value to infer the type of
 * @returns The inferred type
 */
export function inferType(value: unknown): Type {
  if (value === null) {
    return Type.TYPE_UNSPECIFIED;
  }
  
  const jsType = Array.isArray(value) ? 'array' : typeof value;
  return JS_TYPE_TO_SCHEMA_TYPE[jsType] || Type.TYPE_UNSPECIFIED;
}

/**
 * Updates a schema based on a value's type and structure.
 * 
 * @param schema The schema to update
 * @param value The value to infer schema from
 */
export function updateSchemaFromValue(schema: Schema, value: unknown): void {
  schema.type = inferType(value);
  
  if (Array.isArray(value) && value.length > 0) {
    if (!schema.items) {
      schema.items = { type: Type.TYPE_UNSPECIFIED };
    }
    updateSchemaFromValue(schema.items, value[0]);
  } else if (typeof value === 'object' && value !== null) {
    schema.properties = schema.properties || {};
    
    for (const [key, propValue] of Object.entries(value)) {
      if (!schema.properties[key]) {
        schema.properties[key] = { type: Type.TYPE_UNSPECIFIED };
      }
      updateSchemaFromValue(schema.properties[key], propValue);
    }
  }
}