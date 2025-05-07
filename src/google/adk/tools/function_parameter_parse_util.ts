// Function parameter parsing utility for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the function parameter parsing functionality from the Python SDK

import { AdkFunctionDeclaration, AdkSchema, AdkType } from '../models/base_llm';

/**
 * Mapping from JavaScript types to schema types.
 */
const JS_TYPE_TO_SCHEMA_TYPE: Record<string, AdkType | undefined> = {
  'string': AdkType.STRING,
  'number': AdkType.NUMBER,
  'boolean': AdkType.BOOLEAN,
  'object': AdkType.OBJECT,
  'array': AdkType.ARRAY,
  'function': undefined,
  'undefined': undefined,
  'symbol': undefined,
  'bigint': AdkType.NUMBER
};

export interface BuildFunctionDeclarationOptions {
  ignoreParams?: string[];
  variant?: 'GOOGLE_AI' | 'OPENAI';
}

/**
 * Builds a function declaration from a function.
 * 
 * @param func The function to build a declaration for
 * @param options Options for building the declaration
 * @returns The built function declaration
 */
export function buildFunctionDeclaration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (...args: any[]) => any, 
  options: BuildFunctionDeclarationOptions = {}
): AdkFunctionDeclaration {
  const { ignoreParams = [] } = options;
  const funcString = func.toString();
  const name = func.name;

  let description = `Function ${name}`; // Default description
  const properties: Record<string, AdkSchema> = {};
  const requiredParamsList: string[] = [];

  // Basic JSDoc parsing
  const jsDocMatch = funcString.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsDocMatch && jsDocMatch[1]) {
    const jsDocContent = jsDocMatch[1];
    
    // Extract main description (content before the first @param or other @tag)
    const descriptionMatch = jsDocContent.match(/^([^*@]+)/m);
    if (descriptionMatch) {
      description = descriptionMatch[0].replace(/\n\s*\*\s?/g, '\n').trim();
    }

    // Extract @param tags
    const paramRegex = /@param\s+(?:\{([^}]+)\}\s+)?(\[)?([a-zA-Z0-9_]+)(\])?\s*(?:-\s*)?([\s\S]*?)(?=\n\s*\*\s*(?:@param|@returns|@throws|@deprecated|@see|@example|$))/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(jsDocContent)) !== null) {
      const paramTypeStr = paramMatch[1]; // e.g., {string}, {number[]}
      const isOptionalBracket = paramMatch[2] === '[' && paramMatch[4] === ']';
      const paramName = paramMatch[3];
      const paramDescription = paramMatch[5] ? paramMatch[5].replace(/\n\s*\*\s?/g, '\n').trim() : `Parameter ${paramName}`;

      if (ignoreParams.includes(paramName)) continue;

      let schemaType: AdkType | undefined = undefined;
      // Basic type mapping (can be expanded)
      if (paramTypeStr) {
        if (paramTypeStr.toLowerCase().includes('string')) schemaType = AdkType.STRING;
        else if (paramTypeStr.toLowerCase().includes('number')) schemaType = AdkType.NUMBER;
        else if (paramTypeStr.toLowerCase().includes('boolean')) schemaType = AdkType.BOOLEAN;
        else if (paramTypeStr.toLowerCase().includes('object')) schemaType = AdkType.OBJECT;
        else if (paramTypeStr.toLowerCase().includes('array')) schemaType = AdkType.ARRAY;
      }

      properties[paramName] = {
        type: schemaType,
        description: paramDescription,
      };

      // Check for optionality from JSDoc: e.g. @param {string} [myParam] - Description
      // or if the type string itself indicates optionality e.g. {string=}
      const isOptionalType = paramTypeStr && paramTypeStr.includes('='); 
      if (!isOptionalBracket && !isOptionalType) {
        requiredParamsList.push(paramName);
      }
    }
  }

  const functionDeclaration: AdkFunctionDeclaration = {
    name,
    description,
  };

  if (Object.keys(properties).length > 0) {
    functionDeclaration.parameters = {
      type: AdkType.OBJECT,
      properties,
    };
    if (requiredParamsList.length > 0) {
      functionDeclaration.parameters.required = requiredParamsList;
    }
  } else {
    // If no JSDoc params, fallback to signature parsing (current simplified logic)
    // This part could be removed if JSDoc is made mandatory for parameters
    const paramStringFallback = funcString.match(/\(([^)]*)\)/)?.[1] || '';
    const paramNamesFallback = paramStringFallback.split(',') 
      .map(param => param.trim())
      .filter(param => param && !ignoreParams.includes(param.split(':')[0].trim().replace(/[=?].*$/, '')))
      .map(param => param.split(':')[0].trim().replace(/[=?].*$/, ''));

    if (paramNamesFallback.length > 0 && paramNamesFallback[0] !== '') {
      for (const paramName of paramNamesFallback) {
        if (!properties[paramName]) { // Ensure not to overwrite JSDoc parsed params
          properties[paramName] = { type: undefined, description: `Parameter: ${paramName}` };
        }
      }
      functionDeclaration.parameters = {
        type: AdkType.OBJECT,
        properties
      };
      const requiredFallback = paramNamesFallback.filter(p => !p.includes('?') && p !== '');
      if (requiredFallback.length > 0) {
        functionDeclaration.parameters.required = requiredFallback;
      }
    }
  }
  
  return functionDeclaration;
}

/**
 * Infers the schema type of a value.
 * 
 * @param value The value to infer the type of
 * @returns The inferred type
 */
export function inferType(value: unknown): AdkType | undefined {
  if (value === null) {
    return undefined;
  }
  
  const jsType = Array.isArray(value) ? 'array' : typeof value;
  return JS_TYPE_TO_SCHEMA_TYPE[jsType] || undefined;
}

/**
 * Updates a schema based on a value.
 * @param schema The schema to update
 * @param value The value to infer schema from
 */
export function updateSchemaFromValue(schema: AdkSchema, value: unknown): void {
  schema.type = inferType(value);
  
  if (Array.isArray(value) && value.length > 0) {
    if (!schema.items) {
      schema.items = { type: undefined };
    }
    updateSchemaFromValue(schema.items, value[0]);
  } else if (typeof value === 'object' && value !== null) {
    if (!schema.properties) {
      schema.properties = {};
    }
    
    for (const [key, propValue] of Object.entries(value)) {
      if (!schema.properties[key]) {
        schema.properties[key] = { type: undefined };
      }
      updateSchemaFromValue(schema.properties[key], propValue);
    }
  }
}