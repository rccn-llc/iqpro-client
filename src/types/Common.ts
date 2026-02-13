/**
 * Common types and interfaces shared across the IQ Pro+ API
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  
  /** Response status */
  status: 'success' | 'error';
  
  /** Response message */
  message?: string;
  
  /** Error details (if status is error) */
  errors?: ApiError[];
  
  /** Response metadata */
  meta?: ResponseMetadata;
}

/**
 * API error structure
 */
export interface ApiError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Field name (for validation errors) */
  field?: string;
  
  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Request ID for debugging */
  requestId: string;
  
  /** Response timestamp */
  timestamp: string;
  
  /** API version */
  version: string;
  
  /** Rate limit information */
  rateLimit?: RateLimitInfo;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining: number;
  
  /** Total requests allowed per window */
  limit: number;
  
  /** Window reset timestamp */
  resetAt: string;
  
  /** Retry after seconds (if rate limited) */
  retryAfter?: number;
}

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  /** Page number (default: 1) */
  page?: number;
  
  /** Number of items per page (default: 25, max: 100) */
  limit?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction (default: desc) */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination information in responses
 */
export interface PaginationInfo {
  /** Current page number */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Total number of items */
  total: number;
  
  /** Total number of pages */
  pages: number;
  
  /** Whether there are more pages */
  hasNext: boolean;
  
  /** Whether there are previous pages */
  hasPrev: boolean;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (ISO 8601) */
  startDate?: string;
  
  /** End date (ISO 8601) */
  endDate?: string;
}

/**
 * Gateway context for API operations
 */
export interface GatewayContext {
  /** Gateway ID */
  gatewayId: string;
  
  /** Gateway name */
  gatewayName?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique log entry identifier */
  id: string;
  
  /** Action performed */
  action: string;
  
  /** Resource type */
  resourceType: string;
  
  /** Resource ID */
  resourceId: string;
  
  /** User ID who performed the action */
  userId?: string;
  
  /** Timestamp of the action */
  timestamp: string;
  
  /** Changes made (for update actions) */
  changes?: Record<string, { from: any; to: any }>;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Search criteria for list operations
 */
export interface SearchCriteria extends PaginationParams, DateRangeFilter {
  /** Search query */
  query?: string;
  
  /** Additional filters */
  filters?: Record<string, any>;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T = any> {
  /** Operation type */
  operation: 'create' | 'update' | 'delete';
  
  /** Items to operate on */
  items: T[];
  
  /** Whether to continue on individual failures */
  continueOnError?: boolean;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T = any> {
  /** Successfully processed items */
  successful: T[];
  
  /** Failed items with error details */
  failed: Array<{ item: T; error: ApiError }>;
  
  /** Operation summary */
  summary: {
    /** Total items processed */
    total: number;
    
    /** Number of successful operations */
    successful: number;
    
    /** Number of failed operations */
    failed: number;
  };
}