import type { OAuthTokenResponse, CachedToken } from '../types/Config';
import { OAuthClient } from './OAuthClient';
import { AuthenticationError } from '../lib/errors';

/**
 * Token Manager for OAuth 2.0 access token caching and refresh
 * 
 * Provides intelligent token caching with automatic refresh before expiration.
 * Handles concurrent requests safely and includes a buffer period to prevent
 * token expiration during API requests.
 */
export class TokenManager {
  private cachedToken: CachedToken | null = null;
  private refreshPromise: Promise<CachedToken> | null = null;
  private readonly bufferSeconds: number = 30; // Refresh 30 seconds before expiry
  private readonly oauthClient: OAuthClient;

  constructor(oauthClient: OAuthClient) {
    this.oauthClient = oauthClient;
  }

  /**
   * Get a valid access token, refreshing if necessary
   * 
   * This method ensures you always get a valid, non-expired token.
   * It handles caching, automatic refresh, and concurrent request deduplication.
   * 
   * @returns Promise resolving to a valid cached token
   * @throws {AuthenticationError} if token refresh fails
   */
  async getValidToken(): Promise<CachedToken> {
    // Return cached token if it's still valid
    if (this.isTokenValid()) {
      return this.cachedToken!;
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Start a new token refresh
    return await this.refreshToken();
  }

  /**
   * Force refresh the OAuth access token
   * 
   * Bypasses cache and requests a fresh token from the OAuth server.
   * Handles concurrent requests by ensuring only one refresh happens at a time.
   * 
   * @returns Promise resolving to the new cached token
   */
  async refreshToken(): Promise<CachedToken> {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Start new refresh operation
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      // Clear the refresh promise when done (success or failure)
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh operation
   */
  private async performTokenRefresh(): Promise<CachedToken> {
    try {
      const tokenResponse = await this.oauthClient.getAccessToken();
      const cachedToken = this.createCachedToken(tokenResponse);
      
      this.cachedToken = cachedToken;
      return cachedToken;
    } catch (error) {
      // Clear invalid cached token on refresh failure
      this.cachedToken = null;
      
      throw error instanceof AuthenticationError 
        ? error 
        : new AuthenticationError(
            'Token refresh failed', 
            error instanceof Error ? error.message : 'Unknown error'
          );
    }
  }

  /**
   * Convert OAuth token response to cached token with expiration time
   */
  private createCachedToken(tokenResponse: OAuthTokenResponse): CachedToken {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + tokenResponse.expires_in;

    const cachedToken: CachedToken = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      expiresAt
    };

    // Only add scope if it exists
    if (tokenResponse.scope) {
      cachedToken.scope = tokenResponse.scope;
    }

    return cachedToken;
  }

  /**
   * Check if the current cached token is valid and not near expiration
   */
  private isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresWithBuffer = this.cachedToken.expiresAt - this.bufferSeconds;

    return now < expiresWithBuffer;
  }

  /**
   * Get current token status information
   * 
   * @returns Object with token status and expiration details
   */
  getTokenStatus(): {
    hasToken: boolean;
    isValid: boolean;
    expiresAt?: number;
    expiresIn?: number;
    tokenType?: string;
  } {
    if (!this.cachedToken) {
      return { hasToken: false, isValid: false };
    }

    const now = Math.floor(Date.now() / 1000);
    const isValid = this.isTokenValid();
    const expiresIn = Math.max(0, this.cachedToken.expiresAt - now);

    return {
      hasToken: true,
      isValid,
      expiresAt: this.cachedToken.expiresAt,
      expiresIn,
      tokenType: this.cachedToken.token_type
    };
  }

  /**
   * Clear the cached token
   * 
   * Forces the next getValidToken() call to fetch a fresh token.
   * Useful when you know the token is invalid or for testing purposes.
   */
  clearToken(): void {
    this.cachedToken = null;
    this.refreshPromise = null;
  }

  /**
   * Check if a token refresh is currently in progress
   */
  isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }

  /**
   * Get the cached token without validation (for debugging)
   * 
   * @returns The raw cached token or null if none exists
   */
  getRawToken(): CachedToken | null {
    return this.cachedToken;
  }
}