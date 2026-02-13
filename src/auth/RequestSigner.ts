import { TokenManager } from './TokenManager';
import { AuthenticationError, NetworkError } from '../lib/errors';

/**
 * Request Signer for OAuth 2.0 authenticated API requests
 * 
 * Middleware that automatically attaches Bearer tokens to HTTP requests.
 * Handles authentication errors, token refresh, and retry logic for
 * seamless API authentication.
 */
export class RequestSigner {
  private readonly tokenManager: TokenManager;
  private readonly maxRetries: number = 1;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Sign an HTTP request with OAuth Bearer token
   * 
   * Automatically adds the Authorization header with a valid Bearer token.
   * Handles token refresh if the current token is expired or near expiration.
   * 
   * @param headers - Existing request headers (will be modified)
   * @returns Promise resolving when headers are signed
   * @throws {AuthenticationError} if token cannot be obtained
   */
  async signRequest(headers: Record<string, string>): Promise<void> {
    const token = await this.tokenManager.getValidToken();
    headers['Authorization'] = `Bearer ${token.access_token}`;
  }

  /**
   * Execute an authenticated HTTP request with automatic retry
   * 
   * Performs the request with OAuth authentication, automatically retrying
   * if authentication fails (e.g., due to token expiration).
   * 
   * @param requestFn - Function that performs the HTTP request
   * @param retryCount - Current retry attempt (for internal use)
   * @returns Promise resolving to the request response
   */
  async executeAuthenticatedRequest<T>(
    requestFn: (headers: Record<string, string>) => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      // Prepare headers with authentication
      const headers: Record<string, string> = {};
      await this.signRequest(headers);

      // Execute the request
      return await requestFn(headers);
    } catch (error) {
      // Handle authentication errors with retry logic
      if (this.isAuthenticationError(error) && retryCount < this.maxRetries) {
        return await this.handleAuthenticationRetry(requestFn, retryCount);
      }

      // Re-throw non-authentication errors or exhausted retries
      throw error;
    }
  }

  /**
   * Handle authentication error with token refresh and retry
   */
  private async handleAuthenticationRetry<T>(
    requestFn: (headers: Record<string, string>) => Promise<T>,
    retryCount: number
  ): Promise<T> {
    try {
      // Force refresh the token
      await this.tokenManager.refreshToken();

      // Retry the request with fresh token
      return await this.executeAuthenticatedRequest(requestFn, retryCount + 1);
    } catch (refreshError) {
      throw new AuthenticationError(
        'Authentication failed after token refresh',
        refreshError instanceof Error ? refreshError.message : 'Unknown error'
      );
    }
  }

  /**
   * Check if an error indicates authentication failure
   */
  private isAuthenticationError(error: any): boolean {
    // Check for explicit authentication errors
    if (error instanceof AuthenticationError) {
      return true;
    }

    // Check for HTTP 401 (Unauthorized) responses
    if (error instanceof NetworkError && error.statusCode === 401) {
      return true;
    }

    // Check for common authentication error patterns in messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('unauthorized') || 
             message.includes('invalid token') ||
             message.includes('token expired') ||
             message.includes('authentication failed');
    }

    return false;
  }

  /**
   * Create an authenticated fetch function with automatic token handling
   * 
   * Returns a wrapper around fetch() that automatically includes OAuth
   * authentication headers and handles token refresh.
   * 
   * @param baseHeaders - Base headers to include in all requests
   * @returns Authenticated fetch function
   */
  createAuthenticatedFetch(baseHeaders: Record<string, string> = {}): 
    (url: string, options?: RequestInit) => Promise<Response> {
    
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
      return await this.executeAuthenticatedRequest(async (authHeaders) => {
        // Merge base headers, auth headers, and request-specific headers
        const finalHeaders = {
          ...baseHeaders,
          ...authHeaders,
          ...(options.headers as Record<string, string> || {})
        };

        const requestOptions: RequestInit = {
          ...options,
          headers: finalHeaders
        };

        const response = await fetch(url, requestOptions);

        // Check for authentication errors
        if (response.status === 401) {
          throw new AuthenticationError(`HTTP 401: ${await response.text().catch(() => 'Unauthorized')}`);
        }

        // Check for other HTTP errors
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new NetworkError(`HTTP ${response.status}: ${errorText}`, response.status);
        }

        return response;
      });
    };
  }

  /**
   * Get current authentication status
   * 
   * @returns Authentication status information
   */
  async getAuthenticationStatus(): Promise<{
    authenticated: boolean;
    tokenStatus: ReturnType<TokenManager['getTokenStatus']>;
    error?: string;
  }> {
    try {
      const tokenStatus = this.tokenManager.getTokenStatus();
      
      // Try to get a valid token to verify authentication
      if (tokenStatus.hasToken && tokenStatus.isValid) {
        return { authenticated: true, tokenStatus };
      }

      // Try to refresh token if available but expired
      await this.tokenManager.getValidToken();
      const newTokenStatus = this.tokenManager.getTokenStatus();
      
      return { authenticated: true, tokenStatus: newTokenStatus };
    } catch (error) {
      return {
        authenticated: false,
        tokenStatus: this.tokenManager.getTokenStatus(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Manually refresh the authentication token
   * 
   * Forces a token refresh, useful for testing or manual token management.
   * 
   * @returns Promise resolving when token is refreshed
   */
  async refreshAuthentication(): Promise<void> {
    await this.tokenManager.refreshToken();
  }

  /**
   * Clear cached authentication
   * 
   * Clears the cached token, forcing a fresh authentication on the next request.
   */
  clearAuthentication(): void {
    this.tokenManager.clearToken();
  }
}