import { BaseService } from './BaseService';
import {
  TransactionStatus,
  TransactionType,
  PaymentMethodType,
  CardBrand
} from '../types/Transaction';
import type {
  Transaction,
  CreateTransactionRequest,
  CaptureTransactionRequest,
  VoidTransactionRequest,
  RefundTransactionRequest,
  IncrementAuthorizationRequest,
  TransactionSearchParams,
  TransactionSearchRequest,
  TransactionListResponse,
  SearchFilterGuid,
  SearchFilterEnum,
  SearchFilterNumber,
  SearchFilterDate
} from '../types/Transaction';
import { ValidationError } from '../lib/errors';

/**
 * Transaction Service for managing payment transactions
 * 
 * Provides comprehensive transaction management functionality including:
 * - Creating and processing transactions (sale, authorization)
 * - Capturing authorized transactions
 * - Voiding pending/authorized transactions
 * - Processing refunds and partial refunds
 * - Incrementing authorization amounts
 * - Searching and listing transactions
 * - Generating transaction receipts
 * 
 * Based on official iQ Pro+ API: https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction
 * 
 * ⚠️ ENDPOINT VERIFICATION (February 2026):
 * Testing confirmed the correct endpoint is /transaction (not /payment):
 * - /payment returns 404 Not Found (endpoint doesn't exist)
 * - /transaction returns 405 Method Not Allowed (endpoint exists, wrong method)
 * - Matches API documentation tag pattern: #tag/transaction → /transaction
 * - Follows same pattern as /customer and /subscription
 * 
 * The implementation uses the correct endpoint structure:
 * - POST /api/gateway/{gatewayId}/transaction - Create transaction
 * - GET /api/gateway/{gatewayId}/transaction/{id} - Get transaction details
 * - POST /api/gateway/{gatewayId}/transaction/search - Search/list transactions (uses POST, not GET)
 * - PUT /api/gateway/{gatewayId}/transaction/{id}/capture - Capture authorization
 * - PUT /api/gateway/{gatewayId}/transaction/{id}/cancel - Cancel/void transaction
 * - POST /api/gateway/{gatewayId}/transaction/{id}/refunds - Process refund
 */
export class TransactionService extends BaseService {
  
  /**
   * Map TransactionType enum to API string values
   * API expects string values like "Sale", "Authorize", etc.
   */
  private mapTransactionTypeToApi(type: TransactionType): string {
    const mapping: Record<TransactionType, string> = {
      [TransactionType.SALE]: 'Sale',
      [TransactionType.AUTHORIZATION]: 'Authorize',
      [TransactionType.CAPTURE]: 'Capture',
      [TransactionType.VOID]: 'Void',
      [TransactionType.REFUND]: 'Refund',
      [TransactionType.CREDIT]: 'Credit'
    };
    return mapping[type] || String(type);
  }
  
  /**
   * Map TransactionStatus enum to API string values
   * API expects PascalCase values like "Captured", "Authorized", etc.
   */
  private mapTransactionStatusToApi(status: TransactionStatus): string {
    const mapping: Record<TransactionStatus, string> = {
      [TransactionStatus.PENDING]: 'Pending',
      [TransactionStatus.AUTHORIZED]: 'Authorized',
      [TransactionStatus.CAPTURED]: 'Captured',
      [TransactionStatus.SETTLED]: 'Settled',
      [TransactionStatus.VOIDED]: 'Voided',
      [TransactionStatus.FAILED]: 'Failed',
      [TransactionStatus.DECLINED]: 'Declined',
      [TransactionStatus.CANCELLED]: 'Cancelled',
      [TransactionStatus.REFUNDED]: 'Refunded',
      [TransactionStatus.PARTIALLY_REFUNDED]: 'PartiallyRefunded'
    };
    return mapping[status] || String(status);
  }
  
  /**
   * Map PaymentMethodType enum to API string values
   * API expects "Card", "Ach", "Token", or "Terminal"
   */
  private mapPaymentMethodTypeToApi(type: PaymentMethodType): string {
    const mapping: Record<PaymentMethodType, string> = {
      [PaymentMethodType.CREDIT_CARD]: 'Card',
      [PaymentMethodType.DEBIT_CARD]: 'Card',
      [PaymentMethodType.ACH]: 'Ach',
      [PaymentMethodType.DIGITAL_WALLET]: 'Card', // Digital wallets processed as cards
      [PaymentMethodType.BANK_TRANSFER]: 'Ach',
      [PaymentMethodType.CASH]: 'Card', // Fallback to Card
      [PaymentMethodType.CHECK]: 'Ach'
    };
    return mapping[type] || 'Card';
  }
  
  /**
   * Create a new transaction
   * 
   * Based on API documentation: https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction/POST/api/gateway/{gatewayId}/transaction
   * OpenAPI Schema: InsertTransaction
   * 
   * API expects camelCase fields with this structure:
   * - type: String ("Sale", "Authorize", "Capture", "Credit", "Refund", "Verification", "ForceAuth")
   * - remit.baseAmount: Transaction amount (double, not cents!)
   * - remit.currencyCode: ISO currency code ("USD")
   * - paymentMethod.customer: Link to existing customer with saved payment method
   * - caption: Max 19 characters for card statement
   * 
   * IMPORTANT: API does NOT accept raw card numbers or account numbers.
   * You must either:
   * 1. Use tokenization (cardToken/achToken)
   * 2. Reference a saved customer payment method (customerPaymentMethodId)
   * 3. Use physical terminals
   * 
   * @param request - Transaction creation request
   * @returns Promise resolving to created transaction
   */
  async create(request: CreateTransactionRequest): Promise<Transaction> {
    // Validate amount (specific validation BEFORE validateRequired)
    if (request.amount === undefined || request.amount === null) {
      throw new ValidationError('Transaction amount is required');
    }
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new ValidationError('Transaction amount must be a positive integer (cents)');
    }
    
    // Validate currency (specific validation BEFORE validateRequired)
    if (!request.currency) {
      throw new ValidationError('Currency is required');
    }
    if (!/^[A-Z]{3}$/.test(request.currency)) {
      throw new ValidationError('Currency must be a valid ISO 4217 code (e.g., USD, EUR)');
    }
    
    // Validate customer ID (specific validation BEFORE validateRequired)
    if (!request.customerId) {
      throw new ValidationError('Customer ID is required');
    }
    this.validateUUID(request.customerId, 'Customer ID');
    
    // Validate Remit is provided
    if (!request.Remit) {
      throw new ValidationError('Remit is required');
    }
    
    // Payment method is optional - if not provided, API uses customer's default
    // If provided, validate it
    if (request.paymentMethod) {
      this.validatePaymentMethod(request.paymentMethod);
    }
    
    // Validate addresses if provided
    if (request.billingAddress) {
      this.validateAddress(request.billingAddress, 'Billing');
    }
    if (request.shippingAddress) {
      this.validateAddress(request.shippingAddress, 'Shipping');
    }
    
    // Map TransactionType enum to API string values
    const typeMap: Record<TransactionType, string> = {
      [TransactionType.SALE]: 'Sale',
      [TransactionType.AUTHORIZATION]: 'Authorize',
      [TransactionType.CAPTURE]: 'Capture',
      [TransactionType.VOID]: 'Void',
      [TransactionType.REFUND]: 'Refund',
      [TransactionType.CREDIT]: 'Credit'
    };
    
    const transactionType = request.type !== undefined ? request.type : TransactionType.SALE;
    const typeString = typeMap[transactionType];
    
    // Convert amount from cents to dollars (API expects double, not cents)
    const amountInDollars = request.amount / 100;
    
    // Build remit object (camelCase per API docs)
    // API structure from InsertTransaction schema:
    // - baseAmount: double (in dollars) - amount before tax
    // - totalAmount: double (optional) - total after tax/fees  
    // - currencyCode: string (required)
    const remit: any = {
      baseAmount: amountInDollars,
      totalAmount: amountInDollars, // Set equal to baseAmount initially
      currencyCode: request.currency,
      isTaxExempt: false,
      addTaxToTotal: true
    };
    
    // If Request includes Remit with totalAmount, use that
    if (request.Remit?.totalAmount) {
      remit.totalAmount = request.Remit.totalAmount / 100; // Convert to dollars
    }
    
    if (request.Remit?.taxAmount) {
      remit.taxAmount = request.Remit.taxAmount / 100; // Convert to dollars
      // If tax is provided, update totalAmount to include it
      if (remit.isTaxExempt === false && remit.addTaxToTotal) {
        remit.totalAmount = remit.baseAmount + remit.taxAmount;
      }
    }
    if (request.Remit?.tipAmount) {
      remit.tip = request.Remit.tipAmount / 100; // Convert to dollars
    }
    
    // Build paymentMethod object (camelCase per API docs)
    // API requires either tokens or references to saved payment methods
    // If no payment method is specified, API will use customer's default payment method
    let paymentMethod: any = undefined;
    
    // Only build paymentMethod structure if user provided payment method details
    if (request.paymentMethod) {
      paymentMethod = {
        customer: {
          customerId: request.customerId
        }
      };
      
      // If paymentMethod structure is provided with customer reference
      if (request.paymentMethod.customer) {
        // Use the provided customer reference structure
        if (request.paymentMethod.customer.customerPaymentMethodId) {
          paymentMethod.customer.customerPaymentMethodId = request.paymentMethod.customer.customerPaymentMethodId;
        }
        if (request.paymentMethod.customer.customerBillingAddressId) {
          paymentMethod.customer.customerBillingAddressId = request.paymentMethod.customer.customerBillingAddressId;
        }
        if (request.paymentMethod.customer.customerShippingAddressId) {
          paymentMethod.customer.customerShippingAddressId = request.paymentMethod.customer.customerShippingAddressId;
        }
      }
      // Legacy support: If a paymentMethodId is provided at root level
      else if ('paymentMethodId' in request.paymentMethod) {
        paymentMethod.customer.customerPaymentMethodId = (request.paymentMethod as any).paymentMethodId;
      }
    }
    // Note: If paymentMethod is undefined, API will use customer's default payment method
    
    // Build API request (camelCase structure per docs)
    const apiRequest: any = {
      type: typeString,
      remit
    };
    
    // Only include paymentMethod if it was specified
    if (paymentMethod) {
      apiRequest.paymentMethod = paymentMethod;
    }
    
    // Optional fields (camelCase)
    if (request.description) {
      // Caption max 19 chars for card statement
      apiRequest.caption = request.description.substring(0, 19);
    }
    if (request.orderId) apiRequest.orderId = request.orderId;
    if (request.metadata?.poNumber) apiRequest.poNumber = request.metadata.poNumber;
    
    // Handle addresses if provided
    if (request.billingAddress || request.shippingAddress) {
      apiRequest.address = [];
      
      if (request.billingAddress) {
        apiRequest.address.push({
          isPhysical: true,
          isBilling: true,
          isShipping: false,
          firstName: request.billingAddress.firstName || null,
          lastName: request.billingAddress.lastName || null,
          company: request.billingAddress.company || null,
          email: request.billingAddress.email || null,
          phone: request.billingAddress.phone || null,
          addressLine1: request.billingAddress.line1 || null,
          addressLine2: request.billingAddress.line2 || null,
          city: request.billingAddress.city || null,
          state: request.billingAddress.state || null,
          postalCode: request.billingAddress.postalCode || null,
          country: request.billingAddress.country || null
        });
      }
      
      if (request.shippingAddress) {
        apiRequest.address.push({
          isPhysical: true,
          isBilling: false,
          isShipping: true,
          firstName: request.shippingAddress.firstName || null,
          lastName: request.shippingAddress.lastName || null,
          company: request.shippingAddress.company || null,
          email: request.shippingAddress.email || null,
          phone: request.shippingAddress.phone || null,
          addressLine1: request.shippingAddress.line1 || null,
          addressLine2: request.shippingAddress.line2 || null,
          city: request.shippingAddress.city || null,
          state: request.shippingAddress.state || null,
          postalCode: request.shippingAddress.postalCode || null,
          country: request.shippingAddress.country || null
        });
      }
    }
    
    const response = await this.apiClient.post<Transaction>(
      this.buildPath('/transaction'),
      apiRequest
    );

    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Retrieve a transaction by ID
   * 
   * Fetches complete transaction details including payment method information,
   * status, amounts, and timestamps.
   * 
   * @param transactionId - Transaction ID (UUID)
   * @returns Promise resolving to full transaction details
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction/GET/api/gateway/{gatewayId}/transaction/{transactionId}
   * 
   * @example
   * ```typescript
   * const transaction = await client.transactions.get('txn_id_12345');
   * console.log(transaction.amount, transaction.status);
   * ```
   */
  async get(transactionId: string): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    const response = await this.apiClient.get<Transaction>(
      this.buildPath(`/transaction/${transactionId}`)
    );

    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Capture an authorized transaction
   * 
   * Captures a previously authorized transaction. Can capture full or partial amount.
   * The capture amount cannot exceed the authorized amount.
   * 
   * @param transactionId - Transaction ID to capture
   * @param request - Capture request parameters (amount in cents, optional description)
   * @returns Promise resolving to updated transaction
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction/PUT/api/gateway/{gatewayId}/transaction/{transactionId}/capture
   * 
   * @example
   * ```typescript
   * // Capture full authorization
   * const captured = await client.transactions.capture(authTxnId);
   * 
   * // Capture partial amount
   * const partialCapture = await client.transactions.capture(authTxnId, {
   *   amount: 5000, // $50.00 in cents
   *   description: 'Partial capture for actual charges'
   * });
   * ```
   */
  async capture(transactionId: string, request: CaptureTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate capture amount if provided
    if (request.amount !== undefined) {
      if (!Number.isInteger(request.amount) || request.amount <= 0) {
        throw new Error('Capture amount must be a positive integer (cents)');
      }
    }
    
    // Build API request - convert amount from cents to dollars
    const apiRequest: any = {};
    if (request.amount !== undefined) {
      apiRequest.amount = request.amount / 100; // Convert cents to dollars
    }
    if (request.description) {
      apiRequest.description = request.description;
    }
    
    const response = await this.apiClient.put<Transaction>(
      this.buildPath(`/transaction/${transactionId}/capture`),
      apiRequest
    );

    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Void a pending or authorized transaction
   * 
   * Cancels a transaction before it is captured or settled.
   * Only pending or authorized transactions can be voided.
   * 
   * @param transactionId - Transaction ID to void
   * @param request - Void request parameters (optional description)
   * @returns Promise resolving to updated transaction
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction/PUT/api/gateway/{gatewayId}/transaction/{transactionId}/void
   * 
   * @example
   * ```typescript
   * const voidedTxn = await client.transactions.void(authTxnId, {
   *   description: 'Customer cancelled reservation'
   * });
   * ```
   */
  async void(transactionId: string, request: VoidTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    const response = await this.apiClient.put<Transaction>(
      this.buildPath(`/transaction/${transactionId}/void`),
      request
    );

    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Refund a completed transaction
   * 
   * Creates a refund for a settled transaction. Can refund full or partial amount.
   * Multiple partial refunds are supported up to the original transaction amount.
   * 
   * @param transactionId - Transaction ID to refund
   * @param request - Refund request parameters (amount in cents, optional description)
   * @returns Promise resolving to refund transaction
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction/POST/api/gateway/{gatewayId}/transaction/{transactionId}/refund
   * 
   * @example
   * ```typescript
   * // Full refund
   * const fullRefund = await client.transactions.refund(txnId);
   * 
   * // Partial refund
   * const partialRefund = await client.transactions.refund(txnId, {
   *   amount: 2500, // Refund $25.00 in cents
   *   description: 'Customer return - shipping fee'
   * });
   * ```
   */
  async refund(transactionId: string, request: RefundTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate refund amount if provided
    if (request.amount !== undefined) {
      if (!Number.isInteger(request.amount) || request.amount <= 0) {
        throw new Error('Refund amount must be a positive integer (cents)');
      }
    }
    
    // Build API request - convert amount from cents to dollars
    const apiRequest: any = {};
    if (request.amount !== undefined) {
      apiRequest.amount = request.amount / 100; // Convert cents to dollars
    }
    if (request.description) {
      apiRequest.description = request.description;
    }
    if (request.reason) {
      apiRequest.reason = request.reason;
    }
    
    const response = await this.apiClient.post<Transaction>(
      this.buildPath(`/transaction/${transactionId}/refund`),
      apiRequest
    );

    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Increment authorization amount for an authorized transaction
   * 
   * ⚠️ NOTE: This endpoint may not be available in all environments.
   * Sandbox testing shows HTTP 404, suggesting this feature may be limited to production
   * or specific gateway configurations.
   * 
   * @param transactionId - Transaction ID to increment authorization
   * @param request - Increment authorization request (amount in cents)
   * @returns Promise resolving to updated transaction
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction
   * 
   * @example
   * ```typescript
   * try {
   *   const incremented = await client.transactions.incrementAuthorization(txnId, {
   *     amount: 2500, // Add $25.00 to authorization
   *     description: 'Additional authorization for incidentals'
   *   });
   * } catch (error) {
   *   // May return 404 if not supported by gateway
   *   console.error('Increment not supported:', error);
   * }
   * ```
   */
  async incrementAuthorization(transactionId: string, request: IncrementAuthorizationRequest): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    this.validateRequired(request, ['amount']);
    
    // Validate increment amount
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error('Increment amount must be a positive integer (cents)');
    }
    
    // Build API request - convert amount from cents to dollars
    const apiRequest: any = {
      amount: request.amount / 100, // Convert cents to dollars
    };
    if (request.description) {
      apiRequest.description = request.description;
    }
    
    const response = await this.apiClient.put(this.buildPath(`/transaction/${transactionId}/increment-authorization`), apiRequest);
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Search transactions with advanced filtering
   * 
   * @param params - Search and filtering parameters
   * @returns Promise resolving to transaction search results
   */
  async search(params: TransactionSearchParams = {}): Promise<TransactionListResponse> {
    // Validate pagination parameters
    if (params.page !== undefined) {
      if (!Number.isInteger(params.page) || params.page < 1) {
        throw new Error('Page number must be a positive integer');
      }
    }
    
    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
        throw new Error('Limit must be an integer between 1 and 100');
      }
    }
    
    // Validate amount range
    if (params.amountRange) {
      const { min, max } = params.amountRange;
      if (min !== undefined && (!Number.isInteger(min) || min < 0)) {
        throw new Error('Minimum amount must be a non-negative integer');
      }
      if (max !== undefined && (!Number.isInteger(max) || max < 0)) {
        throw new Error('Maximum amount must be a non-negative integer');
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new Error('Minimum amount must be less than or equal to maximum amount');
      }
    }
    
    // Validate date ranges
    if (params.dateRange) {
      this.validateDateRange(params.dateRange.startDate, params.dateRange.endDate);
    }
    
    if (params.createdRange) {
      this.validateDateRange(params.createdRange.startDate, params.createdRange.endDate);
    }
    
    // Validate customer ID if provided
    if (params.customerId) {
      this.validateUUID(params.customerId, 'Customer ID');
    }
    
    // Validate gateway ID if provided
    if (params.gatewayId) {
      this.validateUUID(params.gatewayId, 'Gateway ID');
    }
    
    // Transform consumer-facing params to API format
    const apiSearchRequest = this.buildSearchRequest(params);
    
    // Wrap in transactionSearchRequest as required by API
    // Note: API documentation shows direct fields, but actual API requires wrapper
    const requestBody = { transactionSearchRequest: apiSearchRequest };
    
    const response = await this.apiClient.post<TransactionListResponse>(
      this.buildPath('/transaction/search'),
      requestBody
    );

    return this.handleApiResponse<TransactionListResponse>(response);
  }
  
  /**
   * List transactions with basic pagination
   * 
   * @param params - Basic listing parameters
   * @returns Promise resolving to transaction list
   */
  async list(params: { page?: number; limit?: number; customerId?: string } = {}): Promise<TransactionListResponse> {
    return this.search(params);
  }
  
  /**
   * Get transactions by customer ID
   * 
   * @param customerId - Customer ID
   * @param params - Additional search parameters
   * @returns Promise resolving to customer's transactions
   */
  async getByCustomer(customerId: string, params: Omit<TransactionSearchParams, 'customerId'> = {}): Promise<TransactionListResponse> {
    this.validateUUID(customerId, 'Customer ID');
    
    return this.search({
      ...params,
      customerId
    });
  }
  
  /**
   * Get transactions by status
   * 
   * @param status - Transaction status or array of statuses
   * @param params - Additional search parameters
   * @returns Promise resolving to transactions with specified status
   */
  async getByStatus(status: TransactionStatus | TransactionStatus[], params: Omit<TransactionSearchParams, 'status'> = {}): Promise<TransactionListResponse> {
    return this.search({
      ...params,
      status
    });
  }
  
  /**
   * Get transactions by type
   * 
   * @param type - Transaction type or array of types
   * @param params - Additional search parameters
   * @returns Promise resolving to transactions with specified type
   */
  async getByType(type: TransactionType | TransactionType[], params: Omit<TransactionSearchParams, 'type'> = {}): Promise<TransactionListResponse> {
    return this.search({
      ...params,
      type
    });
  }
  
  /**
   * Get transactions by payment method type
   * 
   * @param paymentMethodType - Payment method type or array of types
   * @param params - Additional search parameters
   * @returns Promise resolving to transactions with specified payment method type
   */
  async getByPaymentMethodType(paymentMethodType: PaymentMethodType | PaymentMethodType[], params: Omit<TransactionSearchParams, 'paymentMethodType'> = {}): Promise<TransactionListResponse> {
    return this.search({
      ...params,
      paymentMethodType
    });
  }
  
  /**
   * Generate receipt for a transaction
   * 
   * @param transactionId - Transaction ID
   * @param format - Receipt format ('pdf' | 'html' | 'email' | 'sms')
   * @param params - Receipt parameters
   * @returns Promise resolving to receipt information
   */
  async generateReceipt(transactionId: string, format: 'pdf' | 'email' = 'pdf', params: {
    email?: string;
    from?: string;
    phone?: string;
    template?: string;
  } = {}): Promise<{ url?: string; content?: string; success?: boolean }> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate email format if provided
    if (params.email) {
      this.validateEmail(params.email);
    }
    
    // Validate phone format if provided (basic validation)
    if (params.phone) {
      if (!/^\+?[\d\s()]{10,}$/.test(params.phone)) {
        throw new Error('Invalid phone number format');
      }
    }
    
    // Email receipts use POST to /receipt/email endpoint
    if (format === 'email') {
      if (!params.email) {
        throw new Error('Email address is required for email receipts');
      }
      if (!params.from) {
        throw new Error('From email address is required for email receipts');
      }
      
      const response = await this.apiClient.post(
        this.buildPath(`/transaction/${transactionId}/receipt/email`),
        {
          recipient: {
            to: [params.email],
            name: null
          },
          from: params.from,
          type: 'Transaction',
          templateId: params.template || null
        }
      );
      
      return this.handleApiResponse<{ url?: string; content?: string; success?: boolean }>(response);
    }
    
    // PDF receipts use GET to /receipt endpoint
    // Note: API only supports PDF format, not HTML
    // Returns binary PDF data wrapped in JSON response
    const queryParams = new URLSearchParams();
    if (params.template) {
      queryParams.append('templateId', params.template);
    }
    
    const query = queryParams.toString();
    const endpoint = query 
      ? `/transaction/${transactionId}/receipt?${query}`
      : `/transaction/${transactionId}/receipt`;
    
    const response = await this.apiClient.get(this.buildPath(endpoint));
    
    return this.handleApiResponse<{ url?: string; content?: string }>(response);
  }
  
  /**
   * Validate payment method structure
   * 
   * @param paymentMethod - Payment method to validate
   */
  private validatePaymentMethod(paymentMethod: any): void {
    if (!paymentMethod) {
      throw new ValidationError('Payment method is required');
    }
    
    // Check if using customer reference (recommended approach)
    if (paymentMethod.customer) {
      // When using customer reference, we just need the customer ID
      // The payment method ID is optional (uses default if not specified)
      if (!paymentMethod.customer.customerId) {
        throw new ValidationError('Customer ID is required in payment method');
      }
      this.validateUUID(paymentMethod.customer.customerId, 'Customer ID in payment method');
      
      // If payment method ID is specified, validate it
      if (paymentMethod.customer.customerPaymentMethodId) {
        this.validateUUID(paymentMethod.customer.customerPaymentMethodId, 'Customer payment method ID');
      }
      
      // No further validation needed for customer reference
      return;
    }
    
    // Otherwise, validate inline payment data (testing/legacy only)
    if (!paymentMethod.type) {
      throw new ValidationError('Payment method type is required when not using customer reference');
    }
    
    const validTypes = Object.values(PaymentMethodType);
    if (!validTypes.includes(paymentMethod.type)) {
      throw new ValidationError(`Invalid payment method type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate card details if card payment
    if (paymentMethod.type === PaymentMethodType.CREDIT_CARD || paymentMethod.type === PaymentMethodType.DEBIT_CARD) {
      if (!paymentMethod.card) {
        throw new ValidationError('Card details are required for card payments');
      }
      
      const card = paymentMethod.card;
      
      // Validate card number
      if (!card.number) {
        throw new ValidationError('Card number is required');
      }
      
      // Validate expiration
      if (!Number.isInteger(card.expMonth) || card.expMonth < 1 || card.expMonth > 12) {
        throw new ValidationError('Card expiration month must be between 1 and 12');
      }
      
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(card.expYear) || card.expYear < currentYear) {
        throw new ValidationError('Card expiration year must be current year or later');
      }
      
      // Validate CVV
      if (!card.cvv || !/^\d{3,4}$/.test(card.cvv)) {
        throw new ValidationError('CVV must be 3 or 4 digits');
      }
    }
    
    // Validate bank account details if ACH payment
    if (paymentMethod.type === PaymentMethodType.ACH) {
      if (!paymentMethod.bankAccount) {
        throw new ValidationError('Bank account details are required for ACH payments');
      }
      
      const account = paymentMethod.bankAccount;
      
      // Validate account number
      if (!account.accountNumber || !/^\d{4,20}$/.test(account.accountNumber)) {
        throw new Error('Invalid bank account number format');
      }
      
      // Validate routing number 
      if (!account.routingNumber || !/^\d{9}$/.test(account.routingNumber)) {
        throw new Error('Routing number must be 9 digits');
      }
      
      // Validate account type
      const validAccountTypes = ['checking', 'savings', 'business_checking'];
      if (!validAccountTypes.includes(account.accountType)) {
        throw new Error(`Account type must be one of: ${validAccountTypes.join(', ')}`);
      }
      
      // Validate account holder name
      if (!account.accountHolderName || account.accountHolderName.trim().length === 0) {
        throw new Error('Account holder name is required');
      }
    }
    
    // Validate wallet token if digital wallet payment
    if (paymentMethod.type === PaymentMethodType.DIGITAL_WALLET) {
      if (!paymentMethod.walletToken || paymentMethod.walletToken.trim().length === 0) {
        throw new Error('Wallet token is required for digital wallet payments');
      }
    }
  }
  
  /**
   * Validate address structure
   * 
   * @param address - Address to validate
   * @param fieldName - Field name for error messages
   */
  private validateAddress(address: any, fieldName: string): void {
    const requiredFields = ['line1', 'city', 'state', 'postalCode', 'country'];
    
    for (const field of requiredFields) {
      if (!address[field] || address[field].trim().length === 0) {
        throw new Error(`${fieldName} ${field} is required`);
      }
    }
    
    // Validate country code (ISO 3166-1 alpha-2)
    if (!/^[A-Z]{2}$/.test(address.country)) {
      throw new Error(`${fieldName} country must be a valid ISO 3166-1 alpha-2 code (e.g., US, CA)`);
    }
    
    // Validate postal code format (basic validation)
    if (!/^[\w\s]{3,10}$/.test(address.postalCode)) {
      throw new Error(`${fieldName} postal code format is invalid`);
    }
  }
  
  /**
   * Handle API response with statusCode/statusDetails wrapper
   * 
   * @param response - Raw API response
   * @returns Extracted data from response
   */
  private handleApiResponse<T>(response: any): T {
    // Handle null/undefined responses
    if (!response) {
      throw new Error('No response received from API');
    }
    
    // For mocked responses, they might come directly in the wrapper format
    const apiResponse = response.statusCode ? response : this.handleResponse(response);
    
    // Check for API-level errors in statusCode
    if (apiResponse.statusCode && 
        apiResponse.statusCode !== 'Continue' && 
        apiResponse.statusCode !== 'OK' && 
        apiResponse.statusCode !== 'Created') {
      const statusDetails = apiResponse.statusDetails?.length 
        ? apiResponse.statusDetails.join(', ') 
        : 'Unknown error';
      throw new Error(`API Error: ${apiResponse.statusCode} - ${statusDetails}`);
    }
    
    // Extract data from response, handling potential wrappers
    let data = apiResponse.data || apiResponse;
    
    // If response has a transaction wrapper, unwrap it
    if (data && typeof data === 'object' && 'transaction' in data) {
      data = data.transaction;
    }
    
    // Transform Transaction objects from API format to client format
    if (data && typeof data === 'object' && 'transactionId' in data) {
      data = this.transformTransaction(data);
    }
    
    // Transform transaction lists
    if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
      data.items = data.items.map((item: any) => 
        item && typeof item === 'object' && 'transactionId' in item ? this.transformTransaction(item) : item
      );
    }
    
    // Transform search results from API format to client format
    // API returns: { results: [], offset, limit, rowCount }
    // Client expects: { data: [], pagination: { page, limit, total, totalPages } }
    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      const results = data.results.map((item: any) => 
        item && typeof item === 'object' && 'transactionId' in item ? this.transformTransaction(item) : item
      );
      
      const offset = data.offset || 0;
      const limit = data.limit || 10;
      const total = data.rowCount || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
      
      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: total > (offset + results.length),
          hasPreviousPage: offset > 0
        }
      } as any;
    }
    
    return data;
  }
  
  /**
   * Transform API response to Transaction interface
   * Maps API field names (PascalCase/camelCase) to client interface (camelCase)
   * 
   * API Response Structure (from GET /api/gateway/{gatewayId}/transaction/{transactionId}):
   * - transactionId: UUID
   * - type: String ("Sale", "Authorize", etc.)
   * - status: String ("PendingSettlement", "Authorized", etc.)
   * - remit: { baseAmount, currencyCode, totalAmount, taxAmount, etc. }
   * - customerId: UUID (may be at root or in nested object)
   * - paymentMethod: { customer: {...}, card: {...}, ach: {...} }
   * - createdAt, updatedAt: ISO 8601 timestamps
   * 
   * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction
   * 
   * @param apiData - Raw API response data
   * @returns Transformed transaction object
   */
  private transformTransaction(apiData: any): any {
    if (!apiData) return apiData;
    
    // Extract amount from remit object or direct fields
    // API returns amount in remit.totalAmount or remit.baseAmount (in dollars)
    let amountInCents = 0;
    if (apiData.remit) {
      amountInCents = (apiData.remit.totalAmount || apiData.remit.baseAmount || 0) * 100;
    } else if (apiData.totalAmount || apiData.baseAmount) {
      amountInCents = (apiData.totalAmount || apiData.baseAmount || 0) * 100;
    } else if (apiData.amount) {
      amountInCents = apiData.amount * 100; // Assume dollars if no remit object
    }
    
    // Map API fields to client interface
    const transformed: any = {
      id: apiData.transactionId || apiData.id,
      amount: amountInCents,
      currency: apiData.remit?.currencyCode || apiData.currencyCode || apiData.currency || 'USD',
      type: this.mapApiTypeToEnum(apiData.type),
      status: this.mapApiStatusToEnum(apiData.status),
      customerId: apiData.customerId || apiData.customer?.customerId,
      gatewayId: apiData.gatewayId || this.gatewayContext?.gatewayId,
    };
    
    // Optional fields
    if (apiData.description) transformed.description = apiData.description;
    if (apiData.orderId) transformed.orderId = apiData.orderId;
    if (apiData.invoiceId) transformed.invoiceId = apiData.invoiceId;
    if (apiData.gatewayTransactionId) transformed.gatewayTransactionId = apiData.gatewayTransactionId;
    if (apiData.authorizationCode) transformed.authorizationCode = apiData.authorizationCode;
    if (apiData.processorResponseCode) transformed.processorResponseCode = apiData.processorResponseCode;
    if (apiData.processorResponseMessage) transformed.processorResponseMessage = apiData.processorResponseMessage;
    if (apiData.avsResult) transformed.avsResult = apiData.avsResult;
    if (apiData.cvvResult) transformed.cvvResult = apiData.cvvResult;
    if (apiData.originalTransactionId) transformed.originalTransactionId = apiData.originalTransactionId;
    if (apiData.settlementBatchId) transformed.settlementBatchId = apiData.settlementBatchId;
    if (apiData.metadata) transformed.metadata = apiData.metadata;
    
    // Payment method transformation
    if (apiData.paymentMethod) {
      transformed.paymentMethod = this.transformPaymentMethod(apiData.paymentMethod);
    } else {
      // If no payment method in response, create minimal placeholder
      transformed.paymentMethod = {
        type: PaymentMethodType.CREDIT_CARD
      };
    }
    
    // Timestamps
    transformed.createdAt = apiData.createdAt ? new Date(apiData.createdAt) : new Date();
    transformed.updatedAt = apiData.updatedAt ? new Date(apiData.updatedAt) : new Date();
    if (apiData.authorizedAt) transformed.authorizedAt = new Date(apiData.authorizedAt);
    if (apiData.capturedAt) transformed.capturedAt = new Date(apiData.capturedAt);
    if (apiData.settledAt) transformed.settledAt = new Date(apiData.settledAt);
    if (apiData.voidedAt) transformed.voidedAt = new Date(apiData.voidedAt);
    
    return transformed;
  }
  
  /**
   * Transform payment method from API format
   */
  private transformPaymentMethod(apiData: any): any {
    if (!apiData) return { type: PaymentMethodType.CREDIT_CARD };
    
    const paymentMethod: any = {
      type: PaymentMethodType.CREDIT_CARD // Default
    };
    
    // Detect type from presence of card or account data
    if (apiData.card) {
      paymentMethod.type = PaymentMethodType.CREDIT_CARD;
      paymentMethod.card = {
        last4: apiData.card.maskedCard?.slice(-4) || apiData.card.last4 || '0000',
        brand: this.mapCardBrand(apiData.card.cardType || apiData.card.brand),
        expMonth: apiData.card.expirationMonth || parseInt(apiData.card.expirationDate?.split('/')[0] || '12'),
        expYear: apiData.card.expirationYear || parseInt(apiData.card.expirationDate?.split('/')[1] || new Date().getFullYear())
      };
    } else if (apiData.bankAccount || apiData.ach) {
      paymentMethod.type = PaymentMethodType.ACH;
      const account = apiData.bankAccount || apiData.ach;
      paymentMethod.bankAccount = {
        last4: account.maskedAccount?.slice(-4) || account.last4 || '0000',
        accountType: account.accountType || 'checking',
        bankName: account.bankName
      };
    }
    
    return paymentMethod;
  }
  
  /**
   * Map API type string to TransactionType enum
   */
  private mapApiTypeToEnum(type: string): TransactionType {
    const typeMap: Record<string, TransactionType> = {
      'Sale': TransactionType.SALE,
      'Authorize': TransactionType.AUTHORIZATION,
      'Capture': TransactionType.CAPTURE,
      'Void': TransactionType.VOID,
      'Refund': TransactionType.REFUND,
      'Credit': TransactionType.CREDIT
    };
    return typeMap[type] || TransactionType.SALE;
  }
  
  /**
   * Map API status string to TransactionStatus enum
   */
  private mapApiStatusToEnum(status: string): TransactionStatus {
    if (!status) return TransactionStatus.PENDING;
    
    // Handle various status formats
    const statusMap: Record<string, TransactionStatus> = {
      'PendingSettlement': TransactionStatus.SETTLED,
      'Authorized': TransactionStatus.AUTHORIZED,
      'Captured': TransactionStatus.CAPTURED,
      'Settled': TransactionStatus.SETTLED,
      'Voided': TransactionStatus.VOIDED,
      'Declined': TransactionStatus.DECLINED,
      'Failed': TransactionStatus.FAILED,
      'Cancelled': TransactionStatus.CANCELLED,
      'Refunded': TransactionStatus.REFUNDED,
      'PartiallyRefunded': TransactionStatus.PARTIALLY_REFUNDED,
      'Pending': TransactionStatus.PENDING
    };
    
    return statusMap[status] || TransactionStatus.PENDING;
  }
  
  /**
   * Map API card brand to CardBrand enum
   */
  private mapCardBrand(brand: string): CardBrand {
    if (!brand) return CardBrand.VISA;
    
    const brandMap: Record<string, CardBrand> = {
      'Visa': CardBrand.VISA,
      'MasterCard': CardBrand.MASTERCARD,
      'AmericanExpress': CardBrand.AMERICAN_EXPRESS,
      'Discover': CardBrand.DISCOVER,
      'DinersClub': CardBrand.DINERS_CLUB,
      'JCB': CardBrand.JCB,
      'UnionPay': CardBrand.UNIONPAY,
      'Maestro': CardBrand.MAESTRO
    };
    
    return brandMap[brand] || CardBrand.VISA;
  }
  
  /**
   * Build API search request from consumer-facing params
   * Transforms flat params to API format with filter objects
   * 
   * @param params - Consumer-facing search params
   * @returns API-formatted search request
   */
  private buildSearchRequest(params: TransactionSearchParams): TransactionSearchRequest {
    const apiRequest: TransactionSearchRequest = {};
    
    // Transform customerId to SearchFilterGuid
    if (params.customerId) {
      apiRequest.customerId = {
        operator: 'Equal',
        value: params.customerId
      };
    }
    
    // Transform status - use transactionStatuses for arrays, status for single value
    // API documentation: status field expects single value with Equal operator
    // transactionStatuses field expects array with Contains operator
    // API expects PascalCase values like "Captured", "Authorized"
    if (params.status) {
      if (Array.isArray(params.status)) {
        // Map enum values to API format
        const apiStatusValues = params.status.map(s => this.mapTransactionStatusToApi(s));
        apiRequest.transactionStatuses = {
          operator: 'Contains',
          values: apiStatusValues
        };
      } else {
        apiRequest.status = {
          operator: 'Equal',
          value: this.mapTransactionStatusToApi(params.status)
        };
      }
    }
    
    // Transform type - API expects string values like "Sale", not numeric enum values
    if (params.type !== undefined) {
      const typeValues = Array.isArray(params.type) ? params.type : [params.type];
      // Map numeric enum values to API string values (always returns string)
      const apiTypeValues = typeValues.map(t => this.mapTransactionTypeToApi(t));
      
      if (Array.isArray(params.type)) {
        apiRequest.transactionTypes = {
          operator: 'Contains',
          values: apiTypeValues
        };
      } else {
        // apiTypeValues[0] is guaranteed to exist and be a string
        apiRequest.type = {
          operator: 'Equal',
          value: apiTypeValues[0]!
        };
      }
    }
    
    // Transform paymentMethodType - handle single value vs array like status and type
    // Map our enum values to API values ("Card", "Ach", "Token", "Terminal")
    if (params.paymentMethodType) {
      if (Array.isArray(params.paymentMethodType)) {
        const apiValues = params.paymentMethodType.map(t => this.mapPaymentMethodTypeToApi(t));
        apiRequest.paymentMethodTypes = {
          operator: 'Contains',
          values: apiValues
        };
      } else {
        apiRequest.paymentMethod = {
          operator: 'Equal',
          value: this.mapPaymentMethodTypeToApi(params.paymentMethodType)
        };
      }
    }
    
    // Transform gatewayId to SearchFilterGuid
    if (params.gatewayId) {
      apiRequest.gatewayId = {
        operator: 'Equal',
        value: params.gatewayId
      };
    }
    
    // Transform orderId to SearchFilterGuid
    if (params.orderId) {
      apiRequest.orderId = {
        operator: 'Equal',
        value: params.orderId
      };
    }
    
    // Transform invoiceId to SearchFilterGuid
    if (params.invoiceId) {
      apiRequest.invoiceId = {
        operator: 'Equal',
        value: params.invoiceId
      };
    }
    
    // Transform amountRange - API expects amount field with appropriate operator
    // API does NOT support "Between" operator - use only IsGreaterOrEqual/IsLessThanOrEqual
    // When both min and max are provided, use IsGreaterOrEqual for min (max is ignored in single filter)
    if (params.amountRange) {
      const hasMin = params.amountRange.min !== undefined;
      const hasMax = params.amountRange.max !== undefined;

      if (hasMin && hasMax) {
        // Both min and max: use IsGreaterOrEqual for min (API doesn't support Between)
        // TODO: Consider using both conditions separately if API supports AND logic on same field
        apiRequest.amount = {
          operator: 'IsGreaterOrEqual',
          value: params.amountRange.min
        };
      } else if (hasMin) {
        // Min only: use IsGreaterOrEqual (matches API documentation)
        apiRequest.amount = {
          operator: 'IsGreaterOrEqual',
          value: params.amountRange.min
        };
      } else if (hasMax) {
        // Max only: use IsLessThanOrEqual
        apiRequest.amount = {
          operator: 'IsLessThanOrEqual',
          value: params.amountRange.max
        };
      }
    }
    
    // Transform dateRange - API expects createdDateTime with Between operator
    // API documentation shows: { operator: "Between", startDate: "...", endDate: "..." }
    if (params.dateRange) {
      apiRequest.createdDateTime = {
        operator: 'Between',
        startDate: params.dateRange.startDate || null,
        endDate: params.dateRange.endDate || null
      };
    }
    
    // Transform createdRange (alias for dateRange with explicit field name)
    if (params.createdRange) {
      apiRequest.createdDateTime = {
        operator: 'Between',
        startDate: params.createdRange.startDate || null,
        endDate: params.createdRange.endDate || null
      };
    }
    
    // Pass through non-filter params directly
    if (params.search) apiRequest.search = params.search;
    if (params.page) apiRequest.page = params.page;
    if (params.limit) apiRequest.limit = params.limit;
    if (params.sortBy) apiRequest.sortBy = params.sortBy;
    if (params.sortOrder) apiRequest.sortOrder = params.sortOrder;
    
    return apiRequest;
  }
}

/**
 * Export TransactionService as default
 */
export default TransactionService;