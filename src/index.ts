/**
 * @dojo-planner/iqpro-client
 * 
 * Standalone iQ Pro+ payment API client library for TypeScript/JavaScript applications.
 * Built with OAuth 2.0 client credentials flow for secure API access.
 * 
 * @example
 * ```typescript
 * import { IQProClient } from '@dojo-planner/iqpro-client';
 * 
 * const client = new IQProClient({
 *   clientId: process.env.IQPRO_CLIENT_ID!,
 *   clientSecret: process.env.IQPRO_CLIENT_SECRET!,
 *   environment: 'sandbox',
 * });
 * 
 * // List gateways
 * const gateways = await client.gateways.list();
 * 
 * // Create a customer
 * const customer = await client.customers.create(gateways[0].id, {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 * });
 * ```
 */

// Main client
export { IQProClient } from './IQProClient';

// Service classes for advanced usage
export {
  BaseService,
  CustomerService,
  SubscriptionService,
  TransactionService
} from './services';

// Authentication components
export { OAuthClient } from './auth/OAuthClient';
export { TokenManager } from './auth/TokenManager';
export { RequestSigner } from './auth/RequestSigner';

// HTTP client
export { ApiClient } from './lib/ApiClient';

// Type definitions
export * from './types';

// Configuration types (for backward compatibility)
export type {
  IQProConfig,
  OAuthTokenResponse,
  CachedToken
} from './types/Config';

// Error classes
export {
  IQProError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError,
  ConfigurationError
} from './lib/errors';

// Configuration manager (for advanced usage)
export { ConfigManager } from './config/ConfigManager';

// Webhook validation
export {
  WebhookValidator,
  validateWebhookOrThrow,
  type WebhookHeaders,
  type WebhookValidationOptions,
  type WebhookValidationResult
} from './webhooks';

// Version information
export const VERSION = '1.0.0';
export const SUPPORTED_API_VERSIONS = ['v1'];

// Default configuration values
export const DEFAULT_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  scope: 'https://account.basyspro.com/8939cd8f-0b21-4654-8f4d-ee01706dc3d6/.default',
  tokenEndpoint: 'https://account.basyspro.com/account.basyspro.com/B2C_1A_IQPROV2_INTEGRATOR/oauth2/v2.0/token',
  baseUrl: 'https://api.basyspro.com/iqsaas/v1',
} as const;