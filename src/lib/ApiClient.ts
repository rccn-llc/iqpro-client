import type { IQProConfig } from '../types/Config';
import { RequestSigner } from '../auth/RequestSigner';
import { NetworkError, RateLimitError, AuthenticationError } from './errors';

/**
 * HTTP Client with OAuth integration for IQ Pro+ API
 * 
 * Provides a robust HTTP client with automatic OAuth authentication,
 * retry logic with exponential backoff, rate limiting, and comprehensive
 * error handling. Built specifically for the IQ Pro+ REST API.
 */
export class ApiClient {
  private readonly config: IQProConfig;
  private readonly requestSigner: RequestSigner;
  private readonly baseHeaders: Record<string, string>;

  // Rate limiting state
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly requestsPerWindow = 100; // requests per minute
  private readonly windowDuration = 60000; // 1 minute in ms

  constructor(config: IQProConfig, requestSigner: RequestSigner) {
    this.config = config;
    this.requestSigner = requestSigner;
    
    this.baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'iqpro-client/1.0.0'
    };
  }

  /**
   * Make an authenticated GET request
   * 
   * @param path - API path (relative to base URL)
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Make an authenticated POST request
   * 
   * @param path - API path (relative to base URL)
   * @param body - Request body data
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  /**
   * Make an authenticated PUT request
   * 
   * @param path - API path (relative to base URL)
   * @param body - Request body data
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  /**
   * Make an authenticated DELETE request
   * 
   * @param path - API path (relative to base URL)
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Make an authenticated PATCH request
   * 
   * @param path - API path (relative to base URL)
   * @param body - Request body data
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  /**
   * Make a custom authenticated HTTP request with full retry logic
   * 
   * @param method - HTTP method
   * @param path - API path (relative to base URL)
   * @param options - Request options
   * @returns Promise resolving to response data
   */
  async request<T = any>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Apply rate limiting
    await this.enforceRateLimit();

    // Perform request with retry logic
    return this.requestWithRetry<T>(method, path, options, 0);
  }

  /**
   * Make request with exponential backoff retry logic
   */
  private async requestWithRetry<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    attempt: number
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    try {
      const response = await this.makeHttpRequest(method, path, options);
      return await this.handleResponse<T>(response, url);
    } catch (error) {
      // Check if we should retry
      if (attempt < this.config.retryAttempts && this.shouldRetry(error)) {
        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
        return this.requestWithRetry<T>(method, path, options, attempt + 1);
      }

      // Re-throw error if not retrying
      throw error;
    }
  }

  /**
   * Make the actual HTTP request with OAuth authentication
   */
  private async makeHttpRequest(
    method: HttpMethod,
    path: string,
    options: RequestOptions
  ): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const requestOptions = await this.buildRequestOptions(method, options);

    return this.requestSigner.executeAuthenticatedRequest(async (authHeaders) => {
      const finalOptions = {
        ...requestOptions,
        headers: {
          ...this.baseHeaders,
          ...authHeaders,
          ...(options.headers || {})
        }
      };

      return fetch(url, finalOptions);
    });
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, query?: Record<string, string | number | boolean>): string {
    let url = `${this.config.baseUrl}${path}`;

    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Build request options for fetch
   */
  private async buildRequestOptions(
    method: HttpMethod,
    options: RequestOptions
  ): Promise<RequestInit> {
    const requestOptions: RequestInit = {
      method,
      signal: this.createTimeoutSignal()
    };

    // Add body for non-GET requests
    if (options.body && method !== 'GET') {
      if (typeof options.body === 'string') {
        requestOptions.body = options.body;
      } else {
        requestOptions.body = JSON.stringify(options.body);
      }
    }

    return requestOptions;
  }

  /**
   * Handle HTTP response and error checking
   */
  private async handleResponse<T>(response: Response, url: string): Promise<T> {
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
      throw new RateLimitError('API rate limit exceeded', retryAfter);
    }

    // Handle authentication errors
    if (response.status === 401) {
      throw new AuthenticationError(`HTTP 401: ${await response.text().catch(() => 'Unauthorized')} (URL: ${url})`);
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new NetworkError(`HTTP ${response.status}: ${errorText} (URL: ${url})`, response.status);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    // Parse JSON response
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new NetworkError(`Invalid JSON response (URL: ${url})`, response.status);
    }
  }

  /**
   * Create timeout signal for requests
   */
  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.config.timeout);
    return controller.signal;
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if enough time has passed
    if (now - this.windowStart >= this.windowDuration) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check rate limit
    if (this.requestCount >= this.requestsPerWindow) {
      const waitTime = this.windowDuration - (now - this.windowStart);
      if (waitTime > 0) {
        throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)}s`, Math.ceil(waitTime / 1000));
      }
    }

    this.requestCount++;
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    // Don't retry authentication errors
    if (error instanceof AuthenticationError) {
      return false;
    }

    // Don't retry validation errors (4xx except 429)
    if (error instanceof NetworkError) {
      const status = error.statusCode;
      if (status && status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }

    // Retry network errors, timeouts, and 5xx errors
    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000;  // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Parse Retry-After header value
   */
  private parseRetryAfter(value: string | null): number | undefined {
    if (!value) return undefined;
    
    const seconds = parseInt(value, 10);
    return isNaN(seconds) ? undefined : seconds;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestsRemaining: number;
    windowResetTime: number;
    isLimited: boolean;
  } {
    const now = Date.now();
    const windowAge = now - this.windowStart;
    
    if (windowAge >= this.windowDuration) {
      return {
        requestsRemaining: this.requestsPerWindow,
        windowResetTime: now + this.windowDuration,
        isLimited: false
      };
    }

    const remaining = Math.max(0, this.requestsPerWindow - this.requestCount);
    return {
      requestsRemaining: remaining,
      windowResetTime: this.windowStart + this.windowDuration,
      isLimited: remaining === 0
    };
  }
}

// Types for the API client
export interface RequestOptions {
  body?: any;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';