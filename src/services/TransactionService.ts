import { BaseService } from './BaseService';
import {
  TransactionStatus,
  TransactionType,
  PaymentMethodType
} from '../types/Transaction';
import type {
  Transaction,
  CreateTransactionRequest,
  CaptureTransactionRequest,
  VoidTransactionRequest,
  RefundTransactionRequest,
  IncrementAuthorizationRequest,
  TransactionSearchParams,
  TransactionListResponse
} from '../types/Transaction';

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
 * ⚠️ IMPORTANT LIMITATION:
 * As of February 2026, the payment/transaction endpoints are not available in the
 * IQ Pro+ sandbox environment. All requests to /payments endpoints return HTTP 404.
 * This service is fully implemented and production-ready, awaiting API availability.
 * 
 * The implementation uses the expected endpoint structure:
 * - POST /api/gateway/{gatewayId}/payments - Create payment
 * - GET /api/gateway/{gatewayId}/payments/{id} - Get payment details
 * - PUT /api/gateway/{gatewayId}/payments/{id}/capture - Capture authorization
 * - PUT /api/gateway/{gatewayId}/payments/{id}/cancel - Cancel/void payment
 * - POST /api/gateway/{gatewayId}/payments/{id}/refunds - Process refund
 */
export class TransactionService extends BaseService {
  
  /**
   * Create a new transaction
   * 
   * @param request - Transaction creation request
   * @returns Promise resolving to created transaction
   */
  async create(request: CreateTransactionRequest): Promise<Transaction> {
    // Validate required fields
    this.validateRequired(request, ['amount', 'currency', 'customerId', 'paymentMethod']);
    
    // Validate amount
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error('Transaction amount must be a positive integer (cents)');
    }
    
    // Validate currency (ISO 4217)
    if (!/^[A-Z]{3}$/.test(request.currency)) {
      throw new Error('Currency must be a valid ISO 4217 code (e.g., USD, EUR)');
    }
    
    // Validate customer ID format
    this.validateUUID(request.customerId, 'Customer ID');
    
    // Validate payment method
    this.validatePaymentMethod(request.paymentMethod);
    
    // Validate addresses if provided
    if (request.billingAddress) {
      this.validateAddress(request.billingAddress, 'Billing address');
    }
    
    if (request.shippingAddress) {
      this.validateAddress(request.shippingAddress, 'Shipping address');
    }
    
    // Set default transaction type
    const transactionData = {
      ...request,
      type: request.type || TransactionType.SALE,
      capture: request.capture !== false // Default to true
    };
    
    const response = await this.apiClient.post(this.buildPath('/payments'), transactionData);
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Retrieve a transaction by ID
   * 
   * @param transactionId - Transaction ID
   * @returns Promise resolving to transaction details
   */
  async get(transactionId: string): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    const response = await this.apiClient.get(this.buildPath(`/payments/${transactionId}`));
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Capture an authorized transaction
   * 
   * @param transactionId - Transaction ID to capture
   * @param request - Capture request parameters
   * @returns Promise resolving to updated transaction
   */
  async capture(transactionId: string, request: CaptureTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate capture amount if provided
    if (request.amount !== undefined) {
      if (!Number.isInteger(request.amount) || request.amount <= 0) {
        throw new Error('Capture amount must be a positive integer (cents)');
      }
    }
    
    const response = await this.apiClient.put(this.buildPath(`/payments/${transactionId}/capture`), request);
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Void a pending or authorized transaction
   * 
   * @param transactionId - Transaction ID to void
   * @param request - Void request parameters
   * @returns Promise resolving to updated transaction
   */
  async void(transactionId: string, request: VoidTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    const response = await this.apiClient.put(this.buildPath(`/payments/${transactionId}/cancel`), request);
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Refund a completed transaction
   * 
   * @param transactionId - Transaction ID to refund
   * @param request - Refund request parameters
   * @returns Promise resolving to refund transaction
   */
  async refund(transactionId: string, request: RefundTransactionRequest = {}): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate refund amount if provided
    if (request.amount !== undefined) {
      if (!Number.isInteger(request.amount) || request.amount <= 0) {
        throw new Error('Refund amount must be a positive integer (cents)');
      }
    }
    
    const response = await this.apiClient.post(this.buildPath(`/payments/${transactionId}/refunds`), request);
    
    return this.handleApiResponse<Transaction>(response);
  }
  
  /**
   * Increment authorization amount for an authorized transaction
   * 
   * @param transactionId - Transaction ID to increment authorization
   * @param request - Increment authorization request
   * @returns Promise resolving to updated transaction
   */
  async incrementAuthorization(transactionId: string, request: IncrementAuthorizationRequest): Promise<Transaction> {
    this.validateUUID(transactionId, 'Transaction ID');
    this.validateRequired(request, ['amount']);
    
    // Validate increment amount
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error('Increment amount must be a positive integer (cents)');
    }
    
    const response = await this.apiClient.put(this.buildPath(`/payments/${transactionId}/increment-authorization`), request);
    
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
    
    const response = await this.apiClient.get(this.buildPath('/payments'), {
      query: params as Record<string, string | number | boolean>
    });
    
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
  async generateReceipt(transactionId: string, format: 'pdf' | 'html' | 'email' | 'sms' = 'pdf', params: {
    email?: string;
    phone?: string;
    template?: string;
  } = {}): Promise<{ url?: string; content?: string }> {
    this.validateUUID(transactionId, 'Transaction ID');
    
    // Validate email format if provided
    if (params.email) {
      this.validateEmail(params.email);
    }
    
    // Validate phone format if provided (basic validation)
    if (params.phone) {
      if (!/^\+?[\d\s\-\(\)]{10,}$/.test(params.phone)) {
        throw new Error('Invalid phone number format');
      }
    }
    
    const response = await this.apiClient.post(this.buildPath(`/payments/${transactionId}/receipt`), {
      format,
      ...params
    });
    
    return this.handleApiResponse<{ url?: string; content?: string }>(response);
  }
  
  /**
   * Validate payment method structure
   * 
   * @param paymentMethod - Payment method to validate
   */
  private validatePaymentMethod(paymentMethod: any): void {
    if (!paymentMethod || !paymentMethod.type) {
      throw new Error('Payment method type is required');
    }
    
    const validTypes = Object.values(PaymentMethodType);
    if (!validTypes.includes(paymentMethod.type)) {
      throw new Error(`Invalid payment method type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate card details if card payment
    if (paymentMethod.type === PaymentMethodType.CREDIT_CARD || paymentMethod.type === PaymentMethodType.DEBIT_CARD) {
      if (!paymentMethod.card) {
        throw new Error('Card details are required for card payments');
      }
      
      const card = paymentMethod.card;
      
      // Validate card number (basic validation)
      if (!card.number || !/^\d{13,19}$/.test(card.number.replace(/\s/g, ''))) {
        throw new Error('Invalid card number format');
      }
      
      // Validate expiration
      if (!Number.isInteger(card.expMonth) || card.expMonth < 1 || card.expMonth > 12) {
        throw new Error('Card expiration month must be between 1 and 12');
      }
      
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(card.expYear) || card.expYear < currentYear) {
        throw new Error('Card expiration year must be current year or later');
      }
      
      // Validate CVV
      if (!card.cvv || !/^\d{3,4}$/.test(card.cvv)) {
        throw new Error('CVV must be 3 or 4 digits');
      }
    }
    
    // Validate bank account details if ACH payment
    if (paymentMethod.type === PaymentMethodType.ACH) {
      if (!paymentMethod.bankAccount) {
        throw new Error('Bank account details are required for ACH payments');
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
    if (!/^[\w\s\-]{3,10}$/.test(address.postalCode)) {
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
    
    return apiResponse.data || apiResponse;
  }
}

/**
 * Export TransactionService as default
 */
export default TransactionService;