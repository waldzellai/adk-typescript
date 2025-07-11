// Auth credential module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the auth credential functionality from the Python SDK

/**
 * Base model with extra property access
 */
export interface BaseModelWithConfig {
  [key: string]: string | number | boolean | object | undefined;
}

/**
 * Represents the secret token value for HTTP authentication, like user name, password, oauth token, etc.
 */
export class HttpCredentials implements BaseModelWithConfig {
  username?: string;
  password?: string;
  token?: string;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: Partial<HttpCredentials> = {}) {
    this.username = data.username;
    this.password = data.password;
    this.token = data.token;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'username' && key !== 'password' && key !== 'token') {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }

  static fromObject(data: Record<string, unknown>): HttpCredentials {
    return new HttpCredentials({
      username: data.username as string,
      password: data.password as string,
      token: data.token as string,
      ...data
    });
  }
}

/**
 * Define known authentication schemes
 */
export type AuthScheme = 'basic' | 'bearer' | string; // Allow other strings for flexibility

/**
 * The credentials and metadata for HTTP authentication.
 */
export class HttpAuth implements BaseModelWithConfig {
  /**
   * The name of the HTTP Authorization scheme to be used in the Authorization
   * header as defined in RFC7235. The values used SHOULD be registered in the
   * IANA Authentication Scheme registry.
   * Examples: 'basic', 'bearer'
   */
  scheme: AuthScheme;
  credentials: HttpCredentials;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: { scheme: AuthScheme; credentials: HttpCredentials } & Record<string, unknown>) {
    this.scheme = data.scheme;
    this.credentials = data.credentials;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'scheme' && key !== 'credentials') {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }
}

/**
 * Represents credential value and its metadata for an OAuth2 credential.
 */
export class OAuth2Auth implements BaseModelWithConfig {
  clientId?: string;
  clientSecret?: string;
  // tool or adk can generate the auth_uri with the state info thus client
  // can verify the state
  authUri?: string;
  state?: string;
  // tool or adk can decide the redirect_uri if they don't want client to decide
  redirectUri?: string;
  authResponseUri?: string;
  authCode?: string;
  token?: Record<string, unknown>;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: Partial<OAuth2Auth> = {}) {
    this.clientId = data.clientId;
    this.clientSecret = data.clientSecret;
    this.authUri = data.authUri;
    this.state = data.state;
    this.redirectUri = data.redirectUri;
    this.authResponseUri = data.authResponseUri;
    this.authCode = data.authCode;
    this.token = data.token;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (!['clientId', 'clientSecret', 'authUri', 'state', 'redirectUri', 
        'authResponseUri', 'authCode', 'token'].includes(key)) {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }
}

/**
 * Represents Google Service Account configuration.
 */
export class ServiceAccountCredential implements BaseModelWithConfig {
  type: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  authProviderX509CertUrl: string;
  clientX509CertUrl: string;
  universeDomain: string;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: {
    type: string;
    projectId: string;
    privateKeyId: string;
    privateKey: string;
    clientEmail: string;
    clientId: string;
    authUri: string;
    tokenUri: string;
    authProviderX509CertUrl: string;
    clientX509CertUrl: string;
    universeDomain: string;
  } & Record<string, unknown>) {
    this.type = data.type;
    this.projectId = data.projectId;
    this.privateKeyId = data.privateKeyId;
    this.privateKey = data.privateKey;
    this.clientEmail = data.clientEmail;
    this.clientId = data.clientId;
    this.authUri = data.authUri;
    this.tokenUri = data.tokenUri;
    this.authProviderX509CertUrl = data.authProviderX509CertUrl;
    this.clientX509CertUrl = data.clientX509CertUrl;
    this.universeDomain = data.universeDomain;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (!['type', 'projectId', 'privateKeyId', 'privateKey', 'clientEmail', 'clientId',
        'authUri', 'tokenUri', 'authProviderX509CertUrl', 'clientX509CertUrl', 
        'universeDomain'].includes(key)) {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }
}

/**
 * Represents Google Service Account configuration.
 */
export class ServiceAccount implements BaseModelWithConfig {
  serviceAccountCredential?: ServiceAccountCredential;
  scopes: string[];
  useDefaultCredential?: boolean;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: {
    serviceAccountCredential?: ServiceAccountCredential;
    scopes: string[];
    useDefaultCredential?: boolean;
  } & Record<string, unknown>) {
    this.serviceAccountCredential = data.serviceAccountCredential;
    this.scopes = data.scopes;
    this.useDefaultCredential = data.useDefaultCredential;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (!['serviceAccountCredential', 'scopes', 'useDefaultCredential'].includes(key)) {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }
}

/**
 * Represents the type of authentication credential.
 */
export enum AuthCredentialTypes {
  /**
   * API Key credential:
   * https://swagger.io/docs/specification/v3_0/authentication/api-keys/
   */
  API_KEY = 'apiKey',

  /**
   * Credentials for HTTP Auth schemes:
   * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml
   */
  HTTP = 'http',

  /**
   * OAuth2 credentials:
   * https://swagger.io/docs/specification/v3_0/authentication/oauth2/
   */
  OAUTH2 = 'oauth2',

  /**
   * OpenID Connect credentials:
   * https://swagger.io/docs/specification/v3_0/authentication/openid-connect-discovery/
   */
  OPEN_ID_CONNECT = 'openIdConnect',

  /**
   * Service Account credentials:
   * https://cloud.google.com/iam/docs/service-account-creds
   */
  SERVICE_ACCOUNT = 'serviceAccount'
}

/**
 * Data class representing an authentication credential.
 * 
 * To exchange for the actual credential, please use CredentialExchanger.exchangeCredential().
 */
export class AuthCredential implements BaseModelWithConfig {
  authType: AuthCredentialTypes;
  
  // Resource reference for the credential.
  // This will be supported in the future.
  resourceRef?: string;
  
  apiKey?: string;
  http?: HttpAuth;
  serviceAccount?: ServiceAccount;
  oauth2?: OAuth2Auth;
  [key: string]: string | number | boolean | object | undefined;

  constructor(data: {
    authType: AuthCredentialTypes;
    resourceRef?: string;
    apiKey?: string;
    http?: HttpAuth;
    serviceAccount?: ServiceAccount;
    oauth2?: OAuth2Auth;
  } & Record<string, unknown>) {
    this.authType = data.authType;
    this.resourceRef = data.resourceRef;
    this.apiKey = data.apiKey;
    this.http = data.http;
    this.serviceAccount = data.serviceAccount;
    this.oauth2 = data.oauth2;
    
    // Add any extra fields
    for (const [key, value] of Object.entries(data)) {
      if (!['authType', 'resourceRef', 'apiKey', 'http', 'serviceAccount', 'oauth2'].includes(key)) {
        (this as Record<string, unknown>)[key] = value;
      }
    }
  }

  /**
   * Get the credential value based on auth type.
   */
  getCredential(): string {
    switch (this.authType) {
      case AuthCredentialTypes.API_KEY:
        return this.apiKey || '';
      case AuthCredentialTypes.HTTP:
        return this.http?.credentials?.token || '';
      case AuthCredentialTypes.OAUTH2:
        return typeof this.oauth2?.token === 'object' ? 
          JSON.stringify(this.oauth2.token) : String(this.oauth2?.token || '');
      case AuthCredentialTypes.SERVICE_ACCOUNT:
        return JSON.stringify(this.serviceAccount?.serviceAccountCredential || {});
      default:
        return '';
    }
  }

  /**
   * Create a deep copy of the AuthCredential.
   */
  clone(): AuthCredential {
    return new AuthCredential({
      resourceRef: this.resourceRef,
      apiKey: this.apiKey,
      http: this.http ? new HttpAuth({
        ...this.http
      }) : undefined,
      serviceAccount: this.serviceAccount ? new ServiceAccount({
        serviceAccountCredential: this.serviceAccount.serviceAccountCredential ? 
          new ServiceAccountCredential({...this.serviceAccount.serviceAccountCredential}) : undefined,
        useDefaultCredential: this.serviceAccount.useDefaultCredential,
        ...this.serviceAccount
      }) : undefined,
      oauth2: this.oauth2 ? new OAuth2Auth({...this.oauth2}) : undefined,
      ...this
    });
  }
}