// Auth module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the auth functionality from the Python SDK

// From auth_credential.ts
export { 
  HttpCredentials,
  HttpAuth,
  OAuth2Auth,
  ServiceAccountCredential,
  ServiceAccount,
  AuthCredentialTypes,
  AuthCredential,
  type BaseModelWithConfig
} from './auth_credential';

// From auth_handler.ts
export { AuthHandler } from './auth_handler';

// From auth_preprocessor.ts
export { requestProcessor } from './auth_preprocessor';

// From auth_schemes.ts
export { 
  SecuritySchemeType, 
  APIKeyLocation, 
  OAuthGrantType, 
  oauthGrantTypeFromFlow, 
  AuthSchemeType, // Alias for SecuritySchemeType
  type SecurityBase, 
  type APIKeySecurityScheme, 
  type HTTPSecurityScheme, 
  type OAuth2ImplicitFlow, 
  type OAuth2PasswordFlow, 
  type OAuth2ClientCredentialsFlow, 
  type OAuth2AuthorizationCodeFlow, 
  type OAuthFlows, 
  type OAuth2SecurityScheme, 
  type OpenIdConnectSecurityScheme, 
  type OpenIdConnectWithConfig, 
  type SecurityScheme, // Type alias
  type AuthScheme // Type alias
} from './auth_schemes';

// From auth_tool.ts
export { 
  AuthConfig, 
  AuthToolArguments 
} from './auth_tool';