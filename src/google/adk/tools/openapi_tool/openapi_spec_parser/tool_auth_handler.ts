// Tool authentication handler for the Google Agent Development Kit (ADK) in TypeScript
// Handles authentication for REST API tools

import { AuthCredential } from '../../../auth/auth_credential';
import { AuthScheme } from '../../../auth/auth_schemes';

/**
 * Handles authentication for REST API tools.
 */
export class ToolAuthHandler {
  /**
   * The auth scheme to use.
   */
  private authScheme?: AuthScheme;
  
  /**
   * The auth credential to use.
   */
  private authCredential?: AuthCredential;

  /**
   * Sets the auth scheme.
   * 
   * @param authScheme The auth scheme
   */
  setAuthScheme(authScheme: AuthScheme): void {
    this.authScheme = authScheme;
  }

  /**
   * Sets the auth credential.
   * 
   * @param authCredential The auth credential
   */
  setAuthCredential(authCredential: AuthCredential): void {
    this.authCredential = authCredential;
  }

  /**
   * Applies auth to a fetch request.
   * 
   * @param request The fetch request to apply auth to
   */
  applyAuth(request: RequestInit): void {
    if (!this.authScheme || !this.authCredential) {
      return;
    }
    
    // Initialize headers if not present
    if (!request.headers) {
      request.headers = {};
    }
    
    // Ensure request.headers is a plain object (not a Headers instance)
    const headers = request.headers instanceof Headers 
      ? Object.fromEntries([...request.headers.entries()])
      : { ...(request.headers as Record<string, string>) };
    
    // Apply auth based on the scheme type
    switch (this.authScheme.type) {
    case 'apiKey':
      this.applyApiKeyAuth(headers);
      break;
    case 'http':
      this.applyHttpAuth(headers);
      break;
    case 'oauth2':
      this.applyOAuth2Auth(headers);
      break;
    default:
      console.warn(`Unsupported auth scheme type: ${this.authScheme.type}`);
    }
    
    // Update the request headers
    request.headers = headers;
  }
  
  /**
   * Applies API key authentication.
   * 
   * @param headers The headers to apply auth to
   */
  private applyApiKeyAuth(headers: Record<string, string>): void {
    if (!this.authScheme || !this.authCredential) {
      return;
    }
    
    // API key can be in header, query, or cookie
    if (this.authScheme.in === 'header' && this.authScheme.name && typeof this.authScheme.name === 'string') {
      headers[this.authScheme.name] = this.authCredential.getCredential();
    }
    // Note: query and cookie params should be handled in URL building
  }
  
  /**
   * Applies HTTP authentication.
   * 
   * @param headers The headers to apply auth to
   */
  private applyHttpAuth(headers: Record<string, string>): void {
    if (!this.authScheme || !this.authCredential) {
      return;
    }
    
    // Handle different HTTP auth schemes
    if (this.authScheme.scheme === 'basic') {
      // Get username and password from credential
      const [username, password] = this.authCredential.getCredential().split(':');
      
      if (username && password) {
        // Create Basic auth header
        const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${base64Credentials}`;
      }
    } else if (this.authScheme.scheme === 'bearer') {
      // Create Bearer auth header
      headers['Authorization'] = `Bearer ${this.authCredential.getCredential()}`;
    } else {
      console.warn(`Unsupported HTTP auth scheme: ${this.authScheme.scheme}`);
    }
  }
  
  /**
   * Applies OAuth 2.0 authentication.
   * 
   * @param headers The headers to apply auth to
   */
  private applyOAuth2Auth(headers: Record<string, string>): void {
    if (!this.authCredential) {
      return;
    }
    
    // Assume the credential is an OAuth 2.0 token
    headers['Authorization'] = `Bearer ${this.authCredential.getCredential()}`;
  }
}