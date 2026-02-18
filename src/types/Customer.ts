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
 * ⚠️ DEPRECATED: Raw card data (PCI DSS non-compliant for production)
 * 
 * @deprecated Use TokenizedCardData instead. Raw card numbers must be tokenized
 * via iQ Pro+ iframe before being sent to the API (PCI DSS Level 1 requirement).
 * 
 * This interface is maintained for backwards compatibility and testing only.
 * Do NOT use in production without proper tokenization.
 */
export interface PaymentCard {
  /**
   * Raw card number (MUST be tokenized first in production)
   * @deprecated Use tokenizedCard.cardToken instead
   */
  cardNumber?: string;
  
  /** Expiration month (1-12) */
  expirationMonth?: number;
  
  /** Expiration year (4 digits, e.g., 2025) */
  expirationYear?: number;
  
  /**
   * Card security code (CVV/CVC)
   * @deprecated Must be tokenized, never stored or transmitted
   */
  securityCode?: string;
  
  /** Cardholder name */
  cardHolderName?: string;
}

/**
 * ⚠️ DEPRECATED: Raw ACH data (PCI DSS non-compliant for production)
 * 
 * @deprecated Use TokenizedAchData instead. Raw account numbers must be tokenized
 * via iQ Pro+ iframe before being sent to the API (PCI DSS Level 1 requirement).
 * 
 * This interface is maintained for backwards compatibility and testing only.
 * Do NOT use in production without proper tokenization.
 */
export interface PaymentACH {
  /**
   * Raw account number (MUST be tokenized first in production)
   * @deprecated Use tokenizedAch.achToken instead
   */
  accountNumber?: string;
  
  /** Bank routing number (9 digits) */
  routingNumber?: string;
  
  /** Account type */
  accountType?: 'checking' | 'savings';
  
  /** Account holder name */
  accountHolderName?: string;
}

/**
 * ✅ RECOMMENDED: Tokenized card data (PCI compliant)
 * 
 * Card data must be tokenized using the iQ Pro+ hosted iframe before creating
 * a payment method. This approach reduces PCI compliance scope and protects
 * sensitive card data.
 * 
 * @see TokenizationConfiguration for iframe setup
 */
export interface TokenizedCardData {
  /**
   * Tokenized card number from iQ Pro+ iframe
   * Format: string (max 50 characters)
   * Example: "tok_1A2B3C4D5E6F7G8H"
   */
  cardToken: string;
  
  /** Cardholder name */
  cardHolderName?: string;
  
  /** Card expiration month (1-12) */
  expirationMonth?: number;
  
  /** Card expiration year (4 digits, e.g., 2025) */
  expirationYear?: number;
  
  /**
   * Masked card number for display (optional)
   * Format: ^\d{6,8}\*{4,9}\d{4}$ (e.g., "424242******4242")
   * If not provided, will be generated from token
   */
  maskedNumber?: string;
  
  /**
   * Card type/brand (optional)
   * If not provided, will be auto-detected by API
   */
  cardType?: 'Visa' | 'MasterCard' | 'Discover' | 'AmericanExpress' | 'Diners' | 'JCB' | 'UnionPay';
}

/**
 * ✅ RECOMMENDED: Tokenized ACH data (PCI compliant)
 * 
 * ACH account data must be tokenized using the iQ Pro+ hosted iframe before
 * creating a payment method. This approach reduces PCI compliance scope and
 * protects sensitive account information.
 * 
 * @see TokenizationConfiguration for iframe setup
 */
export interface TokenizedAchData {
  /**
   * Tokenized account number from iQ Pro+ iframe
   * Format: string (max 50 characters)
   * Example: "tok_ach_9Z8Y7X6W5V4U3T"
   */
  achToken: string;
  
  /** Account holder name */
  accountHolderName?: string;
  
  /** Account type */
  accountType?: 'checking' | 'savings';
  
  /**
   * SEC code for ACH transactions
   * - PPD: Prearranged Payment and Deposit (consumer)
   * - CCD: Corporate Credit or Debit
   * - WEB: Internet-initiated/Mobile entries
   * - TEL: Telephone-initiated entries
   */
  secCode?: 'PPD' | 'CCD' | 'WEB' | 'TEL';
  
  /**
   * Bank routing number (9 digits)
   * Optional when using token, but useful for validation
   */
  routingNumber?: string;
  
  /**
   * Masked account number for display (optional)
   * Format: typically "****1234"
   */
  maskedAccount?: string;
}

/**
 * Payment method for create/update requests
 * 
 * ✅ RECOMMENDED: Use tokenizedCard or tokenizedAch for production
 * ⚠️  DEPRECATED: card and ach fields require tokenization in production
 * 
 * The iQ Pro+ API requires PCI DSS Level 1 compliance. Raw card and ACH data
 * must be tokenized via the hosted iframe before being sent to the API.
 * 
 * @example Recommended tokenized approach
 * ```typescript
 * const paymentMethod = {
 *   tokenizedCard: {
 *     cardToken: 'tok_from_iframe',
 *     cardHolderName: 'John Doe',
 *     expirationMonth: 12,
 *     expirationYear: 2025
 *   },
 *   isDefault: true
 * };
 * ```
 * 
 * @example Legacy raw data (testing only)
 * ```typescript
 * const paymentMethod = {
 *   card: {
 *     cardNumber: '4111111111111111',  // ⚠️ Must be tokenized!
 *     expirationMonth: 12,
 *     expirationYear: 2025,
 *     cardHolderName: 'John Doe'
 *   },
 *   isDefault: true
 * };
 * ```
 */
export interface PaymentMethodRequest {
  /**
   * ✅ RECOMMENDED: Tokenized card data (PCI compliant)
   * Use this for production implementations
   */
  tokenizedCard?: TokenizedCardData;
  
  /**
   * ✅ RECOMMENDED: Tokenized ACH data (PCI compliant)
   * Use this for production implementations
   */
  tokenizedAch?: TokenizedAchData;
  
  /**
   * ⚠️ DEPRECATED: Raw card data (requires tokenization)
   * This field is maintained for backwards compatibility.
   * In production, use tokenizedCard instead.
   */
  card?: PaymentCard;
  
  /**
   * ⚠️ DEPRECATED: Raw ACH data (requires tokenization)
   * This field is maintained for backwards compatibility.
   * In production, use tokenizedAch instead.
   */
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
 * 
 * Note: The API returns payment methods with either a 'card' or 'ach' object.
 * The type is determined by which object is present, not by a separate 'type' field.
 */
export interface CustomerPaymentMethod {
  /** 
   * Unique payment method identifier
   * API returns: paymentMethodId (not customerPaymentId)
   */
  paymentMethodId?: string;
  
  /** 
   * Legacy field name (some endpoints may use this)
   * @deprecated Use paymentMethodId instead
   */
  customerPaymentId?: string;
  
  /** 
   * Payment method type (may not be present in API response)
   * Type is typically inferred from presence of card or ach object
   */
  type?: 'card' | 'ach';
  
  /** Creation timestamp */
  createdDateTime?: string;
  
  /** Last modification timestamp */
  modifiedDateTime?: string;
  
  /** Last 4 digits (for display) - computed from maskedCard or maskedAccount */
  last4?: string;
  
  /** Card brand (for cards) - computed from card.cardType */
  cardBrand?: string;
  
  /** Is this the default payment method */
  isDefault?: boolean;
  
  /** API card details structure (present when this is a card payment method) */
  card?: ApiCardDetails;
  
  /** API ACH details structure (present when this is an ACH payment method) */
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
  
  /** Response data  */
  data: {
    /** Generated token */
    token: string;
    
    /** Token expiration */
    expiresAt: string;
  };
}

// ============================================================================
// Tokenization Configuration Types
// ============================================================================

/**
 * iQ Pro+ TokenEx iframe configuration
 * Used to initialize the hosted payment form for secure card tokenization
 */
export interface TokenExIframeConfiguration {
  /** Origin URL for iframe communication */
  origin: string;
  
  /** Timestamp of configuration generation */
  timestamp: string;
  
  /** Tokenization ID for this gateway */
  tokenizationId: string;
  
  /** Token scheme identifier */
  tokenScheme: string;
  
  /** Authentication key for iframe */
  authenticationKey: string;
  
  /** Whether PCI validation is enabled */
  pci: boolean;
  
  /** Configuration expiration timestamp */
  expires: string;
}

/**
 * Iframe configuration wrapper
 * Contains version-specific iframe configurations
 */
export interface IframeConfiguration {
  /** Legacy iQ Pro iframe config (deprecated) */
  iqPro?: {
    publicKey: string;
  };
  
  /** Current iQ Pro V2 iframe config (TokenEx) */
  iqProV2?: TokenExIframeConfiguration;
}

/**
 * ACH tokenization configuration (vault-based)
 */
export interface AchConfiguration {
  /** iQ Pro V2 ACH vault configuration */
  iqProV2?: {
    /** ACH vault URL */
    achUrl: string;
  };
}

/**
 * Mobile SDK configuration (for mobile app tokenization)
 */
export interface MobileConfiguration {
  /** iQ Pro V2 mobile configuration */
  iqProV2?: {
    /** Token exchange authentication key */
    authKey: string;
    
    /** Token exchange API key */
    apiKey: string;
  };
}

/**
 * Proxy configuration for direct API tokenization
 */
export interface ProxyConfiguration {
  /** TokenEx proxy configuration */
  tokenEx?: {
    /** Tokenization ID */
    tokenizationId: string;
    
    /** Array of proxy profiles */
    profiles: Array<{
      /** Profile name */
      profileName: string;
      
      /** Proxy URL */
      url: string;
      
      /** Profile authentication key */
      profileKey: string;
    }>;
  };
}

/**
 * Complete tokenization configuration from API
 * GET /api/gateway/{gatewayId}/tokenization
 */
export interface TokenizationConfiguration {
  /** Card tokenizer type (e.g., "TokenEx") */
  cardTokenizer: string | null;
  
  /** ACH tokenizer type */
  achTokenizer: string | null;
  
  /** Hosted iframe configuration (recommended for web) */
  iframeConfiguration?: IframeConfiguration;
  
  /** Proxy configuration (for server-to-server) */
  proxyConfiguration?: ProxyConfiguration;
  
  /** ACH-specific configuration */
  achConfiguration?: AchConfiguration;
  
  /** Mobile SDK configuration */
  mobileConfiguration?: MobileConfiguration;
}

/**
 * Tokenization configuration API response
 */
export interface TokenizationConfigurationResponse {
  /** Response status code */
  statusCode: string;
  
  /** Response status details */
  statusDetails: string[];
  
  /** Tokenization configuration data */
  data: TokenizationConfiguration;
}