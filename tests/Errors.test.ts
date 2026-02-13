import { describe, it, expect } from 'vitest';
import {
  IQProError,
  AuthenticationError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  RateLimitError
} from '../src/lib/errors';

describe('Error Classes', () => {
  describe('IQProError', () => {
    it('should create base error with message', () => {
      const error = new IQProError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('IQProError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBeUndefined();
    });

    it('should create base error with message and code', () => {
      const error = new IQProError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Auth failed');
      
      expect(error).toBeInstanceOf(IQProError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication failed: Auth failed');
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('should include details in message', () => {
      const error = new AuthenticationError('Invalid credentials', 'Check your client ID');
      
      expect(error.message).toBe('Authentication failed: Invalid credentials - Check your client ID');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Missing required config');
      
      expect(error).toBeInstanceOf(IQProError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing required config');
      expect(error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input data');
      
      expect(error).toBeInstanceOf(IQProError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input data');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error).toBeInstanceOf(IQProError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBeUndefined();
    });

    it('should include status code', () => {
      const error = new NetworkError('Server error', 500);
      
      expect(error.statusCode).toBe(500);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBeUndefined();
    });

    it('should include retry after time', () => {
      const error = new RateLimitError('Rate limited', 60);
      
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const authError = new AuthenticationError('test');
      const networkError = new NetworkError('test');
      const rateLimitError = new RateLimitError('test');
      
      expect(authError instanceof Error).toBe(true);
      expect(authError instanceof IQProError).toBe(true);
      expect(authError instanceof AuthenticationError).toBe(true);
      
      expect(networkError instanceof Error).toBe(true);
      expect(networkError instanceof IQProError).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);
      
      expect(rateLimitError instanceof Error).toBe(true);
      expect(rateLimitError instanceof IQProError).toBe(true);
      expect(rateLimitError instanceof NetworkError).toBe(true);
      expect(rateLimitError instanceof RateLimitError).toBe(true);
    });
  });
});