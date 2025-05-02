// Auth schemes module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the auth schemes functionality from the Python SDK

/**
 * Represents the type of security scheme.
 */
export enum SecuritySchemeType {
  apiKey = 'apiKey',
  http = 'http',
  oauth2 = 'oauth2',
  openIdConnect = 'openIdConnect'
}

/**
 * Represents the location of the API key.
 */
export enum APIKeyLocation {
  query = 'query',
  header = 'header',
  cookie = 'cookie'
}

/**
 * Base security scheme.
 */
export interface SecurityBase {
  type: SecuritySchemeType;
  description?: string;
  [key: string]: unknown;
}

/**
 * API key security scheme.
 */
export interface APIKeySecurityScheme extends SecurityBase {
  type: SecuritySchemeType.apiKey;
  name: string;
  in: APIKeyLocation;
}

/**
 * HTTP security scheme.
 */
export interface HTTPSecurityScheme extends SecurityBase {
  type: SecuritySchemeType.http;
  scheme: string;
  bearerFormat?: string;
}

/**
 * OAuth2 implicit flow.
 */
export interface OAuth2ImplicitFlow {
  authorizationUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * OAuth2 password flow.
 */
export interface OAuth2PasswordFlow {
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * OAuth2 client credentials flow.
 */
export interface OAuth2ClientCredentialsFlow {
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * OAuth2 authorization code flow.
 */
export interface OAuth2AuthorizationCodeFlow {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * OAuth2 flows.
 */
export interface OAuthFlows {
  implicit?: OAuth2ImplicitFlow;
  password?: OAuth2PasswordFlow;
  clientCredentials?: OAuth2ClientCredentialsFlow;
  authorizationCode?: OAuth2AuthorizationCodeFlow;
}

/**
 * OAuth2 security scheme.
 */
export interface OAuth2SecurityScheme extends SecurityBase {
  type: SecuritySchemeType.oauth2;
  flows: OAuthFlows;
}

/**
 * OpenID Connect security scheme.
 */
export interface OpenIdConnectSecurityScheme extends SecurityBase {
  type: SecuritySchemeType.openIdConnect;
  openIdConnectUrl: string;
}

/**
 * OpenID Connect with configuration.
 */
export interface OpenIdConnectWithConfig extends SecurityBase {
  type: SecuritySchemeType.openIdConnect;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  revocationEndpoint?: string;
  tokenEndpointAuthMethodsSupported?: string[];
  grantTypesSupported?: string[];
  scopes?: string[];
}

/**
 * Security scheme.
 */
export type SecurityScheme = 
  | APIKeySecurityScheme 
  | HTTPSecurityScheme 
  | OAuth2SecurityScheme 
  | OpenIdConnectSecurityScheme;

/**
 * Auth scheme contains SecuritySchemes from OpenAPI 3.0 and an extra flattened OpenIdConnectWithConfig.
 */
export type AuthScheme = SecurityScheme | OpenIdConnectWithConfig;

/**
 * Represents the OAuth2 flow (or grant type).
 */
export enum OAuthGrantType {
  CLIENT_CREDENTIALS = 'client_credentials',
  AUTHORIZATION_CODE = 'authorization_code',
  IMPLICIT = 'implicit',
  PASSWORD = 'password'
}

/**
 * Converts an OAuthFlows object to an OAuthGrantType.
 * 
 * @param flow The OAuth flows to convert
 * @returns The corresponding OAuth grant type
 */
export function oauthGrantTypeFromFlow(flow: OAuthFlows): OAuthGrantType | null {
  if (flow.clientCredentials) {
    return OAuthGrantType.CLIENT_CREDENTIALS;
  }
  if (flow.authorizationCode) {
    return OAuthGrantType.AUTHORIZATION_CODE;
  }
  if (flow.implicit) {
    return OAuthGrantType.IMPLICIT;
  }
  if (flow.password) {
    return OAuthGrantType.PASSWORD;
  }
  return null;
}

// AuthSchemeType re-exports SecuritySchemeType from OpenAPI 3.0
export const AuthSchemeType = SecuritySchemeType;