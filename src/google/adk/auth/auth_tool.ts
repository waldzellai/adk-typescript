// Auth tool module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the auth tool functionality from the Python SDK

import { AuthCredential } from './auth_credential';
import { AuthScheme } from './auth_schemes';

/**
 * The auth config sent by tool asking client to collect auth credentials.
 * 
 * ADK and client will help to fill in the response.
 */
export class AuthConfig {
  /**
   * The auth scheme used to collect credentials.
   */
  authScheme: AuthScheme;

  /**
   * The raw auth credential used to collect credentials.
   * 
   * The raw auth credentials are used in some auth scheme that needs to exchange auth
   * credentials, e.g., OAuth2 and OIDC. For other auth schemes, it could be null.
   */
  rawAuthCredential: AuthCredential | null;

  /**
   * The exchanged auth credential used to collect credentials.
   * 
   * ADK and client will work together to fill it. For those auth scheme that doesn't need to
   * exchange auth credentials, e.g., API key, service account etc. It's filled by
   * client directly. For those auth scheme that need to exchange auth credentials,
   * e.g., OAuth2 and OIDC, it's first filled by ADK. If the raw credentials
   * passed by tool only has client id and client credential, ADK will help to
   * generate the corresponding authorization uri and state and store the processed
   * credential in this field. If the raw credentials passed by tool already has
   * authorization uri, state, etc. then it's copied to this field. Client will use
   * this field to guide the user through the OAuth2 flow and fill auth response in
   * this field.
   */
  exchangedAuthCredential: AuthCredential | null;

  /**
   * Creates a new AuthConfig.
   */
  constructor(data: {
    authScheme: AuthScheme;
    rawAuthCredential: AuthCredential | null;
    exchangedAuthCredential?: AuthCredential | null;
  }) {
    this.authScheme = data.authScheme;
    this.rawAuthCredential = data.rawAuthCredential;
    this.exchangedAuthCredential = data.exchangedAuthCredential || null;
  }

  /**
   * Creates a deep copy of the AuthConfig.
   */
  clone(): AuthConfig {
    return new AuthConfig({
      authScheme: {...this.authScheme},
      rawAuthCredential: this.rawAuthCredential ? this.rawAuthCredential.clone() : null,
      exchangedAuthCredential: this.exchangedAuthCredential ? this.exchangedAuthCredential.clone() : null
    });
  }
}

/**
 * The arguments for the special long running function tool that is used to
 * request end user credentials.
 */
export class AuthToolArguments {
  /**
   * The ID of the function call.
   */
  functionCallId: string;

  /**
   * The auth configuration.
   */
  authConfig: AuthConfig;

  /**
   * Creates a new AuthToolArguments.
   */
  constructor(data: {
    functionCallId: string;
    authConfig: AuthConfig;
  }) {
    this.functionCallId = data.functionCallId;
    this.authConfig = data.authConfig;
  }
}