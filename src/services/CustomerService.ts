import { BaseService } from './BaseService';
import { ValidationError } from '../lib/errors';
import type {
  Customer,
  CustomerApiResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  SearchCustomerRequest,
  CustomerSearchResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
  CustomerAddress,
  CreateCustomerPaymentMethodRequest,
  UpdateCustomerPaymentMethodRequest,
  CustomerPaymentMethod,
  PayableTokenResponse
} from '../types/Customer';
import type { ApiClient } from '../lib/ApiClient';
import type { IQProConfig } from '../types/Config';

/**
 * Customer Service for managing customer entities
 * 
 * Provides comprehensive customer management functionality including:
 * - Creating, updating, and deleting customers
 * - Retrieving customer information
 * - Searching customers
 * - Managing customer addresses
 * - Managing customer payment methods
 * - Generating payable tokens
 */
export class CustomerService extends BaseService {
  constructor(apiClient: ApiClient, config: IQProConfig) {
    super(apiClient, config);
  }

  /**
   * Create a new customer
   * 
   * @param customerData - Customer creation request data
   * @param idempotencyKey - Optional idempotency key for duplicate prevention
   * @returns Promise resolving to created customer
   */
  async create(customerData: CreateCustomerRequest, idempotencyKey?: string): Promise<Customer> {
    // Validate required fields per API documentation
    this.validateRequired(customerData, ['name']);
    
    // Validate addresses if provided
    if (customerData.addresses && customerData.addresses.length > 0) {
      for (const address of customerData.addresses) {
        this.validateRequired(address, ['addressLine1', 'city', 'state', 'postalCode', 'country']);
      }
    }

    // Prepare headers with idempotency key if provided
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['x-iqp-idempotency-key'] = idempotencyKey;
    }

    const response = await this.apiClient.post<CustomerApiResponse>(
      this.buildPath('/customer'),
      customerData,
      { headers }
    );

    return this.handleApiResponse(response);
  }

  /**
   * Retrieve a customer by ID
   * 
   * @param customerId - Customer ID
   * @returns Promise resolving to customer data
   */
  async get(customerId: string): Promise<Customer> {
    this.validateUUID(customerId, 'Customer ID');
    
    const response = await this.apiClient.get<CustomerApiResponse>(
      this.buildPath(`/customer/${customerId}`)
    );

    return this.handleApiResponse(response);
  }

  /**
   * Update an existing customer
   * 
   * @param customerId - Customer ID
   * @param customerData - Customer update request data
   * @returns Promise resolving to updated customer
   */
  async update(customerId: string, customerData: UpdateCustomerRequest): Promise<Customer> {
    this.validateUUID(customerId, 'Customer ID');
    
    const response = await this.apiClient.put<CustomerApiResponse>(
      this.buildPath(`/customer/${customerId}`),
      customerData
    );

    return this.handleApiResponse(response);
  }

  /**
   * Delete a customer
   * 
   * @param customerId - Customer ID
   * @returns Promise resolving when deletion is complete
   */
  async delete(customerId: string): Promise<void> {
    this.validateUUID(customerId, 'Customer ID');
    
    await this.apiClient.delete(
      this.buildPath(`/customer/${customerId}`)
    );
  }

  /**
   * Search customers using API-compliant operator-based structure
   * 
   * @param searchParams - Search parameters with operators
   * @returns Promise resolving to search results
   */
  async search(searchParams: SearchCustomerRequest = {}): Promise<Customer[]> {
    // Validate pagination parameters if provided
    if (searchParams.offset !== undefined && searchParams.offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }
    if (searchParams.limit !== undefined) {
      if (!Number.isInteger(searchParams.limit) || searchParams.limit < 1 || searchParams.limit > 100) {
        throw new ValidationError('Limit must be an integer between 1 and 100');
      }
    }

    const response = await this.apiClient.post<CustomerSearchResponse>(
      this.buildPath('/customer/search'),
      searchParams
    );

    // Handle the search response wrapper format
    if (response.statusCode && response.data) {
      return response.data.customers;
    }
    
    // Fallback to handleResponse for other formats
    const apiResponse = this.handleResponse(response);
    return (apiResponse as any).data?.customers || [];
  }

  /**
   * Create a customer address
   * 
   * @param customerId - Customer ID
   * @param addressData - Address creation request data
   * @returns Promise resolving to created address
   */
  async createAddress(customerId: string, addressData: CreateAddressRequest): Promise<CustomerAddress> {
    this.validateUUID(customerId, 'Customer ID');
    this.validateRequired(addressData, ['addressLine1', 'city', 'state', 'postalCode', 'country']);
    
    const response = await this.apiClient.post<{ statusCode: string; statusDetails: string[]; data: CustomerAddress }>(
      this.buildPath(`/customer/${customerId}/address`),
      addressData
    );

    return this.handleApiResponse(response);
  }

  /**
   * Update a customer address using PATCH with JSON Patch format
   * 
   * @param customerId - Customer ID
   * @param addressId - Address ID (uses customerAddressId from API)
   * @param addressData - Address update request data
   * @returns Promise resolving to updated address
   */
  async updateAddress(customerId: string, addressId: string, addressData: UpdateAddressRequest): Promise<CustomerAddress> {
    this.validateUUID(customerId, 'Customer ID');
    this.validateUUID(addressId, 'Address ID');
    
    // Convert simple object updates to JSON Patch format
    const patchOperations = this.convertToJsonPatch(addressData);
    
    const response = await this.apiClient.patch<{ statusCode: string; statusDetails: string[]; data: CustomerAddress }>(
      this.buildPath(`/customer/${customerId}/address/${addressId}`),
      patchOperations
    );

    return this.handleApiResponse(response);
  }

  /**
   * Delete a customer address
   * 
   * @param customerId - Customer ID
   * @param addressId - Address ID (uses customerAddressId from API)
   * @returns Promise resolving when deletion is complete
   */
  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    this.validateUUID(customerId, 'Customer ID');
    this.validateUUID(addressId, 'Address ID');
    
    await this.apiClient.delete(
      this.buildPath(`/customer/${customerId}/address/${addressId}`)
    );
  }

  /**
   * Create a customer payment method
   * 
   * @param customerId - Customer ID
   * @param paymentData - Payment method creation request data
   * @returns Promise resolving to created payment method
   */
  async createPaymentMethod(customerId: string, paymentData: CreateCustomerPaymentMethodRequest): Promise<CustomerPaymentMethod> {
    this.validateUUID(customerId, 'Customer ID');
    
    // Validate payment method limit (25 max per customer)
    // Note: This would ideally check existing payment methods first
    
    const response = await this.apiClient.post<{ statusCode: string; statusDetails: string[]; data: CustomerPaymentMethod }>(
      this.buildPath(`/customer/${customerId}/payment`),
      paymentData
    );

    return this.handleApiResponse(response);
  }

  /**
   * Update a customer payment method using PATCH with JSON Patch format
   * 
   * @param customerId - Customer ID
   * @param paymentMethodId - Payment method ID (uses customerPaymentId from API)
   * @param paymentData - Payment method update request data
   * @returns Promise resolving to updated payment method
   */
  async updatePaymentMethod(customerId: string, paymentMethodId: string, paymentData: UpdateCustomerPaymentMethodRequest): Promise<CustomerPaymentMethod> {
    this.validateUUID(customerId, 'Customer ID');
    this.validateUUID(paymentMethodId, 'Payment Method ID');
    
    // Convert simple object updates to JSON Patch format
    const patchOperations = this.convertToJsonPatch(paymentData);
    
    const response = await this.apiClient.patch<{ statusCode: string; statusDetails: string[]; data: CustomerPaymentMethod }>(
      this.buildPath(`/customer/${customerId}/payment/${paymentMethodId}`),
      patchOperations
    );

    return this.handleApiResponse(response);
  }

  /**
   * Delete a customer payment method
   * 
   * @param customerId - Customer ID
   * @param paymentMethodId - Payment method ID (uses customerPaymentId from API)
   * @returns Promise resolving when deletion is complete
   */
  async deletePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    this.validateUUID(customerId, 'Customer ID');
    this.validateUUID(paymentMethodId, 'Payment Method ID');
    
    await this.apiClient.delete(
      this.buildPath(`/customer/${customerId}/payment/${paymentMethodId}`)
    );
  }

  /**
   * Generate a payable token for the customer
   * 
   * @param customerId - Customer ID
   * @returns Promise resolving to payable token
   */
  async generatePayableToken(customerId: string): Promise<{ token: string; expiresAt: string }> {
    this.validateUUID(customerId, 'Customer ID');
    
    const response = await this.apiClient.post<PayableTokenResponse>(
      this.buildPath(`/customer/${customerId}/payabletoken`)
    );

    // Handle the payable token response wrapper format
    if (response.statusCode && response.data) {
      return response.data;
    }
    
    // Fallback to handleResponse for other formats
    const apiResponse = this.handleResponse(response);
    return apiResponse.data || apiResponse;
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
    if (apiResponse.statusCode && apiResponse.statusCode !== 'Continue' && apiResponse.statusCode !== 'OK' && apiResponse.statusCode !== 'Created') {
      const statusDetails = apiResponse.statusDetails ? apiResponse.statusDetails.join(', ') : 'Unknown error';
      throw new Error(`API Error: ${apiResponse.statusCode} - ${statusDetails}`);
    }
    
    return apiResponse.data || apiResponse;
  }
}

/**
 * Export CustomerService as default
 */
export default CustomerService;