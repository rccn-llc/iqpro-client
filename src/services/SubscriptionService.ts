/**
 * SubscriptionService - Subscription management operations
 * 
 * Handles recurring billing subscriptions with:
 * - Invoice-based model (line items, not plans)
 * - Complex recurrence scheduling
 * - Multiple address types
 * - Operator-based search
 * 
 * API Documentation:
 * https://api.basyspro.com/iqsaas/v1/scalar/#tag/subscription
 * 
 * @example
 * ```typescript
 * const subscription = await client.subscriptions.create({
 *   customerId: 'cust_123',
 *   subscriptionStatusId: SubscriptionStatus.ACTIVE,
 *   name: 'Monthly Service',
 *   recurrence: {
 *     termStartDate: '2024-01-01T00:00:00Z',
 *     billingStartDate: '2024-01-01T00:00:00Z',
 *     isAutoRenewed: true,
 *     allowProration: true,
 *     schedule: { monthsOfYear: [1,2,3,4,5,6,7,8,9,10,11,12], daysOfMonth: [1] }
 *   },
 *   paymentMethod: {
 *     customerPaymentMethodId: 'cpm_456',
 *     isAutoCharged: true
 *   },
 *   lineItems: [{
 *     name: 'Premium Plan',
 *     description: 'Monthly subscription',
 *     quantity: 1,
 *     unitPrice: 9999,
 *     unitOfMeasureId: 1
 *   }]
 * });
 * ```
 */

import { BaseService } from './BaseService';
import { ValidationError } from '../lib/errors';
import type {
  Subscription,
  SubscriptionApiResponse,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionSearchRequest,
  SubscriptionSearchResponse,
  CancelSubscriptionRequest,
  ResumeSubscriptionRequest,
} from '../types/Subscription';
import type { ApiClient } from '../lib/ApiClient';
import type { IQProConfig } from '../types/Config';
import { z } from 'zod';

/**
 * Validation Schemas
 */

// Recurrence Schedule Schema
const recurrenceScheduleSchema = z.object({
  scheduleId: z.string().uuid().optional(),
  schedule: z.object({
    minutes: z.array(z.number().min(0).max(59)).optional(),
    hours: z.array(z.number().min(0).max(23)).optional(),
    daysOfMonth: z.array(z.number().min(1).max(31)).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    weeksOfMonth: z.array(z.number().min(1).max(5)).optional(),
    weeksOfYear: z.array(z.number().min(1).max(52)).optional(),
    monthsOfYear: z.array(z.number().min(1).max(12)).optional(),
  }).optional(),
  billingPeriodId: z.number().positive().optional(),
  numberOfBillingPeriods: z.number().positive().nullable().optional(),
  trialLengthInDays: z.number().min(0).optional(),
  invoiceLengthInDays: z.number().positive().optional(),
  isAutoRenewed: z.boolean(),
  termStartDate: z.string(),
  termEndDate: z.string().nullable().optional(),
  billingStartDate: z.string(),
  allowProration: z.boolean(),
});

// Payment Method Schema
const paymentMethodSchema = z.object({
  customerPaymentMethodId: z.string().uuid().optional(),
  cardProcessorId: z.string().uuid().nullable().optional(),
  achProcessorId: z.string().uuid().nullable().optional(),
  isAutoCharged: z.boolean(),
});

// Address Schema
const addressSchema = z.object({
  addressId: z.string().uuid().optional(),
  isRemittance: z.boolean(),
  isShipping: z.boolean(),
  isBilling: z.boolean(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

// Line Item Schema
const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0),
  discount: z.number().min(0).optional(),
  freightAmount: z.number().min(0).nullable().optional(),
  unitOfMeasureId: z.number().positive(),
  localTaxPercent: z.number().min(0).max(100).nullable().optional(),
  nationalTaxPercent: z.number().min(0).max(100).nullable().optional(),
  commodityCode: z.string().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
});

// Custom Field Entry Schema
const customFieldEntrySchema = z.object({
  customFieldId: z.number().positive(),
  customFieldValue: z.array(z.string()).optional(),
});

// Create Subscription Request Schema
const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  subscriptionStatusId: z.number().positive(),
  name: z.string().min(1),
  prefix: z.string().optional(),
  number: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  recurrence: recurrenceScheduleSchema,
  paymentMethod: paymentMethodSchema,
  addresses: z.array(addressSchema).optional(),
  lineItems: z.array(lineItemSchema).min(1),
  customFields: z.array(customFieldEntrySchema).optional(),
});

// Update Subscription Request Schema
const updateSubscriptionSchema = z.object({
  customerId: z.string().uuid().optional(),
  subscriptionStatusId: z.number().positive().optional(),
  name: z.string().min(1).nullable().optional(),
  prefix: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  recurrence: recurrenceScheduleSchema.partial().optional(),
  paymentMethod: paymentMethodSchema.partial().optional(),
  addresses: z.array(addressSchema).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  customFields: z.array(customFieldEntrySchema).optional(),
});

// Search operator schemas
const dateSearchSchema = z.object({
  operator: z.enum(['Equal', 'GreaterThan', 'LessThan']),
  date: z.string().nullable(),
});

const booleanSearchSchema = z.object({
  operator: z.literal('Equal'),
  value: z.boolean(),
});

const stringLikeSearchSchema = z.object({
  operator: z.literal('IsLike'),
  value: z.string().nullable(),
});

const stringEqualSearchSchema = z.object({
  operator: z.literal('Equal'),
  value: z.string().nullable(),
});

// Subscription Search Request Schema
const subscriptionSearchSchema = z.object({
  globalSearch: z.string().nullable().optional(),
  subscriptionId: stringEqualSearchSchema.optional(),
  customerId: stringEqualSearchSchema.optional(),
  customerName: stringLikeSearchSchema.optional(),
  statusName: stringLikeSearchSchema.optional(),
  hasFailedTransaction: booleanSearchSchema.optional(),
  subscriptionName: stringLikeSearchSchema.optional(),
  subscriptionNumber: stringLikeSearchSchema.optional(),
  subscriptionPrefix: stringLikeSearchSchema.optional(),
  subscriptionNote: stringLikeSearchSchema.optional(),
  scheduleName: stringLikeSearchSchema.optional(),
  billingPeriodName: stringLikeSearchSchema.optional(),
  termStartDate: dateSearchSchema.optional(),
  termEndDate: dateSearchSchema.optional(),
  billingStartDate: dateSearchSchema.optional(),
  isAutoCharged: booleanSearchSchema.optional(),
  productId: stringEqualSearchSchema.optional(),
  createdDate: dateSearchSchema.optional(),
  modifiedDate: dateSearchSchema.optional(),
  offset: z.number().min(0).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortColumn: z.string().nullable().optional(),
  sortDirection: z.enum(['asc', 'desc']).nullable().optional(),
});

// Cancel Subscription Request Schema
const cancelSubscriptionSchema = z.object({
  cancel: z.object({
    now: z.boolean(),
    endOfBillingPeriod: z.boolean(),
  }),
  refund: z.object({
    lastPaidAmount: z.boolean(),
  }).optional(),
});

// Resume Subscription Request Schema
const resumeSubscriptionSchema = z.object({
  prorateRemainingDays: z.boolean(),
});

/**
 * Service class for subscription operations
 */
export class SubscriptionService extends BaseService {
  constructor(apiClient: ApiClient, config: IQProConfig) {
    super(apiClient, config);
  }

  /**
   * Validate data against a Zod schema
   */
  private validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }
    return result.data;
  }

  /**
   * Transform API dates to Date objects
   */
  private transformDates(subscription: Subscription): Subscription {
    return {
      ...subscription,
      createdDateTime: subscription.createdDateTime,
      modifiedDateTime: subscription.modifiedDateTime,
      recurrence: {
        ...subscription.recurrence,
        termStartDate: subscription.recurrence.termStartDate,
        termEndDate: subscription.recurrence.termEndDate ?? null,
        billingStartDate: subscription.recurrence.billingStartDate,
      },
      invoices: subscription.invoices?.map((invoice) => ({
        ...invoice,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        createdDateTime: invoice.createdDateTime,
        modifiedDateTime: invoice.modifiedDateTime,
      })) || [],
    };
  }

  /**
   * Handle API response and extract data
   * @param response - API response
   * @returns Extracted data from response
   */
  private handleApiResponse<T extends object>(response: SubscriptionApiResponse | T): T {
    // For mocked responses, they might come directly in the wrapper format
    const apiResponse = 'statusCode' in response ? response : this.handleResponse(response);
    
    // Check for API-level errors in statusCode
    if ('statusCode' in apiResponse && apiResponse.statusCode && apiResponse.statusCode !== 'Continue' && apiResponse.statusCode !== 'OK' && apiResponse.statusCode !== 'Created') {
      const statusDetails = 'statusDetails' in apiResponse && apiResponse.statusDetails ? apiResponse.statusDetails.join(', ') : 'Unknown error';
      throw new ValidationError(`API Error: ${apiResponse.statusCode} - ${statusDetails}`);
    }
    
    return ('data' in apiResponse ? apiResponse.data : apiResponse) as T;
  }

  /**
   * Create a new subscription
   * 
   * @param data - Subscription creation data
   * @returns Created subscription
   * 
   * @example
   * ```typescript
   * const subscription = await client.subscriptions.create({
   *   customerId: 'cust_123',
   *   subscriptionStatusId: 1,
   *   name: 'Monthly Service',
   *   recurrence: {
   *     termStartDate: '2024-01-01T00:00:00Z',
   *     billingStartDate: '2024-01-01T00:00:00Z',
   *     isAutoRenewed: true,
   *     allowProration: true,
   *     schedule: { monthsOfYear: [1,2,3,4,5,6,7,8,9,10,11,12], daysOfMonth: [1] }
   *   },
   *   paymentMethod: {
   *     customerPaymentMethodId: 'cpm_456',
   *     isAutoCharged: true
   *   },
   *   lineItems: [{
   *     name: 'Premium Plan',
   *     description: 'Monthly subscription',
   *     quantity: 1,
   *     unitPrice: 9999,
   *     unitOfMeasureId: 1
   *   }]
   * });
   * ```
   */
  async create(data: CreateSubscriptionRequest): Promise<Subscription> {
    const validatedData = this.validate(createSubscriptionSchema, data);
    
    const response = await this.apiClient.post<SubscriptionApiResponse>(
      this.buildPath('/subscription'),
      validatedData
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * Get subscription by ID
   * 
   * @param subscriptionId - UUID of the subscription
   * @returns Subscription details
   * 
   * @example
   * ```typescript
   * const subscription = await client.subscriptions.get('sub_123');
   * console.log(subscription.name, subscription.status.name);
   * ```
   */
  async get(subscriptionId: string): Promise<Subscription> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    const response = await this.apiClient.get<SubscriptionApiResponse>(
      this.buildPath(`/subscription/${subscriptionId}`)
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * Update an existing subscription
   * 
   * @param subscriptionId - UUID of the subscription
   * @param data - Update data
   * @returns Updated subscription
   * 
   * @example
   * ```typescript
   * const updated = await client.subscriptions.update('sub_123', {
   *   name: 'Updated Service Name',
   *   subscriptionStatusId: 2, // Paused
   *   lineItems: [{
   *     name: 'Updated Plan',
   *     description: 'New pricing',
   *     quantity: 1,
   *     unitPrice: 12999,
   *     unitOfMeasureId: 1
   *   }]
   * });
   * ```
   */
  async update(
    subscriptionId: string,
    data: UpdateSubscriptionRequest
  ): Promise<Subscription> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    const validatedData = this.validate(updateSubscriptionSchema, data);

    const response = await this.apiClient.put<SubscriptionApiResponse>(
      this.buildPath(`/subscription/${subscriptionId}`),
      validatedData
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * Delete a subscription
   * 
   * @param subscriptionId - UUID of the subscription
   * @returns Success message
   * 
   * @example
   * ```typescript
   * const result = await client.subscriptions.delete('sub_123');
   * console.log(result.message); // 'Subscription deleted successfully'
   * ```
   */
  async delete(subscriptionId: string): Promise<{ message: string }> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    await this.apiClient.delete(
      this.buildPath(`/subscription/${subscriptionId}`)
    );

    return { message: 'Subscription deleted successfully' };
  }

  /**
   * Search subscriptions with operator-based filters
   * 
   * @param request - Search criteria with operators
   * @returns Array of matching subscriptions
   * 
   * @example
   * ```typescript
   * // Search by customer
   * const results = await client.subscriptions.search({
   *   customerId: { operator: 'Equal', value: 'cust_123' }
   * });
   * 
   * // Search by name pattern
   * const results = await client.subscriptions.search({
   *   subscriptionName: { operator: 'IsLike', value: 'Premium' },
   *   limit: 20,
   *   sortColumn: 'createdDateTime',
   *   sortDirection: 'desc'
   * });
   * 
   * // Search by date range
   * const results = await client.subscriptions.search({
   *   createdDate: { operator: 'GreaterThan', date: '2024-01-01' },
   *   statusName: { operator: 'IsLike', value: 'Active' }
   * });
   * ```
   */
  async search(request: SubscriptionSearchRequest = {}): Promise<Subscription[]> {
    const validatedRequest = this.validate(subscriptionSearchSchema, request);

    const response = await this.apiClient.post<SubscriptionSearchResponse>(
      this.buildPath('/subscription/search'),
      validatedRequest
    );

    // Handle paginated search response structure
    if (!response.data) {
      throw new ValidationError('No search results returned from API');
    }
    
    // Extract results from paginated response
    // Support both paginated format (data.results) and flat array for backward compatibility
    const results = 'results' in response.data ? response.data.results : (response.data as any);
    
    if (!Array.isArray(results)) {
      throw new ValidationError('Unexpected search response format - expected array of subscriptions');
    }
    
    return results.map((sub: Subscription) => this.transformDates(sub));
  }

  /**
   * Cancel a subscription
   * 
   * @param subscriptionId - UUID of the subscription
   * @param request - Cancellation options
   * @returns Updated subscription
   * 
   * @example
   * ```typescript
   * // Cancel immediately with refund
   * const cancelled = await client.subscriptions.cancel('sub_123', {
   *   cancel: { now: true, endOfBillingPeriod: false },
   *   refund: { lastPaidAmount: true }
   * });
   * 
   * // Cancel at end of billing period
   * const cancelled = await client.subscriptions.cancel('sub_123', {
   *   cancel: { now: false, endOfBillingPeriod: true }
   * });
   * ```
   */
  async cancel(
    subscriptionId: string,
    request: CancelSubscriptionRequest
  ): Promise<Subscription> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    const validatedRequest = this.validate(cancelSubscriptionSchema, request);

    const response = await this.apiClient.post<SubscriptionApiResponse>(
      this.buildPath(`/subscription/cancel/${subscriptionId}`),
      validatedRequest
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * Pause a subscription
   * 
   * @param subscriptionId - UUID of the subscription
   * @returns Updated subscription with paused status
   * 
   * @example
   * ```typescript
   * const paused = await client.subscriptions.pause('sub_123');
   * console.log(paused.status.name); // 'Paused'
   * ```
   */
  async pause(subscriptionId: string): Promise<Subscription> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    const response = await this.apiClient.put<SubscriptionApiResponse>(
      this.buildPath(`/subscription/pause/${subscriptionId}`)
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * Resume a paused subscription
   * 
   * @param subscriptionId - UUID of the subscription
   * @param request - Resume options (proration)
   * @returns Updated subscription with active status
   * 
   * @example
   * ```typescript
   * // Resume with proration
   * const resumed = await client.subscriptions.resume('sub_123', {
   *   prorateRemainingDays: true
   * });
   * 
   * // Resume without proration
   * const resumed = await client.subscriptions.resume('sub_123', {
   *   prorateRemainingDays: false
   * });
   * ```
   */
  async resume(
    subscriptionId: string,
    request: ResumeSubscriptionRequest
  ): Promise<Subscription> {
    this.validateUUID(subscriptionId, 'Subscription ID');

    const validatedRequest = this.validate(resumeSubscriptionSchema, request);

    const response = await this.apiClient.put<SubscriptionApiResponse>(
      this.buildPath(`/subscription/resume/${subscriptionId}`),
      validatedRequest
    );

    return this.transformDates(this.handleApiResponse<Subscription>(response));
  }

  /**
   * List all subscriptions for current gateway
   * 
   * @param limit - Maximum number of results (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns Array of subscriptions
   * 
   * @example
   * ```typescript
   * // Get first 50 subscriptions
   * const subscriptions = await client.subscriptions.list();
   * 
   * // Paginated listing
   * const page2 = await client.subscriptions.list(50, 50);
   * ```
   */
  async list(limit: number = 50, offset: number = 0): Promise<Subscription[]> {
    return this.search({ limit, offset });
  }

  /**
   * Get all subscriptions for a specific customer
   * 
   * @param customerId - UUID of the customer
   * @returns Array of customer's subscriptions
   * 
   * @example
   * ```typescript
   * const customerSubs = await client.subscriptions.getByCustomer('cust_123');
   * console.log(`Customer has ${customerSubs.length} subscriptions`);
   * ```
   */
  async getByCustomer(customerId: string): Promise<Subscription[]> {
    this.validateUUID(customerId, 'Customer ID');

    return this.search({
      customerId: { operator: 'Equal', value: customerId },
    });
  }

  /**
   * Get subscriptions by status
   * 
   * @param statusName - Status name (e.g., 'Active', 'Paused', 'Cancelled')
   * @returns Array of subscriptions with matching status
   * 
   * @example
   * ```typescript
   * const activeSubs = await client.subscriptions.getByStatus('Active');
   * const pausedSubs = await client.subscriptions.getByStatus('Paused');
   * ```
   */
  async getByStatus(statusName: string): Promise<Subscription[]> {
    if (!statusName || typeof statusName !== 'string') {
      throw new ValidationError(
        'Status name must be a non-empty string'
      );
    }

    return this.search({
      statusName: { operator: 'IsLike', value: statusName },
    });
  }
}

/**
 * Export SubscriptionService as default
 */
export default SubscriptionService;
