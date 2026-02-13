import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuthClient } from '../src/auth/OAuthClient';
import { TokenManager } from '../src/auth/TokenManager';
import { RequestSigner } from '../src/auth/RequestSigner';
import { AuthenticationError, NetworkError } from '../src/lib/errors';
import type { IQProConfig } from '../src/types/Config';

// Mock fetch globally
global.fetch = vi.fn();

describe('OAuth Authentication Components', () => {
  let mockConfig: IQProConfig;

  beforeEach(() => {
    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret', 
      scope: 'https://account.basyspro.com/8939cd8f-0b21-4654-8f4d-ee01706dc3d6/.default',
      oauthUrl: 'https://mock-oauth.example.com/token',
      baseUrl: 'https://api.basyspro.com/iqsaas/v1',
      timeout: 5000,
      retryAttempts: 1
    };
    vi.clearAllMocks();
  });

  describe('OAuthClient', () => {
    it('should successfully exchange credentials for token', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: mockConfig.scope
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      };

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const oauthClient = new OAuthClient(mockConfig);
      const token = await oauthClient.getAccessToken();
      
      expect(token).toEqual(mockTokenResponse);
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.oauthUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }),
          body: expect.stringContaining('grant_type=client_credentials')
        })
      );
    });

    it('should handle 401 authentication errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid client credentials'),
      };

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const oauthClient = new OAuthClient(mockConfig);
      
      await expect(oauthClient.getAccessToken()).rejects.toThrow(AuthenticationError);
    });

    it('should handle network timeouts', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      vi.mocked(fetch).mockRejectedValueOnce(abortError);

      const oauthClient = new OAuthClient(mockConfig);
      
      await expect(oauthClient.getAccessToken()).rejects.toThrow(NetworkError);
    });

    it('should validate token response structure', async () => {
      const invalidResponse = {
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      };

      vi.mocked(fetch).mockResolvedValueOnce(invalidResponse as any);

      const oauthClient = new OAuthClient(mockConfig);
      
      await expect(oauthClient.getAccessToken()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('TokenManager', () => {
    it('should cache tokens and return cached valid tokens', async () => {
      const mockTokenResponse = {
        access_token: 'cached-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: mockConfig.scope
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      
      // First call - should fetch from OAuth server
      const token1 = await tokenManager.getValidToken();
      expect(token1.access_token).toBe('cached-token');
      
      // Second call - should return cached token (no new fetch)
      const token2 = await tokenManager.getValidToken();
      expect(token2.access_token).toBe('cached-token');
      
      // Should only have called fetch once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh expired tokens', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'first-token',
            token_type: 'Bearer',
            expires_in: 1, // Very short expiry
            scope: mockConfig.scope
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true, 
          json: () => Promise.resolve({
            access_token: 'refreshed-token',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: mockConfig.scope
          }),
        } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      
      // Get initial token
      const token1 = await tokenManager.getValidToken();
      expect(token1.access_token).toBe('first-token');
      
      // Wait for token to expire (simulate time passing)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should fetch new token
      const token2 = await tokenManager.getValidToken();
      expect(token2.access_token).toBe('refreshed-token');
      
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should provide token status information', async () => {
      const mockTokenResponse = {
        access_token: 'status-token',
        token_type: 'Bearer', 
        expires_in: 3600,
        scope: mockConfig.scope
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      
      // Before getting token
      let status = tokenManager.getTokenStatus();
      expect(status.hasToken).toBe(false);
      expect(status.isValid).toBe(false);
      
      // After getting token
      await tokenManager.getValidToken();
      status = tokenManager.getTokenStatus();
      expect(status.hasToken).toBe(true);
      expect(status.isValid).toBe(true);
      expect(status.tokenType).toBe('Bearer');
    });

    it('should clear cached tokens', async () => {
      const mockTokenResponse = {
        access_token: 'clear-test-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: mockConfig.scope
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      
      // Get token
      await tokenManager.getValidToken();
      expect(tokenManager.getTokenStatus().hasToken).toBe(true);
      
      // Clear token
      tokenManager.clearToken();
      expect(tokenManager.getTokenStatus().hasToken).toBe(false);
    });
  });

  describe('RequestSigner', () => {
    it('should sign requests with Bearer tokens', async () => {
      const mockTokenResponse = {
        access_token: 'signer-test-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: mockConfig.scope
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      const requestSigner = new RequestSigner(tokenManager);
      
      const headers: Record<string, string> = {};
      await requestSigner.signRequest(headers);
      
      expect(headers['Authorization']).toBe('Bearer signer-test-token');
    });

    it('should create authenticated fetch function', async () => {
      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      const requestSigner = new RequestSigner(tokenManager);
      
      const authenticatedFetch = requestSigner.createAuthenticatedFetch();
      expect(typeof authenticatedFetch).toBe('function');
    });

    it('should handle authentication retry on 401 errors', async () => {
      // Mock initial token
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'initial-token',
            token_type: 'Bearer',
            expires_in: 3600
          }),
        } as any)
        // Mock 401 API response
        .mockResolvedValueOnce({
          ok: false,
          status: 401  
        } as any)
        // Mock refresh token
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'retry-token',
            token_type: 'Bearer', 
            expires_in: 3600
          }),
        } as any)
        // Mock successful retry
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as any);

      const oauthClient = new OAuthClient(mockConfig);
      const tokenManager = new TokenManager(oauthClient);
      const requestSigner = new RequestSigner(tokenManager);
      
      const result = await requestSigner.executeAuthenticatedRequest(async (headers) => {
        const response = await fetch('https://api.example.com/test', { headers });
        if (!response.ok) {
          throw new AuthenticationError(`HTTP ${response.status}`);
        }
        return response.json();
      });
      
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(4); // Initial token + 401 + refresh + retry
    });
  });
});