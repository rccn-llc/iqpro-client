import type { ApiClient } from '../lib/ApiClient';
import type { IQProConfig } from '../types/Config';
import type { GatewayContext, PaginationParams, ApiResponse } from '../types/Common';
import type { JsonPatchOperation } from '../types/Customer';
import { ValidationError } from '../lib/errors';

/**
 * Base service class providing common functionality for all API services
 * 
 * This abstract class provides:
 * - Gateway-scoped API endpoints
 * - Parameter validation
 * - Response handling
 * - Error standardization
 */
export abstract class BaseService {
  protected readonly apiClient: ApiClient;
  protected readonly config: IQProConfig;
  protected gatewayContext?: GatewayContext | undefined;

  constructor(apiClient: ApiClient, config: IQProConfig) {
    this.apiClient = apiClient;
    this.config = config;
  }

  /**
   * Set gateway context for subsequent API calls
   * 
   * @param gatewayId - Gateway ID to use for API calls
   */
  setGatewayContext(gatewayId: string): void {
    this.gatewayContext = {
      gatewayId
    };
  }

  /**
   * Clear gateway context
   */
  clearGatewayContext(): void {
    this.gatewayContext = undefined;
  }

  /**
   * Get current gateway context
   */
  getGatewayContext(): GatewayContext | undefined {
    return this.gatewayContext;
  }

  /**
   * Build gateway-scoped API path
   * 
   * @param endpoint - The API endpoint
   * @returns Full API path with gateway context
   */
  protected buildPath(endpoint: string): string {
    if (!this.gatewayContext) {
      throw new ValidationError('Gateway context is required. Call setGatewayContext() first.');
    }

    const basePath = `/api/gateway/${this.gatewayContext.gatewayId}`;
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${basePath}${normalizedEndpoint}`;
  }

  /**
   * Validate required parameters
   * 
   * @param params - Parameters to validate
   * @param required - Array of required parameter names
   */
  protected validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(field => {
      const value = params[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required parameters: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Validate pagination parameters
   * 
   * @param params - Pagination parameters to validate
   */
  protected validatePagination(params: PaginationParams): void {
    if (params.page !== undefined) {
      if (!Number.isInteger(params.page) || params.page < 1) {
        throw new ValidationError('Page must be a positive integer');
      }
    }

    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
        throw new ValidationError('Limit must be an integer between 1 and 100');
      }
    }

    if (params.sortOrder !== undefined) {
      if (!['asc', 'desc'].includes(params.sortOrder)) {
        throw new ValidationError('Sort order must be "asc" or "desc"');
      }
    }
  }

  /**
   * Validate date range parameters
   * 
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   */
  protected validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && !this.isValidISODate(startDate)) {
      throw new ValidationError('Start date must be a valid ISO 8601 date string');
    }

    if (endDate && !this.isValidISODate(endDate)) {
      throw new ValidationError('End date must be a valid ISO 8601 date string');
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ValidationError('Start date must be before end date');
    }
  }

  /**
   * Validate email address format
   * 
   * @param email - Email address to validate
   */
  protected validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email address format');
    }
  }

  /**
   * Validate UUID format
   * 
   * @param uuid - UUID to validate
   * @param fieldName - Field name for error messages
   */
  protected validateUUID(uuid: string, fieldName: string = 'ID'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new ValidationError(`${fieldName} must be a valid UUID`);
    }
  }

  /**
   * Sanitize query parameters by removing undefined values
   * 
   * @param params - Query parameters to sanitize
   * @returns Sanitized parameters
   */
  protected sanitizeQueryParams(params: Record<string, any>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'boolean' || typeof value === 'number') {
          sanitized[key] = value;
        } else {
          sanitized[key] = String(value);
        }
      }
    });

    return sanitized;
  }

  /**
   * Handle API response and extract data
   * 
   * @param response - API response
   * @returns Response data
   */
  protected handleResponse<T>(response: ApiResponse<T> | T): T {
    // If response is wrapped in ApiResponse format
    if (response && typeof response === 'object' && 'data' in response) {
      const apiResponse = response as ApiResponse<T>;
      
      if (apiResponse.status === 'error') {
        const errorMessage = apiResponse.errors?.[0]?.message || apiResponse.message || 'API request failed';
        throw new ValidationError(errorMessage);
      }
      
      return apiResponse.data;
    }

    // Return response directly if not wrapped
    return response as T;
  }

  /**
   * Check if string is valid ISO 8601 date
   * 
   * @param dateStr - Date string to validate
   * @returns Whether the date string is valid
   */
  private isValidISODate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().slice(0, 19) === dateStr.slice(0, 19);
  }

  /**
   * Convert object updates to JSON Patch operations
   * 
   * @param updates - Partial object with updates
   * @returns Array of JSON Patch operations
   */
  protected convertToJsonPatch(updates: Record<string, any>): JsonPatchOperation[] {
    const operations: JsonPatchOperation[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        operations.push({
          op: 'replace',
          path: `/${key}`,
          value: value
        });
      }
    });
    
    return operations;
  }

  /**
   * Get service context information
   */
  getServiceContext() {
    return {
      gatewayContext: this.gatewayContext,
      baseUrl: this.config.baseUrl,
      environment: this.config.environment,
      debug: this.config.debug
    };
  }
}