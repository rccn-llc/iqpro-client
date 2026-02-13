import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../src/lib/ApiClient';
import { RequestSigner } from '../src/auth/RequestSigner';
import { NetworkError, RateLimitError, AuthenticationError } from '../src/lib/errors';
import type { IQProConfig } from '../src/types/Config';

// Mock RequestSigner
vi.mock('../src/auth/RequestSigner');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  let config: IQProConfig;
  let mockRequestSigner: RequestSigner;
  let apiClient: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'api://iq-pro-api/.default',
      oauthUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
      baseUrl: 'https://api.iqpro.com',
      timeout: 5000,
      retryAttempts: 2
    };

    mockRequestSigner = new RequestSigner({} as any);
    apiClient = new ApiClient(config, mockRequestSigner);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      // Mock successful response
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      // Mock RequestSigner.executeAuthenticatedRequest
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );
    });

    it('should make GET request', async () => {
      const result = await apiClient.get('/test');

      expect(mockRequestSigner.executeAuthenticatedRequest).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should make POST request with body', async () => {
      const body = { name: 'Test User' };
      await apiClient.post('/users', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should make PUT request', async () => {
      const body = { id: 1, name: 'Updated User' };
      await apiClient.put('/users/1', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body)
        })
      );
    });

    it('should make DELETE request', async () => {
      await apiClient.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/users/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should make PATCH request', async () => {
      const body = { name: 'Patched User' };
      await apiClient.patch('/users/1', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body)
        })
      );
    });

    it('should handle query parameters', async () => {
      await apiClient.get('/users', { 
        query: { page: 1, limit: 10, active: true } 
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.iqpro.com/users?page=1&limit=10&active=true',
        expect.any(Object)
      );
    });

    it('should handle custom headers', async () => {
      await apiClient.get('/test', { 
        headers: { 'X-Custom-Header': 'custom-value' } 
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should handle string body', async () => {
      await apiClient.post('/data', 'raw string data', {
        headers: { 'Content-Type': 'text/plain' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: 'raw string data'
        })
      );
    });
  });

  describe('Response Handling', () => {
    beforeEach(() => {
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
      
      const result = await apiClient.delete('/users/1');
      expect(result).toEqual({});
    });

    it('should handle JSON response', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
      
      const result = await apiClient.get('/users/1');
      expect(result).toEqual(responseData);
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValue(new Response(
        'invalid json',
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow(NetworkError);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue(new Response(
        'Unauthorized',
        { status: 401 }
      ));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should handle 429 Rate Limit', async () => {
      mockFetch.mockResolvedValue(new Response(
        'Rate limit exceeded',
        { 
          status: 429, 
          headers: { 'Retry-After': '60' }
        }
      ));
      
      const error = await apiClient.get('/test').catch(e => e);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.retryAfter).toBe(60);
    });

    it('should handle 500 Server Error', async () => {
      mockFetch.mockResolvedValue(new Response(
        'Internal Server Error',
        { status: 500 }
      ));
      
      const error = await apiClient.get('/test').catch(e => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.statusCode).toBe(500);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow('Network failure');
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );
    });

    it('should retry on 500 errors', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response(
          JSON.stringify({ success: true }),
          { status: 200 }
        ));

      const result = await apiClient.get('/test');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on 400 errors', async () => {
      mockFetch.mockResolvedValue(new Response('Bad Request', { status: 400 }));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow(NetworkError);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on authentication errors', async () => {
      mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow(AuthenticationError);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      mockFetch.mockResolvedValue(new Response('Server Error', { status: 500 }));
      
      await expect(apiClient.get('/test'))
        .rejects
        .toThrow(NetworkError);
      
      // Should try initial + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );

      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({ success: true }),
        { status: 200 }
      ));
    });

    it('should track rate limit status', () => {
      const status = apiClient.getRateLimitStatus();
      
      expect(status).toHaveProperty('requestsRemaining');
      expect(status).toHaveProperty('windowResetTime');
      expect(status).toHaveProperty('isLimited');
      expect(status.requestsRemaining).toBeLessThanOrEqual(100);
    });

    it('should update rate limit after requests', async () => {
      const initialStatus = apiClient.getRateLimitStatus();
      await apiClient.get('/test');
      const afterStatus = apiClient.getRateLimitStatus();

      expect(afterStatus.requestsRemaining).toBe(initialStatus.requestsRemaining - 1);
    });

    it('should enforce rate limit', async () => {
      // Make many requests to hit rate limit
      const promises = Array.from({ length: 101 }, (_, i) => apiClient.get(`/test${i}`));
      
      // The 101st request should fail with rate limit error
      await expect(Promise.all(promises))
        .rejects
        .toThrow(RateLimitError);
    });
  });

  describe('Request Timeout', () => {
    beforeEach(() => {
      mockRequestSigner.executeAuthenticatedRequest = vi.fn().mockImplementation(
        async (requestFn) => {
          const authHeaders = { Authorization: 'Bearer test-token' };
          return requestFn(authHeaders);
        }
      );
    });

    it('should include timeout signal in requests', async () => {
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({ success: true }),
        { status: 200 }
      ));

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });
});