import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../src/config/ConfigManager';
import { ConfigurationError } from '../src/lib/errors';
import type { IQProConfig } from '../src/types/Config';

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}));

describe('ConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear relevant environment variables
    delete process.env.IQPRO_CLIENT_ID;
    delete process.env.IQPRO_CLIENT_SECRET;
    delete process.env.IQPRO_SCOPE;
    delete process.env.IQPRO_OAUTH_URL;
    delete process.env.IQPRO_BASE_URL;
    delete process.env.IQPRO_TIMEOUT;
    delete process.env.IQPRO_RETRY_ATTEMPTS;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load config from user input', () => {
      const userConfig: Partial<IQProConfig> = {
        clientId: 'user-client-id',
        clientSecret: 'user-client-secret',
        scope: 'custom-scope',
        oauthUrl: 'https://custom-oauth.example.com/token',
        baseUrl: 'https://custom-api.example.com',
        timeout: 10000,
        retryAttempts: 2
      };

      const config = ConfigManager.loadConfig(userConfig);

      expect(config.clientId).toBe('user-client-id');
      expect(config.clientSecret).toBe('user-client-secret');
      expect(config.scope).toBe('custom-scope');
      expect(config.oauthUrl).toBe('https://custom-oauth.example.com/token');
      expect(config.baseUrl).toBe('https://custom-api.example.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(2);
    });

    it('should load config from environment variables', () => {
      process.env.IQPRO_CLIENT_ID = 'env-client-id';
      process.env.IQPRO_CLIENT_SECRET = 'env-client-secret';
      process.env.IQPRO_SCOPE = 'env-scope';
      process.env.IQPRO_OAUTH_URL = 'https://env-oauth.example.com/token';
      process.env.IQPRO_BASE_URL = 'https://env-api.example.com';
      process.env.IQPRO_TIMEOUT = '15000';
      process.env.IQPRO_RETRY_ATTEMPTS = '4';

      const config = ConfigManager.loadConfig();

      expect(config.clientId).toBe('env-client-id');
      expect(config.clientSecret).toBe('env-client-secret');
      expect(config.scope).toBe('env-scope');
      expect(config.oauthUrl).toBe('https://env-oauth.example.com/token');
      expect(config.baseUrl).toBe('https://env-api.example.com');
      expect(config.timeout).toBe(15000);
      expect(config.retryAttempts).toBe(4);
    });

    it('should use default values when not provided', () => {
      process.env.IQPRO_CLIENT_ID = 'test-client-id';
      process.env.IQPRO_CLIENT_SECRET = 'test-client-secret';

      const config = ConfigManager.loadConfig();

      expect(config.scope).toBe('https://account.basyspro.com/8939cd8f-0b21-4654-8f4d-ee01706dc3d6/.default');
      expect(config.oauthUrl).toBe('https://account.basyspro.com/account.basyspro.com/B2C_1A_IQPROV2_INTEGRATOR/oauth2/v2.0/token');
      expect(config.baseUrl).toBe('https://api.basyspro.com/iqsaas/v1');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should prioritize user config over environment variables', () => {
      process.env.IQPRO_CLIENT_ID = 'env-client-id';
      process.env.IQPRO_CLIENT_SECRET = 'env-client-secret';
      process.env.IQPRO_TIMEOUT = '20000';

      const userConfig: Partial<IQProConfig> = {
        clientId: 'user-client-id',
        timeout: 25000
      };

      const config = ConfigManager.loadConfig(userConfig);

      expect(config.clientId).toBe('user-client-id'); // User config wins
      expect(config.clientSecret).toBe('env-client-secret'); // Env var used
      expect(config.timeout).toBe(25000); // User config wins
    });

    it('should throw ConfigurationError for missing client ID', () => {
      expect(() => {
        ConfigManager.loadConfig();
      }).toThrow(ConfigurationError);

      expect(() => {
        ConfigManager.loadConfig({ clientSecret: 'test-secret' });
      }).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing client secret', () => {
      expect(() => {
        ConfigManager.loadConfig({ clientId: 'test-client-id' });
      }).toThrow(ConfigurationError);
    });

    it('should handle invalid timeout values', () => {
      process.env.IQPRO_CLIENT_ID = 'test-client-id';
      process.env.IQPRO_CLIENT_SECRET = 'test-client-secret';
      process.env.IQPRO_TIMEOUT = 'invalid-timeout';

      const config = ConfigManager.loadConfig();

      expect(config.timeout).toBe(30000); // Should default to 30000
    });

    it('should handle invalid retry attempts values', () => {
      process.env.IQPRO_CLIENT_ID = 'test-client-id';
      process.env.IQPRO_CLIENT_SECRET = 'test-client-secret';
      process.env.IQPRO_RETRY_ATTEMPTS = 'invalid-retry';

      const config = ConfigManager.loadConfig();

      expect(config.retryAttempts).toBe(3); // Should default to 3
    });
  });

  describe('getConfigSummary', () => {
    it('should mask sensitive credentials', () => {
      const config: IQProConfig = {
        clientId: 'very-long-client-id-12345',
        clientSecret: 'super-secret-client-secret',
        scope: 'test-scope',
        oauthUrl: 'https://oauth.example.com/token',
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retryAttempts: 2
      };

      const summary = ConfigManager.getConfigSummary(config);

      expect(summary.clientId).toBe('very-lon...');
      expect(summary.hasClientSecret).toBe(true);
      expect(summary.scope).toBe('test-scope');
      expect(summary.oauthUrl).toBe('https://oauth.example.com/token');
      expect(summary.baseUrl).toBe('https://api.example.com');
      expect(summary.timeout).toBe(5000);
      expect(summary.retryAttempts).toBe(2);
    });

    it('should handle empty client ID', () => {
      const config: IQProConfig = {
        clientId: '',
        clientSecret: 'test-secret',
        scope: 'test-scope',
        oauthUrl: 'https://oauth.example.com/token',
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retryAttempts: 2
      };

      const summary = ConfigManager.getConfigSummary(config);

      expect(summary.clientId).toBe('not set');
      expect(summary.hasClientSecret).toBe(true);
    });

    it('should handle missing client secret', () => {
      const config: IQProConfig = {
        clientId: 'test-client-id',
        clientSecret: '',
        scope: 'test-scope',
        oauthUrl: 'https://oauth.example.com/token',
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retryAttempts: 2
      };

      const summary = ConfigManager.getConfigSummary(config);

      expect(summary.hasClientSecret).toBe(false);
    });

    it('should handle short client ID', () => {
      const config: IQProConfig = {
        clientId: 'short',
        clientSecret: 'test-secret',
        scope: 'test-scope',
        oauthUrl: 'https://oauth.example.com/token',
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retryAttempts: 2
      };

      const summary = ConfigManager.getConfigSummary(config);

      expect(summary.clientId).toBe('short...');
    });
  });
});