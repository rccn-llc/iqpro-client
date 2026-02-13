/**
 * Configuration interfaces for IQ Pro+ Client
 */

/**
 * Main configuration interface for IQ Pro+ Client
 */
export interface IQProConfig {
  /** OAuth 2.0 client ID */
  clientId: string;
  
  /** OAuth 2.0 client secret */
  clientSecret: string;
  
  /** OAuth 2.0 scope (default: api://iq-pro-api/.default) */
  scope: string;
  
  /** OAuth 2.0 token endpoint URL */
  oauthUrl: string;
  
  /** Base URL for IQ Pro+ API */
  baseUrl: string;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
  
  /** Number of retry attempts for failed requests (default: 3) */
  retryAttempts: number;
  
  /** Optional webhook secret for validating webhook payloads */
  webhookSecret?: string;
  
  /** Environment identifier (dev, staging, prod) */
  environment?: string;
  
  /** Debug mode flag for additional logging */
  debug?: boolean;
}

/**
 * Configuration options for creating IQ Pro+ Client
 * All required fields from IQProConfig plus optional overrides
 */
export interface IQProClientConfig extends Partial<IQProConfig> {
  /** OAuth 2.0 client ID (required) */
  clientId: string;
  
  /** OAuth 2.0 client secret (required) */
  clientSecret: string;
}

/**
 * OAuth token response from Azure AD B2C
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Cached token with expiration timestamp
 */
export interface CachedToken extends OAuthTokenResponse {
  expiresAt: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<IQProConfig, 'clientId' | 'clientSecret'> = {
  scope: 'api://iq-pro-api/.default',
  oauthUrl: 'https://account.basyspro.com/account.basyspro.com/B2C_1A_IQPROV2_INTEGRATOR/oauth2/v2.0/token',
  baseUrl: 'https://api.iqpro.com',
  timeout: 30000,
  retryAttempts: 3,
  environment: 'prod',
  debug: false
};

/**
 * Environment-specific configuration presets
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    baseUrl: 'https://api-dev.iqpro.com',
    debug: true,
    timeout: 10000
  },
  staging: {
    baseUrl: 'https://api-staging.iqpro.com',
    debug: true,
    timeout: 20000
  },
  production: {
    baseUrl: 'https://api.iqpro.com',
    debug: false,
    timeout: 30000
  }
} as const;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Token cache configuration
 */
export interface TokenCacheConfig {
  /** Token expiry buffer in seconds (default: 30) */
  expiryBuffer: number;
  
  /** Maximum cache size for concurrent tokens */
  maxCacheSize: number;
  
  /** Enable token cache debugging */
  debug: boolean;
}

/**
 * API Client configuration options
 */
export interface ApiClientConfig {
  /** Maximum requests per minute (default: 100) */
  rateLimitRpm: number;
  
  /** Enable request/response logging */
  logRequests: boolean;
  
  /** Custom user agent string */
  userAgent: string;
  
  /** Additional default headers */
  defaultHeaders: Record<string, string>;
}