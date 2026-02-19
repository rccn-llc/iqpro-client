import { ConfigManager } from './config/ConfigManager';
import { OAuthClient } from './auth/OAuthClient';
import { TokenManager } from './auth/TokenManager';
import { RequestSigner } from './auth/RequestSigner';
import { ApiClient } from './lib/ApiClient';
import { CustomerService } from './services/CustomerService';
import { SubscriptionService } from './services/SubscriptionService';
import { TransactionService } from './services/TransactionService';
import { TokenizationService } from './services/TokenizationService';
import type { IQProConfig } from './types/Config';
import type { RequestOptions, HttpMethod } from './lib/ApiClient';
import type { GatewayContext } from './types/Common';
import { AuthenticationError } from './lib/errors';

/**
 * Main IQ Pro+ Client for OAuth 2.0 authenticated API interactions
 * 
 * This client provides access to all IQ Pro+ API resources with automatic
 * OAuth authentication, token management, and error handling.
 * 
 * Features:
 * - OAuth 2.0 client credentials flow
 * - Automatic token refresh and caching
 * - Gateway-scoped API operations
 * - Comprehensive service layer (Customer, Transaction)
 * - Rate limiting and retry logic
 * - Production-ready error handling
 * 
 * @example
 * ```typescript
 * // Initialize with environment variables
 * const client = new IQProClient();
 * 
 * // Set gateway context
 * client.setGatewayContext('gateway-123');
 * 
 * // Use service modules
 * const customer = await client.customers.create({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com'
 * });
 * 
 * // Or make custom requests
 * const data = await client.get('/custom/endpoint');
 * ```
 */
export class IQProClient {
  private config: IQProConfig;
  private oauthClient: OAuthClient;
  private tokenManager: TokenManager;
  private requestSigner: RequestSigner;
  private apiClient: ApiClient;

  // Service modules
  public readonly customers: CustomerService;
  public readonly subscriptions: SubscriptionService;
  public readonly transactions: TransactionService;
  public readonly tokenization: TokenizationService;

  /**
   * Initialize IQ Pro+ Client with OAuth 2.0 authentication
   * 
   * @param config - OAuth configuration (optional if using environment variables)
   */
  constructor(config?: Partial<IQProConfig>) {
    // Load and validate configuration
    this.config = ConfigManager.loadConfig(config);
    
    // Initialize OAuth components
    this.oauthClient = new OAuthClient(this.config);
    this.tokenManager = new TokenManager(this.oauthClient);
    this.requestSigner = new RequestSigner(this.tokenManager);
    
    // Initialize API client with OAuth authentication
    this.apiClient = new ApiClient(this.config, this.requestSigner);
    
    // Initialize service modules
    this.customers = new CustomerService(this.apiClient, this.config);
    this.subscriptions = new SubscriptionService(this.apiClient, this.config);
    this.transactions = new TransactionService(this.apiClient, this.config);
    this.tokenization = new TokenizationService(this.apiClient, this.config);
  }

  /**
   * Set gateway context for all subsequent API calls
   * 
   * This is required for most API operations as the IQ Pro+ API
   * is gateway-scoped.
   * 
   * @param gatewayId - Gateway ID to use for API calls
   */
  setGatewayContext(gatewayId: string): void {
    // Set context for all service modules
    this.customers.setGatewayContext(gatewayId);
    this.subscriptions.setGatewayContext(gatewayId);
    this.transactions.setGatewayContext(gatewayId);
    this.tokenization.setGatewayContext(gatewayId);
  }

  /**
   * Clear gateway context from all services
   */
  clearGatewayContext(): void {
    this.customers.clearGatewayContext();
    this.subscriptions.clearGatewayContext();
    this.transactions.clearGatewayContext();
    this.tokenization.clearGatewayContext();
  }

  /**
   * Get current gateway context
   */
  getGatewayContext(): GatewayContext | undefined {
    return this.customers.getGatewayContext();
  }

  /**
   * Test OAuth authentication by attempting to retrieve an access token
   * 
   * @returns Promise<boolean> - true if authentication succeeds
   * @throws {AuthenticationError} - if authentication fails
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const token = await this.tokenManager.getValidToken();
      return !!token.access_token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        'Authentication test failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get current authentication status and token information
   * 
   * @returns Promise with authentication status details
   */
  async getAuthenticationStatus() {
    return await this.requestSigner.getAuthenticationStatus();
  }

  /**
   * Force refresh of the OAuth access token
   * 
   * This method bypasses token caching and requests a fresh token
   * from the OAuth server. Use this if you suspect the token cache
   * is stale or after configuration changes.
   */
  async refreshAuthentication(): Promise<void> {
    await this.requestSigner.refreshAuthentication();
  }

  /**
   * Clear cached authentication
   * 
   * Clears the cached token, forcing fresh authentication on next request.
   */
  clearAuthentication(): void {
    this.requestSigner.clearAuthentication();
  }

  /**
   * Get configuration summary (with masked credentials)
   * 
   * @returns Configuration information with sensitive data masked
   */
  getConfig() {
    return ConfigManager.getConfigSummary(this.config);
  }

  /**
   * Create an authenticated fetch function for custom API requests
   * 
   * Returns a fetch function that automatically includes OAuth authentication
   * headers and handles token refresh.
   * 
   * @param baseHeaders - Headers to include in all requests
   * @returns Authenticated fetch function
   */
  createAuthenticatedFetch(baseHeaders: Record<string, string> = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'iqpro-client/1.0.0',
      ...baseHeaders
    };

    return this.requestSigner.createAuthenticatedFetch(defaultHeaders);
  }

  /**
   * Make a custom authenticated API request
   * 
   * This method provides direct access to authenticated requests
   * for custom API calls not covered by resource modules.
   * 
   * @param method - HTTP method
   * @param path - API path (relative to base URL)
   * @param options - Request options (body, query parameters, etc.)
   * @returns Promise with API response
   */
  async request<T = any>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T> {
    return this.apiClient.request<T>(method, path, options);
  }

  /**
   * Make an authenticated GET request
   */
  async get<T = any>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.apiClient.get<T>(path, options);
  }

  /**
   * Make an authenticated POST request
   */
  async post<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.apiClient.post<T>(path, body, options);
  }

  /**
   * Make an authenticated PUT request
   */
  async put<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.apiClient.put<T>(path, body, options);
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T = any>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.apiClient.delete<T>(path, options);
  }

  /**
   * Make an authenticated PATCH request
   */
  async patch<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.apiClient.patch<T>(path, body, options);
  }

  /**
   * Get current API client rate limit status
   */
  getRateLimitStatus() {
    return this.apiClient.getRateLimitStatus();
  }
}