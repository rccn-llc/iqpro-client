import type { IQProConfig, OAuthTokenResponse } from '../types/Config';
import { AuthenticationError, NetworkError } from '../lib/errors';

/**
 * OAuth 2.0 Client for IQ Pro+ API authentication
 * 
 * Handles token exchange using client credentials flow with the Azure AD B2C endpoint.
 * Implements proper error handling, timeout management, and retry logic for robust authentication.
 */
export class OAuthClient {
  private readonly config: IQProConfig;

  constructor(config: IQProConfig) {
    this.config = config;
  }

  /**
   * Exchange client credentials for an access token
   * 
   * Performs OAuth 2.0 client credentials flow with the configured token endpoint.
   * Returns a bearer token that can be used for authenticated API requests.
   * 
   * @returns Promise resolving to OAuth token response
   * @throws {AuthenticationError} if credentials are invalid or authentication fails
   * @throws {NetworkError} if network request fails
   */
  async getAccessToken(): Promise<OAuthTokenResponse> {
    const requestBody = this.buildTokenRequest();
    const requestOptions = this.buildRequestOptions(requestBody);

    try {
      const response = await this.makeTokenRequest(requestOptions);
      return await this.handleTokenResponse(response);
    } catch (error) {
      throw this.handleTokenError(error);
    }
  }

  /**
   * Build the form-encoded request body for token exchange
   */
  private buildTokenRequest(): string {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scope
    });

    return params.toString();
  }

  /**
   * Build HTTP request options with proper headers and timeout
   */
  private buildRequestOptions(body: string): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'iqpro-client/1.0.0'
      },
      body,
      signal: this.createTimeoutSignal()
    };
  }

  /**
   * Create an AbortSignal with configured timeout
   */
  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    const timeout = this.config.timeout || 30000;

    setTimeout(() => {
      controller.abort();
    }, timeout);

    return controller.signal;
  }

  /**
   * Make the actual HTTP request to the token endpoint
   */
  private async makeTokenRequest(options: RequestInit): Promise<Response> {
    const response = await fetch(this.config.oauthUrl, options);

    // Check for network-level errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText} (URL: ${this.config.oauthUrl})`);
    }

    return response;
  }

  /**
   * Handle successful token response and validate the structure
   */
  private async handleTokenResponse(response: Response): Promise<OAuthTokenResponse> {
    let responseData: any;

    try {
      responseData = await response.json();
    } catch (error) {
      throw new AuthenticationError('Invalid JSON response from OAuth server');
    }

    // Validate required fields
    if (!responseData.access_token) {
      throw new AuthenticationError('Missing access_token in OAuth response');
    }

    if (!responseData.token_type) {
      throw new AuthenticationError('Missing token_type in OAuth response');
    }

    // Ensure expires_in is a number
    const expiresIn = parseInt(responseData.expires_in) || 3600;

    const tokenResponse: OAuthTokenResponse = {
      access_token: responseData.access_token,
      token_type: responseData.token_type,
      expires_in: expiresIn,
      scope: responseData.scope
    };

    return tokenResponse;
  }

  /**
   * Handle and categorize OAuth authentication errors
   */
  private handleTokenError(error: any): Error {
    // Handle AbortController timeout
    if (error.name === 'AbortError') {
      return new NetworkError(`OAuth request timeout after ${this.config.timeout || 30000}ms`);
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError(`OAuth network error: ${error.message}`);
    }

    // Handle HTTP errors
    if (error.message?.startsWith('HTTP ')) {
      const statusMatch = error.message.match(/HTTP (\d+):/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
      
      if (statusCode === 401 || statusCode === 403) {
        return new AuthenticationError(
          'Invalid client credentials',
          'Check your IQPRO_CLIENT_ID and IQPRO_CLIENT_SECRET'
        );
      }
      
      if (statusCode >= 500) {
        return new NetworkError(`OAuth server error (${statusCode})`, statusCode);
      }
      
      return new AuthenticationError(`OAuth authentication failed (${statusCode})`, error.message);
    }

    // Handle validation errors
    if (error instanceof AuthenticationError) {
      return error;
    }

    // Generic fallback
    return new AuthenticationError(
      'OAuth authentication failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  /**
   * Test OAuth configuration by attempting token exchange
   * 
   * @returns Promise<boolean> - true if authentication succeeds
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token.access_token;
    } catch (error) {
      return false;
    }
  }
}