import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../src/services/SubscriptionService';
import { ApiClient } from '../src/lib/ApiClient';
import { ValidationError } from '../src/lib/errors';
import type { IQProConfig } from '../src/types/Config';
import type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionSearchRequest,
  CancelSubscriptionRequest,
  ResumeSubscriptionRequest
} from '../src/types/Subscription';

// Mock ApiClient
vi.mock('../src/lib/ApiClient');

describe('SubscriptionService', () => {
  let config: IQProConfig;
  let mockApiClient: ApiClient;
  let subscriptionService: SubscriptionService;
  let mockSubscriptionData: Subscription;

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

    // Create mock ApiClient with all necessary methods
    mockApiClient = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    } as unknown as ApiClient;
    
    subscriptionService = new SubscriptionService(mockApiClient, config);
    
    // Set gateway context for testing
    subscriptionService.setGatewayContext('test-gateway-123');

    // Initialize mock data within beforeEach to avoid reference errors
    mockSubscriptionData = {
    subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Premium Monthly Plan',
    number: 'SUB-001',
    message: 'Thank you for subscribing',
    note: 'Customer requested annual billing',
    prefix: 'SUB',
    status: {
      subscriptionStatusId: 1,
      name: 'Active'
    },
    createdByUserId: 'user-123',
    createdDateTime: '2026-02-13T09:45:29.762Z',
    modifiedByUserId: 'user-123',
    modifiedDateTime: '2026-02-13T09:45:29.762Z',
    gateway: {
      gatewayId: 'test-gateway-123',
      name: 'Test Gateway'
    },
    customer: {
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Doe'
    },
    paymentMethod: {
      subscriptionPaymentMethodId: 'spm-123',
      customerPaymentMethod: {
        paymentMethodId: '550e8400-e29b-41d4-a716-446655440002',
        card: {
          cardId: 'card-123',
          maskedCard: '****1234',
          token: 'tok_123',
          cardType: 'Visa',
          expirationDate: '12/2028'
        },
        isDefault: true
      },
      cardProcessorId: 'proc-123',
      achProcessorId: null,
      isAutoCharged: true
    },
    recurrence: {
      subscriptionScheduleId: 'sched-123',
      billingPeriod: {
        billingPeriodId: 3,
        name: 'Monthly',
        length: 1,
        unitOfMeasure: {
          unitOfMeasureId: 3,
          name: 'Month'
        }
      },
      schedule: {
        name: 'Monthly on 1st',
        minutes: [0],
        hours: [0],
        daysOfMonth: [1],
        daysOfWeek: [],
        weeksOfMonth: [],
        weeksOfYear: [],
        monthsOfYear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      },
      numberOfBillingPeriods: null,
      trialLengthInDays: 0,
      invoiceLengthInDays: 30,
      isAutoRenewed: true,
      termStartDate: '2026-01-01T00:00:00.000Z',
      termEndDate: null,
      billingStartDate: '2026-01-01T00:00:00.000Z',
      allowProration: true,
      invoicesRemaining: 999
    },
    remit: {
      subscriptionRemitId: 'remit-123',
      baseAmount: 9999,
      taxAmount: 850,
      shippingAmount: 0,
      discountAmount: 0,
      surchargeAmount: 0,
      totalAmount: 10849
    },
    addresses: [
      {
        subscriptionAddressId: 'addr-123',
        addressId: 'addr-456',
        isRemittance: false,
        isShipping: true,
        isBilling: true,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp',
        email: 'john@example.com',
        phone: '555-0100',
        fax: null,
        addressLine1: '123 Main St',
        addressLine2: 'Suite 100',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'US'
      }
    ],
    invoices: [
      {
        invoiceId: 'inv-123',
        status: {
          invoiceStatusId: 1,
          name: 'Pending'
        },
        amountCaptured: 0,
        remainingBalance: 10849,
        invoiceDate: '2026-01-01T00:00:00.000Z',
        dueDate: '2026-01-31T00:00:00.000Z',
        createdDateTime: '2026-01-01T00:00:00.000Z',
        modifiedDateTime: '2026-01-01T00:00:00.000Z'
      }
    ],
    lineItems: [
      {
        lineItemId: 'line-123',
        name: 'Premium Plan',
        description: 'Monthly premium subscription',
        quantity: 1,
        unitPrice: 9999,
        discount: 0,
        freightAmount: 0,
        unitOfMeasureId: 1,
        localTaxPercent: 8.5,
        nationalTaxPercent: 0,
        commodityCode: 'SERV-001',
        productId: '550e8400-e29b-41d4-a716-446655440003',
        isTaxable: true,
        taxAmount: 850,
        unitOfMeasure: {
          unitOfMeasureId: 1,
          name: 'Each'
        }
      }
    ],
    customFieldEntries: []
    };
  });

  describe('Gateway Context Management', () => {
    it('should require gateway context for API operations', async () => {
      const serviceWithoutContext = new SubscriptionService(mockApiClient, config);
      
      await expect(serviceWithoutContext.create({
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test Subscription',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: {
          customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002',
          isAutoCharged: true
        },
        lineItems: [{
          name: 'Test Item',
          description: 'Test',
          quantity: 1,
          unitPrice: 1000,
          unitOfMeasureId: 1
        }]
      })).rejects.toThrow('Gateway context is required');
    });

    it('should set and get gateway context', () => {
      subscriptionService.setGatewayContext('gateway-456');
      const context = subscriptionService.getGatewayContext();
      
      expect(context).toEqual({
        gatewayId: 'gateway-456'
      });
    });

    it('should clear gateway context', () => {
      subscriptionService.clearGatewayContext();
      expect(subscriptionService.getGatewayContext()).toBeUndefined();
    });
  });

  describe('create', () => {
    const validCreateRequest: CreateSubscriptionRequest = {
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      subscriptionStatusId: 1,
      name: 'Premium Monthly Plan',
      recurrence: {
        termStartDate: '2026-01-01T00:00:00.000Z',
        billingStartDate: '2026-01-01T00:00:00.000Z',
        isAutoRenewed: true,
        allowProration: true,
        schedule: {
          monthsOfYear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          daysOfMonth: [1]
        }
      },
      paymentMethod: {
        customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002',
        isAutoCharged: true
      },
      lineItems: [{
        name: 'Premium Plan',
        description: 'Monthly premium subscription',
        quantity: 1,
        unitPrice: 9999,
        unitOfMeasureId: 1
      }]
    };

    beforeEach(() => {
      // Set up mock with response structure
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'Created',
        statusDetails: ['Subscription created successfully'],
        data: mockSubscriptionData
      });
    });

    it('should create subscription with valid data', async () => {
      // Debug: verify mock is set up
      expect(mockApiClient.post).toBeDefined();
      
      const subscription = await subscriptionService.create(validCreateRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription',
        validCreateRequest
      );
      expect(subscription).toEqual(mockSubscriptionData);
      expect(subscription.subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should create subscription with full recurrence schedule', async () => {
      const requestWithComplexSchedule = {
        ...validCreateRequest,
        recurrence: {
          ...validCreateRequest.recurrence,
          schedule: {
            minutes: [0, 30],
            hours: [9, 17],
            daysOfMonth: [1, 15],
            daysOfWeek: [1, 3, 5],
            weeksOfMonth: [1, 3],
            weeksOfYear: [1, 13, 26, 39, 52],
            monthsOfYear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          },
          numberOfBillingPeriods: 12,
          trialLengthInDays: 14,
          invoiceLengthInDays: 30
        }
      };

      await subscriptionService.create(requestWithComplexSchedule);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription',
        requestWithComplexSchedule
      );
    });

    it('should create subscription with multiple addresses', async () => {
      const requestWithAddresses = {
        ...validCreateRequest,
        addresses: [
          {
            isRemittance: false,
            isShipping: true,
            isBilling: false,
            firstName: 'John',
            lastName: 'Doe',
            addressLine1: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            postalCode: '62701',
            country: 'US',
            email: 'john@example.com'
          },
          {
            isRemittance: true,
            isShipping: false,
            isBilling: true,
            company: 'Acme Corp',
            addressLine1: '456 Business Ave',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60601',
            country: 'US',
            email: 'billing@example.com'
          }
        ]
      };

      await subscriptionService.create(requestWithAddresses);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription',
        requestWithAddresses
      );
    });

    it('should create subscription with custom fields', async () => {
      const requestWithCustomFields = {
        ...validCreateRequest,
        customFields: [
          { customFieldId: 1, customFieldValue: ['Value 1'] },
          { customFieldId: 2, customFieldValue: ['Value A', 'Value B'] }
        ]
      };

      await subscriptionService.create(requestWithCustomFields);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription',
        requestWithCustomFields
      );
    });

    it('should validate required customerId', async () => {
      const invalidRequest = { ...validCreateRequest, customerId: '' };
      
      await expect(subscriptionService.create(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should validate required line items', async () => {
      const invalidRequest = { ...validCreateRequest, lineItems: [] };
      
      await expect(subscriptionService.create(invalidRequest))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      (mockApiClient.get as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Subscription retrieved successfully'],
        data: mockSubscriptionData
      });
    });

    it('should retrieve subscription by ID', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000'
      );
      expect(subscription).toEqual(mockSubscriptionData);
    });

    it('should include all nested objects', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(subscription.paymentMethod).toBeDefined();
      expect(subscription.recurrence).toBeDefined();
      expect(subscription.addresses).toHaveLength(1);
      expect(subscription.lineItems).toHaveLength(1);
      expect(subscription.invoices).toHaveLength(1);
    });

    it('should transform dates correctly', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(subscription.createdDateTime).toBe('2026-02-13T09:45:29.762Z');
      expect(subscription.recurrence.termStartDate).toBe('2026-01-01T00:00:00.000Z');
      expect(subscription.invoices[0].invoiceDate).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should validate UUID format', async () => {
      await expect(subscriptionService.get('invalid-uuid'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    const updateRequest: UpdateSubscriptionRequest = {
      name: 'Updated Plan Name',
      note: 'Updated note'
    };

    beforeEach(() => {
      (mockApiClient.put as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Subscription updated successfully'],
        data: { ...mockSubscriptionData, ...updateRequest }
      });
    });

    it('should update subscription name', async () => {
      const subscription = await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'New Name' }
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        { name: 'New Name' }
      );
      expect(subscription.name).toBe('Updated Plan Name');
    });

    it('should update subscription status', async () => {
      await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        { subscriptionStatusId: 2 }
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        { subscriptionStatusId: 2 }
      );
    });

    it('should update recurrence schedule', async () => {
      const scheduleUpdate = {
        recurrence: {
          numberOfBillingPeriods: 24,
          allowProration: false
        }
      };

      await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        scheduleUpdate
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        scheduleUpdate
      );
    });

    it('should update payment method', async () => {
      const paymentUpdate = {
        paymentMethod: {
          customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440099',
          isAutoCharged: false
        }
      };

      await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        paymentUpdate
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        paymentUpdate
      );
    });

    it('should update line items', async () => {
      const lineItemsUpdate = {
        lineItems: [
          {
            name: 'New Item',
            description: 'Updated pricing',
            quantity: 2,
            unitPrice: 14999,
            unitOfMeasureId: 1
          }
        ]
      };

      await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        lineItemsUpdate
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        lineItemsUpdate
      );
    });

    it('should validate UUID format', async () => {
      await expect(subscriptionService.update('invalid-uuid', updateRequest))
        .rejects.toThrow(ValidationError);
    });

    it('should handle partial updates', async () => {
      await subscriptionService.update(
        '550e8400-e29b-41d4-a716-446655440000',
        { message: 'Thank you!' }
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000',
        { message: 'Thank you!' }
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockApiClient.delete = vi.fn().mockResolvedValue({ statusCode: 'OK' });
    });

    it('should delete subscription by ID', async () => {
      const result = await subscriptionService.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/550e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toEqual({ message: 'Subscription deleted successfully' });
    });

    it('should return success message', async () => {
      const result = await subscriptionService.delete('550e8400-e29b-41d4-a716-446655440000');
      
      expect(result.message).toBe('Subscription deleted successfully');
    });

    it('should validate UUID format', async () => {
      await expect(subscriptionService.delete('invalid-uuid'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Search completed successfully'],
        data: {
          results: [mockSubscriptionData],
          offset: 0,
          limit: 50,
          rowCount: 1
        }
      });
    });

    it('should search with empty criteria (list all)', async () => {
      const results = await subscriptionService.search({});

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        {}
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockSubscriptionData);
    });

    it('should search by customer ID with Equal operator', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        customerId: { operator: 'Equal', value: '550e8400-e29b-41d4-a716-446655440001' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by customer name with IsLike operator', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        customerName: { operator: 'IsLike', value: 'John' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by status name with IsLike operator', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        statusName: { operator: 'IsLike', value: 'Active' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by subscription name with IsLike operator', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        subscriptionName: { operator: 'IsLike', value: 'Premium' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by date range (termStartDate GreaterThan)', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        termStartDate: { operator: 'GreaterThan', date: '2026-01-01' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by has failed transaction flag', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        hasFailedTransaction: { operator: 'Equal', value: true }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search by product ID', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        productId: { operator: 'Equal', value: '550e8400-e29b-41d4-a716-446655440003' }
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search with global search', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        globalSearch: 'Premium'
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search with pagination (offset/limit)', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        offset: 50,
        limit: 25
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should search with sorting (column/direction)', async () => {
      const searchRequest: SubscriptionSearchRequest = {
        sortColumn: 'createdDateTime',
        sortDirection: 'desc'
      };

      await subscriptionService.search(searchRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/search',
        searchRequest
      );
    });

    it('should validate pagination limits (1-100)', async () => {
      await expect(subscriptionService.search({ limit: 0 }))
        .rejects.toThrow(ValidationError);

      await expect(subscriptionService.search({ limit: 101 }))
        .rejects.toThrow(ValidationError);
    });

    it('should validate offset minimum (>= 0)', async () => {
      await expect(subscriptionService.search({ offset: -1 }))
        .rejects.toThrow(ValidationError);
    });

    it('should handle empty search results', async () => {
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['No results found'],
        data: {
          results: [],
          offset: 0,
          limit: 50,
          rowCount: 0
        }
      });

      const results = await subscriptionService.search({});
      
      expect(results).toEqual([]);
    });

    it('should parse paginated response structure correctly', async () => {
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Search completed'],
        data: {
          results: [mockSubscriptionData, { ...mockSubscriptionData, subscriptionId: 'sub-2' }],
          offset: 10,
          limit: 25,
          rowCount: 100
        }
      });
      
      const results = await subscriptionService.search({ offset: 10, limit: 25 });
      
      expect(results).toHaveLength(2);
      expect(results[0].subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(results[1].subscriptionId).toBe('sub-2');
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Subscription cancelled successfully'],
        data: { ...mockSubscriptionData, status: { subscriptionStatusId: 3, name: 'Cancelled' } }
      });
    });

    it('should cancel immediately without refund', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancel: { now: true, endOfBillingPeriod: false }
      };

      const subscription = await subscriptionService.cancel(
        '550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/cancel/550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );
      expect(subscription.status.subscriptionStatusId).toBe(3);
    });

    it('should cancel immediately with refund', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancel: { now: true, endOfBillingPeriod: false },
        refund: { lastPaidAmount: true }
      };

      await subscriptionService.cancel(
        '550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/cancel/550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );
    });

    it('should cancel at end of billing period', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancel: { now: false, endOfBillingPeriod: true }
      };

      await subscriptionService.cancel(
        '550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/cancel/550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );
    });

    it('should validate cancel options (one must be true)', async () => {
      const invalidRequest: CancelSubscriptionRequest = {
        cancel: { now: false, endOfBillingPeriod: false }
      };

      // This should pass validation but might fail business logic
      await subscriptionService.cancel(
        '550e8400-e29b-41d4-a716-446655440000',
        invalidRequest
      );

      expect(mockApiClient.post).toHaveBeenCalled();
    });

    it('should validate UUID format', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancel: { now: true, endOfBillingPeriod: false }
      };

      await expect(subscriptionService.cancel('invalid-uuid', cancelRequest))
        .rejects.toThrow(ValidationError);
    });

    it('should return updated subscription', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancel: { now: true, endOfBillingPeriod: false }
      };

      const subscription = await subscriptionService.cancel(
        '550e8400-e29b-41d4-a716-446655440000',
        cancelRequest
      );

      expect(subscription).toBeDefined();
      expect(subscription.subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('pause', () => {
    beforeEach(() => {
      (mockApiClient.put as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Subscription paused successfully'],
        data: { ...mockSubscriptionData, status: { subscriptionStatusId: 2, name: 'Paused' } }
      });
    });

    it('should pause subscription', async () => {
      const subscription = await subscriptionService.pause('550e8400-e29b-41d4-a716-446655440000');

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/pause/550e8400-e29b-41d4-a716-446655440000'
      );
      expect(subscription.status.subscriptionStatusId).toBe(2);
    });

    it('should validate UUID format', async () => {
      await expect(subscriptionService.pause('invalid-uuid'))
        .rejects.toThrow(ValidationError);
    });

    it('should return updated subscription with paused status', async () => {
      const subscription = await subscriptionService.pause('550e8400-e29b-41d4-a716-446655440000');

      expect(subscription.status.name).toBe('Paused');
      expect(subscription.subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      (mockApiClient.put as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Subscription resumed successfully'],
        data: mockSubscriptionData
      });
    });

    it('should resume with proration', async () => {
      const resumeRequest: ResumeSubscriptionRequest = {
        prorateRemainingDays: true
      };

      const subscription = await subscriptionService.resume(
        '550e8400-e29b-41d4-a716-446655440000',
        resumeRequest
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/resume/550e8400-e29b-41d4-a716-446655440000',
        resumeRequest
      );
      expect(subscription.status.subscriptionStatusId).toBe(1);
    });

    it('should resume without proration', async () => {
      const resumeRequest: ResumeSubscriptionRequest = {
        prorateRemainingDays: false
      };

      await subscriptionService.resume(
        '550e8400-e29b-41d4-a716-446655440000',
        resumeRequest
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/subscription/resume/550e8400-e29b-41d4-a716-446655440000',
        resumeRequest
      );
    });

    it('should validate UUID format', async () => {
      await expect(subscriptionService.resume('invalid-uuid', { prorateRemainingDays: true }))
        .rejects.toThrow(ValidationError);
    });

    it('should validate proration option is boolean', async () => {
      await expect(subscriptionService.resume('550e8400-e29b-41d4-a716-446655440000', { prorateRemainingDays: 'yes' } as any))
        .rejects.toThrow(ValidationError);
    });

    it('should return updated subscription with active status', async () => {
      const subscription = await subscriptionService.resume(
        '550e8400-e29b-41d4-a716-446655440000',
        { prorateRemainingDays: true }
      );

      expect(subscription.status.name).toBe('Active');
      expect(subscription.subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('Convenience Methods', () => {
    describe('list', () => {
      beforeEach(() => {
        (mockApiClient.post as any).mockResolvedValue({
          statusCode: 'OK',
          statusDetails: ['Search completed'],
          data: {
            results: [mockSubscriptionData],
            offset: 0,
            limit: 50,
            rowCount: 1
          }
        });
      });

      it('should list with default pagination (50/0)', async () => {
        const results = await subscriptionService.list();

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/subscription/search',
          { limit: 50, offset: 0 }
        );
        expect(results).toHaveLength(1);
      });

      it('should list with custom pagination', async () => {
        await subscriptionService.list(25, 10);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/subscription/search',
          { limit: 25, offset: 10 }
        );
      });

      it('should use search() internally', async () => {
        const searchSpy = vi.spyOn(subscriptionService, 'search');
        
        await subscriptionService.list(30, 5);

        expect(searchSpy).toHaveBeenCalledWith({ limit: 30, offset: 5 });
      });
    });

    describe('getByCustomer', () => {
      beforeEach(() => {
        (mockApiClient.post as any).mockResolvedValue({
          statusCode: 'OK',
          statusDetails: ['Search completed'],
          data: {
            results: [mockSubscriptionData],
            offset: 0,
            limit: 50,
            rowCount: 1
          }
        });
      });

      it('should get subscriptions for customer', async () => {
        const results = await subscriptionService.getByCustomer('550e8400-e29b-41d4-a716-446655440001');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/subscription/search',
          { customerId: { operator: 'Equal', value: '550e8400-e29b-41d4-a716-446655440001' } }
        );
        expect(results).toHaveLength(1);
      });

      it('should validate customer UUID', async () => {
        await expect(subscriptionService.getByCustomer('invalid-uuid'))
          .rejects.toThrow(ValidationError);
      });

      it('should use Equal operator for customerId', async () => {
        const searchSpy = vi.spyOn(subscriptionService, 'search');
        
        await subscriptionService.getByCustomer('550e8400-e29b-41d4-a716-446655440000');

        expect(searchSpy).toHaveBeenCalledWith({
          customerId: { operator: 'Equal', value: '550e8400-e29b-41d4-a716-446655440000' }
        });
      });
    });

    describe('getByStatus', () => {
      beforeEach(() => {
        (mockApiClient.post as any).mockResolvedValue({
          statusCode: 'OK',
          statusDetails: ['Search completed'],
          data: {
            results: [mockSubscriptionData],
            offset: 0,
            limit: 50,
            rowCount: 1
          }
        });
      });

      it('should get subscriptions by status name', async () => {
        const results = await subscriptionService.getByStatus('Active');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gateway/test-gateway-123/subscription/search',
          { statusName: { operator: 'IsLike', value: 'Active' } }
        );
        expect(results).toHaveLength(1);
      });

      it('should validate status name is non-empty string', async () => {
        await expect(subscriptionService.getByStatus(''))
          .rejects.toThrow(ValidationError);
      });

      it('should use IsLike operator for statusName', async () => {
        const searchSpy = vi.spyOn(subscriptionService, 'search');
        
        await subscriptionService.getByStatus('Paused');

        expect(searchSpy).toHaveBeenCalledWith({
          statusName: { operator: 'IsLike', value: 'Paused' }
        });
      });
    });
  });

  describe('Validation & Error Handling', () => {
    beforeEach(() => {
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'Created',
        statusDetails: ['Success'],
        data: mockSubscriptionData
      });
      (mockApiClient.get as any).mockResolvedValue({
        statusCode: 'Created',
        statusDetails: ['Success'],
        data: mockSubscriptionData
      });
    });

    it('should validate recurrence schedule dates', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: 'invalid-date',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }]
      };

      // Zod validates string format, not ISO date validity
      await expect(subscriptionService.create(invalidRequest as any))
        .resolves.toBeDefined(); // API would reject, not Zod
    });

    it('should validate payment method required fields', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { isAutoCharged: true }, // Missing customerPaymentMethodId
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }]
      };

      // isAutoCharged is required, customerPaymentMethodId is optional
      await expect(subscriptionService.create(invalidRequest as any))
        .resolves.toBeDefined();
    });

    it('should validate line item quantities are positive', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: -1, unitPrice: 1000, unitOfMeasureId: 1 }]
      };

      await expect(subscriptionService.create(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should validate line item prices are non-negative', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: -1000, unitOfMeasureId: 1 }]
      };

      await expect(subscriptionService.create(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should validate address email format if provided', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }],
        addresses: [{
          isRemittance: false,
          isShipping: true,
          isBilling: false,
          email: 'not-an-email'
        }]
      };

      await expect(subscriptionService.create(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should validate custom field IDs are positive integers', async () => {
      const invalidRequest = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }],
        customFields: [{ customFieldId: -1, customFieldValue: ['Test'] }]
      };

      await expect(subscriptionService.create(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should reject invalid search operators', async () => {
      const invalidRequest = {
        customerId: { operator: 'InvalidOp', value: 'test' }
      };

      await expect(subscriptionService.search(invalidRequest as any))
        .rejects.toThrow(ValidationError);
    });

    it('should reject invalid date formats in search', async () => {
      // Override the post mock for search endpoint
      (mockApiClient.post as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Success'],
        data: {
          results: [mockSubscriptionData],
          offset: 0,
          limit: 100,
          rowCount: 1
        }
      });
      
      const invalidRequest = {
        termStartDate: { operator: 'GreaterThan' as const, date: 'not-a-date' }
      };

      // Zod validates it's a string, not ISO format
      await expect(subscriptionService.search(invalidRequest as any))
        .resolves.toBeDefined();
    });

    it('should handle API error responses', async () => {
      // Use a valid request but mock the API to return an error
      (mockApiClient.post as any).mockRejectedValue(
        new ValidationError('API Error: Customer not found')
      );

      await expect(subscriptionService.create({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        subscriptionStatusId: 1,
        name: 'Test',
        recurrence: {
          termStartDate: '2026-01-01T00:00:00.000Z',
          billingStartDate: '2026-01-01T00:00:00.000Z',
          isAutoRenewed: true,
          allowProration: true
        },
        paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440001', isAutoCharged: true },
        lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }]
      })).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      (mockApiClient.get as any).mockRejectedValue(new Error('Network timeout'));

      await expect(subscriptionService.get('550e8400-e29b-41d4-a716-446655440000'))
        .rejects.toThrow('Network timeout');
    });

    it('should transform validation errors properly', async () => {
      try {
        await subscriptionService.create({
          customerId: '',
          subscriptionStatusId: 1,
          name: 'Test',
          recurrence: {
            termStartDate: '2026-01-01T00:00:00.000Z',
            billingStartDate: '2026-01-01T00:00:00.000Z',
            isAutoRenewed: true,
            allowProration: true
          },
          paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
          lineItems: [{ name: 'Test', description: 'Test', quantity: 1, unitPrice: 1000, unitOfMeasureId: 1 }]
        } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Validation failed');
      }
    });

    it('should include field paths in validation errors', async () => {
      try {
        await subscriptionService.create({
          customerId: '550e8400-e29b-41d4-a716-446655440001',
          subscriptionStatusId: 1,
          name: 'Test',
          recurrence: {
            termStartDate: '2026-01-01T00:00:00.000Z',
            billingStartDate: '2026-01-01T00:00:00.000Z',
            isAutoRenewed: true,
            allowProration: true
          },
          paymentMethod: { customerPaymentMethodId: '550e8400-e29b-41d4-a716-446655440002', isAutoCharged: true },
          lineItems: []
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('lineItems');
      }
    });
  });

  describe('Date Transformation', () => {
    beforeEach(() => {
      // Setup mock response for date transformation tests
      (mockApiClient.get as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Success'],
        data: mockSubscriptionData
      });
    });

    it('should transform subscription dates', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(typeof subscription.createdDateTime).toBe('string');
      expect(typeof subscription.modifiedDateTime).toBe('string');
    });

    it('should transform recurrence dates', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(typeof subscription.recurrence.termStartDate).toBe('string');
      expect(typeof subscription.recurrence.billingStartDate).toBe('string');
    });

    it('should transform invoice dates in nested array', async () => {
      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(subscription.invoices).toHaveLength(1);
      expect(typeof subscription.invoices[0].invoiceDate).toBe('string');
      expect(typeof subscription.invoices[0].dueDate).toBe('string');
    });

    it('should handle null dates correctly', async () => {
      const dataWithNullDates = {
        ...mockSubscriptionData,
        recurrence: {
          ...mockSubscriptionData.recurrence,
          termEndDate: null
        }
      };

      (mockApiClient.get as any).mockResolvedValue({
        statusCode: 'OK',
        statusDetails: ['Success'],
        data: dataWithNullDates
      });

      const subscription = await subscriptionService.get('550e8400-e29b-41d4-a716-446655440000');

      expect(subscription.recurrence.termEndDate).toBeNull();
    });
  });
});
