/**
 * Webhook entity types and interfaces for IQ Pro+ API
 */

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Payment events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription.payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription.payment_failed',
  
  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed'
}

/**
 * Base webhook payload structure
 */
export interface WebhookPayload<T = any> {
  /** Unique event identifier */
  id: string;
  
  /** Event type */
  type: WebhookEventType;
  
  /** Event timestamp */
  createdAt: string;
  
  /** API version */
  apiVersion: string;
  
  /** Gateway ID */
  gatewayId: string;
  
  /** Event data */
  data: T;
  
  /** Previous data (for update events) */
  previousData?: T;
  
  /** Test mode flag */
  isTest: boolean;
}

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  /** Unique webhook endpoint identifier */
  id: string;
  
  /** Webhook URL */
  url: string;
  
  /** Events to subscribe to */
  events: WebhookEventType[];
  
  /** Webhook secret for signature verification */
  secret: string;
  
  /** Whether webhook is active */
  isActive: boolean;
  
  /** Webhook creation timestamp */
  createdAt: string;
  
  /** Webhook last update timestamp */
  updatedAt: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Create webhook endpoint request
 */
export interface CreateWebhookRequest {
  /** Webhook URL */
  url: string;
  
  /** Events to subscribe to */
  events: WebhookEventType[];
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Update webhook endpoint request
 */
export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  /** Webhook endpoint ID */
  id: string;
  
  /** Whether webhook is active */
  isActive?: boolean;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDelivery {
  /** Unique delivery identifier */
  id: string;
  
  /** Webhook endpoint ID */
  webhookId: string;
  
  /** Event ID */
  eventId: string;
  
  /** HTTP status code */
  statusCode: number;
  
  /** Response body */
  responseBody: string;
  
  /** Delivery timestamp */
  deliveredAt: string;
  
  /** Retry attempt number */
  attemptNumber: number;
  
  /** Whether delivery was successful */
  isSuccessful: boolean;
  
  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * Webhook signature verification result
 */
export interface WebhookVerificationResult {
  /** Whether signature is valid */
  isValid: boolean;
  
  /** Error message (if invalid) */
  error?: string;
  
  /** Parsed payload (if valid) */
  payload?: WebhookPayload;
}