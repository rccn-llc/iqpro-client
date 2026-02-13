/**
 * Customer entity types and interfaces for IQ Pro+ API
 * Based on official API documentation: https://api.basyspro.com/iqsaas/v1/scalar/#tag/customer
 */

/**
 * Customer address for create/update requests
 */
export interface CustomerAddressRequest {
  /** First address line (required) */
  addressLine1: string;
  
  /** Second address line (optional) */
  addressLine2?: string;
  
  /** City (required) */
  city: string;
  
  /** State or province (required) */
  state: string;
  
  /** Postal/ZIP code (required) */
  postalCode: string;
  
  /** Country (required) */
  country: string;
  
  /** First name for this address */
  firstName?: string;
  
  /** Last name for this address */
  lastName?: string;
  
  /** Email address for this address */
  email?: string;
  
  /** Phone number for this address */
  phone?: string;
  
  /** Fax number for this address */
  fax?: string;
  
  /** Company name for this address */
  company?: string;
  
  /** Is this a shipping address */
  isShipping?: boolean;
  
  /** Is this a billing address */
  isBilling?: boolean;
  
  /** Is this a physical address */
  isPhysical?: boolean;
}

/**
 * Customer address from API responses
 */
export interface CustomerAddress extends CustomerAddressRequest {
  /** Unique address identifier (API returns customerAddressId) */
  customerAddressId: string;
  
  /** Creation timestamp */
  createdDateTime: string;
  
  /** Last modification timestamp */
  modifiedDateTime: string;
}

/**
 * Custom field for customer
 */
export interface CustomerCustomField {
  /** Custom field ID */
  customFieldId: number;
  
  /** Custom field value(s) */
  customFieldValue: string[];
}

/**
 * Payment method card details
 */
export interface PaymentCard {
  /** Card number (for creation) */
  cardNumber?: string;
  
  /** Expiration month */
  expirationMonth?: number;
  
  /** Expiration year */
  expirationYear?: number;
  
  /** Security code */
  securityCode?: string;
  
  /** Cardholder name */
  cardHolderName?: string;
}

/**
 * Payment method ACH details
 */
export interface PaymentACH {
  /** Account number */
  accountNumber?: string;
  
  /** Routing number */
  routingNumber?: string;
  
  /** Account type */
  accountType?: 'checking' | 'savings';
  
  /** Account holder name */
  accountHolderName?: string;
}

/**
 * Payment method for create/update requests
 */
export interface PaymentMethodRequest {
  /** Card payment details */
  card?: PaymentCard;
  
  /** ACH payment details */
  ach?: PaymentACH;
  
  /** Is this the default payment method */
  isDefault?: boolean;
}

/**
 * API card details structure (from responses)
 */
export interface ApiCardDetails {
  cardId: string;
  maskedCard: string;
  token: string;
  cardType: string;
  expirationDate: string;
}

/**
 * API ACH details structure (from responses)
 */
export interface ApiAchDetails {
  achId: string;
  maskedAccount: string;
  token: string;
  accountType: string;
}

/**
 * Payment method from API responses (Customer-specific)
 */
export interface CustomerPaymentMethod {
  /** Unique payment method identifier (API returns customerPaymentId) */
  customerPaymentId: string;
  
  /** Payment method type */
  type: 'card' | 'ach';
  
  /** Creation timestamp */
  createdDateTime: string;
  
  /** Last modification timestamp */
  modifiedDateTime: string;
  
  /** Last 4 digits (for display) */
  last4?: string;
  
  /** Card brand (for cards) */
  cardBrand?: string;
  
  /** Is this the default payment method */
  isDefault?: boolean;
  
  /** API card details structure */
  card?: ApiCardDetails;
  
  /** API ACH details structure */
  ach?: ApiAchDetails;
}

/**
 * Subscription details
 */
export interface CustomerSubscription {
  /** Subscription ID */
  subscriptionId: string;
  
  /** Subscription status */
  status: string;
  
  /** Plan name */
  planName?: string;
  
  /** Creation timestamp */
  createdDateTime: string;
  
  /** Last modification timestamp */
  modifiedDateTime: string;
}

/**
 * Invoice details
 */
export interface CustomerInvoice {
  /** Invoice ID */
  invoiceId: string;
  
  /** Invoice status */
  status: string;
  
  /** Invoice amount */
  amount?: number;
  
  /** Creation timestamp */
  createdDateTime: string;
  
  /** Last modification timestamp */
  modifiedDateTime: string;
}

/**
 * Customer creation request (API compliant)
 */
export interface CreateCustomerRequest {
  /** Customer name (required) */
  name: string;
  
  /** Customer description (optional) */
  description?: string;
  
  /** Reference ID for external systems (optional) */
  referenceId?: string;
  
  /** Array of customer addresses (optional) */
  addresses?: CustomerAddressRequest[];
  
  /** Array of custom fields (optional) */
  customFields?: CustomerCustomField[];
  
  /** Payment method information (optional) */
  payment?: PaymentMethodRequest;
}

/**
 * Customer update request (API compliant)
 */
export interface UpdateCustomerRequest {
  /** Customer name (optional) */
  name?: string;
  
  /** Customer description (optional) */
  description?: string;
  
  /** Reference ID for external systems (optional) */
  referenceId?: string;
  
  /** Array of custom fields (optional) */
  customFields?: CustomerCustomField[];
}

/**
 * Search operator for field-based searches
 */
export interface SearchOperator {
  /** Operator type */
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  /** Search value */
  value: string;
}

/**
 * Customer search request (API compliant - operator-based)
 */
export interface SearchCustomerRequest {
  /** Global search across all fields */
  globalSearch?: string;
  
  /** Customer ID search with operator */
  customerId?: SearchOperator;
  
  /** Reference ID search with operator */
  referenceId?: SearchOperator;
  
  /** Name search with operator */
  name?: SearchOperator;
  
  /** Description search with operator */
  description?: SearchOperator;
  
  /** Offset for pagination (default: 0) */
  offset?: number;
  
  /** Number of items per page (default: 25, max: 100) */
  limit?: number;
  
  /** Sort field */
  sortBy?: 'createdDateTime' | 'modifiedDateTime' | 'name';
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Complete customer entity (API response)
 */
export interface Customer {
  /** Unique customer identifier */
  customerId: string;
  
  /** Customer name */
  name: string | null;
  
  /** Customer description */
  description: string | null;
  
  /** Reference ID for external systems */
  referenceId: string | null;
  
  /** Source reference ID (API field) */
  sourceReferenceId: string | null;
  
  /** Customer creation timestamp */
  createdDateTime: string;
  
  /** Customer last update timestamp */
  modifiedDateTime: string;
  
  /** Whether customer has card payment methods */
  hasCard: boolean;
  
  /** Whether customer has ACH payment methods */
  hasAch: boolean;
  
  /** Customer payable token */
  customerPayableToken: string | null;
  
  /** Array of customer addresses */
  addresses: CustomerAddress[];
  
  /** Array of customer payment methods */
  paymentMethods: CustomerPaymentMethod[];
  
  /** Array of customer subscriptions */
  subscriptions: CustomerSubscription[];
  
  /** Array of customer invoices */
  invoices: CustomerInvoice[];
  
  /** Array of custom field entries (API uses customFieldEntries) */
  customFieldEntries: CustomerCustomField[];
}

/**
 * API response wrapper
 */
export interface CustomerApiResponse {
  /** Response status code */
  statusCode: string;
  
  /** Response status details */
  statusDetails: string[];
  
  /** Response data */
  data: Customer;
}

/**
 * Customer search response (API format)
 */
export interface CustomerSearchResponse {
  /** Response status code */
  statusCode: string;
  
  /** Response status details */
  statusDetails: string[];
  
  /** Response data */
  data: {
    /** Array of customers */
    customers: Customer[];
    
    /** Pagination information (API format) */
    pagination?: {
      /** Current offset */
      offset: number;
      
      /** Items per page */
      limit: number;
      
      /** Total number of records */
      rowCount: number;
    };
  };
}

/**
 * JSON Patch operation for API updates
 */
export interface JsonPatchOperation {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  /** JSON path to the field */
  path: string;
  /** New value for the field */
  value?: any;
  /** Source path for move/copy operations */
  from?: string;
}

/**
 * Address creation request
 */
export interface CreateAddressRequest extends CustomerAddressRequest {}

/**
 * Address update request (converted to JSON Patch internally)
 */
export interface UpdateAddressRequest extends Partial<CustomerAddressRequest> {}

/**
 * Payment method creation request (Customer-specific)
 */
export interface CreateCustomerPaymentMethodRequest extends PaymentMethodRequest {}

/**
 * Payment method update request (converted to JSON Patch internally)
 */
export interface UpdateCustomerPaymentMethodRequest extends Partial<PaymentMethodRequest> {}

/**
 * Payable token response
 */
export interface PayableTokenResponse {
  /** Response status code */
  statusCode: string;
  
  /** Response status details */
  statusDetails: string[];
  
  /** Response data */
  data: {
    /** Generated token */
    token: string;
    
    /** Token expiration */
    expiresAt: string;
  };
}