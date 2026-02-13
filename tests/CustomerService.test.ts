import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from '../src/services/CustomerService';
import { ApiClient } from '../src/lib/ApiClient';
import { ValidationError } from '../src/lib/errors';
import type { IQProConfig } from '../src/types/Config';
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
} from '../src/types/Customer';

// Mock ApiClient
vi.mock('../src/lib/ApiClient');

describe('CustomerService', () => {
  let config: IQProConfig;
  let mockApiClient: ApiClient;
  let customerService: CustomerService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'api://iq-pro-api/.default',
      oauthUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
      baseUrl: 'https://api.iqpro.com',
      timeout: 5000,
      retryAttempts: 2
    };

    mockApiClient = new ApiClient(config, {} as any);
    customerService = new CustomerService(mockApiClient, config);
    
    // Set gateway context for testing
    customerService.setGatewayContext('test-gateway-123');
  });

  describe('Gateway Context Management', () => {
    it('should require gateway context for API operations', async () => {
      const serviceWithoutContext = new CustomerService(mockApiClient, config);
      
      await expect(serviceWithoutContext.create({
        name: 'John Doe'
      })).rejects.toThrow('Gateway context is required');
    });

    it('should set and get gateway context', () => {
      customerService.setGatewayContext('gateway-456');
      const context = customerService.getGatewayContext();
      
      expect(context).toEqual({
        gatewayId: 'gateway-456'
      });
    });

    it('should clear gateway context', () => {
      customerService.clearGatewayContext();
      expect(customerService.getGatewayContext()).toBeUndefined();
    });
  });

  describe('create', () => {
    const validCustomerData: CreateCustomerRequest = {
      name: 'John Michael Doe',
      description: 'Test customer for API compliance',
      referenceId: 'ext-customer-123'
    };

    const mockCustomerResponse: CustomerApiResponse = {
      statusCode: 'Created',
      statusDetails: ['Customer created successfully'],
      data: {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Michael Doe',
        description: 'Test customer for API compliance',
        referenceId: 'ext-customer-123',
        sourceReferenceId: 'src-ref-123',
        createdDateTime: '2026-02-13T09:45:29.762Z',
        modifiedDateTime: '2026-02-13T09:45:29.762Z',
        hasCard: false,
        hasAch: false,
        customerPayableToken: null,
        addresses: [],
        paymentMethods: [],
        subscriptions: [],
        invoices: [],
        customFieldEntries: []
      }
    };

    beforeEach(() => {
      mockApiClient.post = vi.fn().mockResolvedValue(mockCustomerResponse);
    });

    it('should create customer with valid data', async () => {
      const customer = await customerService.create(validCustomerData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/customer',
        validCustomerData,
        { headers: {} }
      );
      expect(customer).toEqual(mockCustomerResponse.data);
    });

    it('should create customer with idempotency key', async () => {
      const idempotencyKey = 'unique-key-123';
      const customer = await customerService.create(validCustomerData, idempotencyKey);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/customer',
        validCustomerData,
        { headers: { 'x-iqp-idempotency-key': idempotencyKey } }
      );
      expect(customer).toEqual(mockCustomerResponse.data);
    });

    it('should validate required name field', async () => {
      await expect(customerService.create({
        name: ''
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('search (API-compliant operator-based)', () => {
    const mockSearchResponse: CustomerSearchResponse = {
      statusCode: 'OK',
      statusDetails: ['Search completed successfully'],
      data: {
        customers: [
          {
            customerId: '550e8400-e29b-41d4-a716-446655440000',
            name: 'John Doe',
            description: 'Test customer',
            referenceId: 'ext-123',
            sourceReferenceId: 'src-123',
            createdDateTime: '2026-02-13T09:45:29.762Z',
            modifiedDateTime: '2026-02-13T09:45:29.762Z',
            hasCard: true,
            hasAch: false,
            customerPayableToken: 'token-123',
            addresses: [],
            paymentMethods: [],
            subscriptions: [],
            invoices: [],
            customFieldEntries: []
          }
        ],
        pagination: {
          offset: 0,
          limit: 25,
          rowCount: 1
        }
      }
    };

    beforeEach(() => {
      mockApiClient.post = vi.fn().mockResolvedValue(mockSearchResponse);
    });

    it('should search customers with operator-based structure', async () => {
      const searchParams: SearchCustomerRequest = {
        name: { operator: 'contains', value: 'John' },
        referenceId: { operator: 'equals', value: 'ext-123' },
        offset: 0,
        limit: 50
      };

      const customers = await customerService.search(searchParams);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/customer/search',
        searchParams
      );
      expect(customers).toEqual(mockSearchResponse.data.customers);
    });

    it('should validate pagination parameters', async () => {
      await expect(customerService.search({ offset: -1 })).rejects.toThrow(ValidationError);
      await expect(customerService.search({ limit: 0 })).rejects.toThrow(ValidationError);
      await expect(customerService.search({ limit: 101 })).rejects.toThrow(ValidationError);
    });
  });

  describe('Address Management', () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    const addressId = '660e8400-e29b-41d4-a716-446655440000';

    describe('updateAddress', () => {
      const updateData: UpdateAddressRequest = {
        addressLine2: 'Unit 5C',
        phone: '+1-555-987-6543'
      };

      const mockUpdateResponse = {
        statusCode: 'OK',
        statusDetails: ['Address updated successfully'],
        data: {
          customerAddressId: addressId,
          addressLine1: '456 Oak Avenue',
          addressLine2: 'Unit 5C',
          city: 'Boston',
          state: 'MA',
          postalCode: '02101',
          country: 'US',
          phone: '+1-555-987-6543',
          createdDateTime: '2026-02-13T09:45:29.762Z',
          modifiedDateTime: '2026-02-13T10:30:45.123Z'
        }
      };

      beforeEach(() => {
        mockApiClient.patch = vi.fn().mockResolvedValue(mockUpdateResponse);
      });

      it('should update customer address using PATCH with JSON Patch format', async () => {
        const address = await customerService.updateAddress(customerId, addressId, updateData);

        // Verify PATCH method was called with JSON Patch operations
        expect(mockApiClient.patch).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/customer/' + customerId + '/address/' + addressId,
          [
            { op: 'replace', path: '/addressLine2', value: 'Unit 5C' },
            { op: 'replace', path: '/phone', value: '+1-555-987-6543' }
          ]
        );
        expect(address.customerAddressId).toBe(addressId);
      });
    });
  });

  describe('Payment Method Management', () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    const paymentMethodId = '770e8400-e29b-41d4-a716-446655440000';

    describe('createPaymentMethod', () => {
      const paymentData: CreateCustomerPaymentMethodRequest = {
        card: {
          cardNumber: '5555555555554444',
          expirationMonth: 6,
          expirationYear: 2027,
          securityCode: '456',
          cardHolderName: 'Jane Smith'
        },
        isDefault: false
      };

      const mockPaymentResponse = {
        statusCode: 'Created',
        statusDetails: ['Payment method created successfully'],
        data: {
          customerPaymentId: paymentMethodId,
          type: 'card' as const,
          isDefault: false,
          last4: '4444',
          cardBrand: 'MasterCard',
          createdDateTime: '2026-02-13T09:45:29.762Z',
          modifiedDateTime: '2026-02-13T09:45:29.762Z',
          card: {
            cardId: 'card-456',
            maskedCard: '****-****-****-4444',
            token: 'card-token-def',
            cardType: 'MasterCard',
            expirationDate: '06/27'
          }
        }
      };

      beforeEach(() => {
        mockApiClient.post = vi.fn().mockResolvedValue(mockPaymentResponse);
      });

      it('should create customer payment method using correct API endpoint', async () => {
        const paymentMethod = await customerService.createPaymentMethod(customerId, paymentData);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/customer/' + customerId + '/payment',
          paymentData
        );
        expect(paymentMethod.customerPaymentId).toBe(paymentMethodId);
      });
    });

    describe('updatePaymentMethod', () => {
      const updateData: UpdateCustomerPaymentMethodRequest = {
        isDefault: true
      };

      const mockUpdateResponse = {
        statusCode: 'OK',
        statusDetails: ['Payment method updated successfully'],
        data: {
          customerPaymentId: paymentMethodId,
          type: 'card' as const,
          isDefault: true,
          last4: '4444',
          cardBrand: 'MasterCard',
          createdDateTime: '2026-02-13T09:45:29.762Z',
          modifiedDateTime: '2026-02-13T10:30:45.123Z'
        }
      };

      beforeEach(() => {
        mockApiClient.patch = vi.fn().mockResolvedValue(mockUpdateResponse);
      });

      it('should update payment method using PATCH with JSON Patch format', async () => {
        const paymentMethod = await customerService.updatePaymentMethod(customerId, paymentMethodId, updateData);

        expect(mockApiClient.patch).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/customer/' + customerId + '/payment/' + paymentMethodId,
          [
            { op: 'replace', path: '/isDefault', value: true }
          ]
        );
        expect(paymentMethod.isDefault).toBe(true);
      });
    });

    describe('deletePaymentMethod', () => {
      beforeEach(() => {
        mockApiClient.delete = vi.fn().mockResolvedValue(undefined);
      });

      it('should delete payment method using correct API endpoint', async () => {
        await customerService.deletePaymentMethod(customerId, paymentMethodId);

        expect(mockApiClient.delete).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/customer/' + customerId + '/payment/' + paymentMethodId
        );
      });
    });
  });

  describe('generatePayableToken', () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    const mockTokenResponse: PayableTokenResponse = {
      statusCode: 'OK',
      statusDetails: ['Token generated successfully'],
      data: {
        token: 'payable-token-xyz789',
        expiresAt: '2026-02-13T17:45:29.762Z'
      }
    };

    beforeEach(() => {
      mockApiClient.post = vi.fn().mockResolvedValue(mockTokenResponse);
    });

    it('should generate payable token using correct API endpoint', async () => {
      const result = await customerService.generatePayableToken(customerId);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/customer/' + customerId + '/payabletoken'
      );
      expect(result).toEqual(mockTokenResponse.data);
    });
  });
});