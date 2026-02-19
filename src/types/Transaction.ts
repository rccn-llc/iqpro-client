/**
 * Transaction entity types and interfaces for IQ Pro+ API
 * 
 * Based on official iQ Pro+ API documentation:
 * https://api.basyspro.com/iqsaas/v1/scalar/#tag/transaction
 * 
 * ⚠️ IMPORTANT: As of February 2026, the transaction/payment endpoints are not yet
 * available in the IQ Pro+ sandbox environment. These types are production-ready
 * and will be functional once the API endpoints are deployed.
 */

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized', 
  CAPTURED = 'captured',
  SETTLED = 'settled',
  VOIDED = 'voided',
  FAILED = 'failed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

/**
 * Transaction type enumeration
 * Note: API expects numeric values matching C# enum
 */
export enum TransactionType {
  SALE = 0,
  AUTHORIZATION = 1,
  CAPTURE = 2,
  VOID = 3,
  REFUND = 4,
  CREDIT = 5
}

/**
 * Search filter operators for transactions
 */
export type TransactionSearchOperator = 'Equal' | 'NotEqual' | 'In' | 'NotIn' | 'GreaterThan' | 'LessThan' | 'GreaterThanOrEqual' | 'LessThanOrEqual' | 'Contains' | 'StartsWith' | 'EndsWith';

/**
 * Search filter for GUID/UUID fields
 */
export interface SearchFilterGuid {
  operator: 'Equal' | 'NotEqual' | 'In' | 'NotIn';
  value: string | string[];
}

/**
 * Search filter for enum fields
 */
export interface SearchFilterEnum {
  operator: 'Equal' | 'NotEqual' | 'In' | 'NotIn';
  value: string | string[];
}

/**
 * Search filter for numeric fields
 */
export interface SearchFilterNumber {
  operator: 'Equal' | 'NotEqual' | 'GreaterThan' | 'LessThan' | 'GreaterThanOrEqual' | 'LessThanOrEqual' | 'In' | 'NotIn';
  value: number | number[];
}

/**
 * Search filter for date fields
 */
export interface SearchFilterDate {
  operator: 'Equal' | 'NotEqual' | 'GreaterThan' | 'LessThan' | 'GreaterThanOrEqual' | 'LessThanOrEqual';
  value: string; // ISO 8601 date string
}

/**
 * Remit information (billing totals)
 */
export interface Remit {
  /** Total amount in cents */
  totalAmount: number;
  
  /** Tax amount in cents */
  taxAmount?: number;
  
  /** Tip amount in cents */
  tipAmount?: number;
  
  /** Discount amount in cents */
  discountAmount?: number;
  
  /** Shipping amount in cents */
  shippingAmount?: number;
}

/**
 * Payment method type enumeration
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card', 
  ACH = 'ach',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHECK = 'check'
}

/**
 * Card brand enumeration
 */
export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMERICAN_EXPRESS = 'american_express',
  DISCOVER = 'discover',
  DINERS_CLUB = 'diners_club',
  JCB = 'jcb',
  UNIONPAY = 'unionpay',
  MAESTRO = 'maestro'
}

/**
 * Payment method information (embedded in transaction)
 */
export interface PaymentMethod {
  /** Payment method type */
  type: PaymentMethodType;
  
  /** Card information (for card payments) */
  card?: {
    /** Last 4 digits of card */
    last4: string;
    
    /** Card brand */
    brand: CardBrand;
    
    /** Expiration month */
    expMonth: number;
    
    /** Expiration year */
    expYear: number;
    
    /** Cardholder name */
    name?: string;
    
    /** Funding type (credit/debit) */
    funding?: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  
  /** Bank account information (for ACH payments) */
  bankAccount?: {
    /** Last 4 digits of account */
    last4: string;
    
    /** Account type */
    accountType: 'checking' | 'savings' | 'business_checking';
    
    /** Bank name */
    bankName?: string;
    
    /** Routing number (masked) */
    routingNumber?: string;
  };
  
  /** Digital wallet information */
  wallet?: {
    /** Wallet type */
    type: 'apple_pay' | 'google_pay' | 'samsung_pay' | 'paypal';
    
    /** Wallet account identifier */
    accountId?: string;
  };
}

/**
 * Fraud detection result
 */
export interface FraudResult {
  /** Overall risk score (0-100) */
  riskScore: number;
  
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high';
  
  /** Fraud decision */
  decision: 'approve' | 'review' | 'decline';
  
  /** Fraud rules triggered */
  triggeredRules?: string[];
  
  /** Fraud provider response */
  providerResponse?: Record<string, any>;
}

/**
 * Transaction receipt information
 */
export interface TransactionReceipt {
  /** Receipt number */
  number: string;
  
  /** Receipt URL */
  url?: string;
  
  /** Email address receipt was sent to */
  emailSent?: string;
  
  /** SMS number receipt was sent to */
  smsSent?: string;
}

/**
 * Transaction entity (main resource)
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;
  
  /** Transaction amount in cents */
  amount: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Transaction type */
  type: TransactionType;
  
  /** Transaction status */
  status: TransactionStatus;
  
  /** Customer ID */
  customerId: string;
  
  /** Payment method details (embedded) */
  paymentMethod: PaymentMethod;
  
  /** Transaction description */
  description?: string;
  
  /** Order ID or reference */
  orderId?: string;
  
  /** Invoice ID or reference */
  invoiceId?: string;
  
  /** Gateway ID that processed the transaction */
  gatewayId: string;
  
  /** Gateway-specific transaction ID */
  gatewayTransactionId?: string;
  
  /** Authorization code from processor */
  authorizationCode?: string;
  
  /** Processor response code */
  processorResponseCode?: string;
  
  /** Processor response message */
  processorResponseMessage?: string;
  
  /** AVS (Address Verification System) result */
  avsResult?: string;
  
  /** CVV verification result */
  cvvResult?: string;
  
  /** Fraud detection results */
  fraudResult?: FraudResult;
  
  /** Original transaction ID (for captures, voids, refunds) */
  originalTransactionId?: string;
  
  /** Settlement batch ID */
  settlementBatchId?: string;
  
  /** Receipt information */
  receipt?: TransactionReceipt;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Transaction creation timestamp */
  createdAt: Date;
  
  /** Transaction last update timestamp */
  updatedAt: Date;
  
  /** Transaction authorization timestamp */
  authorizedAt?: Date;
  
  /** Transaction capture timestamp */
  capturedAt?: Date;
  
  /** Transaction settlement timestamp */
  settledAt?: Date;
  
  /** Transaction void timestamp */
  voidedAt?: Date;
}

/**
 * Request to create a new transaction
 * Note: API expects this wrapped in insertTransaction object
 */
export interface CreateTransactionRequest {
  /** Transaction amount in cents */
  amount: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Transaction type (defaults to SALE = 0) */
  type?: TransactionType;
  
  /** Customer ID */
  customerId: string;
  
  /** Remit information (billing totals) - REQUIRED by API */
  Remit: Remit;
  
  /**
   * Payment method details
   * 
   * ✅ RECOMMENDED: Reference a saved customer payment method
   * Use the customer reference approach for production (PCI compliant):
   * ```typescript
   * paymentMethod: {
   *   customer: {
   *     customerId: 'cust-123',
   *     customerPaymentMethodId: 'pm-456' // optional - uses default if omitted
   *   }
   * }
   * ```
   * 
   * ⚠️ TESTING ONLY: Inline payment data (may not work in all environments)
   * Some sandbox environments may accept inline payment data:
   * ```typescript
   * paymentMethod: {
   *   type: PaymentMethodType.CREDIT_CARD,
   *   card: { number: '4242...', expMonth: 12, expYear: 2025, cvv: '123' }
   * }
   * ```
   * 
   * Production applications MUST:
   * 1. Tokenize payment data via TokenizationService
   * 2. Save to customer via CustomerService.createPaymentMethod()
   * 3. Reference saved payment method in transactions
   */
  paymentMethod?: {
    /**
     * ✅ RECOMMENDED: Reference to customer's saved payment method
     * API will use the specified payment method, or customer's default if omitted
     */
    customer?: {
      /** Customer ID (required) */
      customerId: string;
      
      /** Specific payment method ID (optional - uses default if not specified) */
      customerPaymentMethodId?: string;
      
      /** Billing address ID (optional) */
      customerBillingAddressId?: string;
      
      /** Shipping address ID (optional) */
      customerShippingAddressId?: string;
    };
    
    /**
     * ⚠️ TESTING ONLY: Payment method type (for inline payment data)
     * Only used with inline card/bankAccount/walletToken data
     */
    type?: PaymentMethodType;
    
    /**
     * ⚠️ TESTING ONLY: Card information (inline, may not work in production)
     * Prefer saving to customer via createPaymentMethod() first
     */
    card?: {
      /** Card number (will be transformed to API format) */
      number: string;
      
      /** Expiration month (1-12) */
      expMonth: number;
      
      /** Expiration year */
      expYear: number;
      
      /** CVV code */
      cvv: string;
      
      /** Cardholder name */
      name?: string;
    };
    
    /**
     * ⚠️ TESTING ONLY: Bank account information (inline, may not work in production)
     * Prefer saving to customer via createPaymentMethod() first
     */
    bankAccount?: {
      /** Account number */
      accountNumber: string;
      
      /** Routing number */
      routingNumber: string;
      
      /** Account type */
      accountType: 'checking' | 'savings' | 'business_checking';
      
      /** Account holder name */
      accountHolderName: string;
    };
    
    /**
     * ⚠️ TESTING ONLY: Digital wallet token (inline, may not work in production)
     * Prefer saving to customer via createPaymentMethod() first
     */
    walletToken?: string;
  };
  
  /** Transaction description */
  description?: string;
  
  /** Order ID or reference */
  orderId?: string;
  
  /** Invoice ID or reference */
  invoiceId?: string;
  
  /** Gateway ID to process transaction */
  gatewayId?: string;
  
  /** Whether to capture immediately (default: true) */
  capture?: boolean;
  
  /** Billing address */
  billingAddress?: {
    /** First name */
    firstName?: string;
    
    /** Last name */
    lastName?: string;
    
    /** Company name */
    company?: string;
    
    /** Email address */
    email?: string;
    
    /** Phone number */
    phone?: string;
    
    /** Street address line 1 */
    line1: string;
    
    /** Street address line 2 */
    line2?: string;
    
    /** City */
    city: string;
    
    /** State/province */
    state: string;
    
    /** Postal code */
    postalCode: string;
    
    /** Country code (ISO 3166-1 alpha-2) */
    country: string;
  };
  
  /** Shipping address */
  shippingAddress?: {
    /** First name */
    firstName?: string;
    
    /** Last name */
    lastName?: string;
    
    /** Company name */
    company?: string;
    
    /** Email address */
    email?: string;
    
    /** Phone number */
    phone?: string;
    
    /** Street address line 1 */
    line1: string;
    
    /** Street address line 2 */
    line2?: string;
    
    /** City */
    city: string;
    
    /** State/province */
    state: string;
    
    /** Postal code */
    postalCode: string;
    
    /** Country code (ISO 3166-1 alpha-2) */
    country: string;
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Enable fraud detection */
  fraudDetection?: boolean;
  
  /** Webhook URLs for transaction updates */
  webhooks?: string[];
}

/**
 * Request to capture an authorized transaction
 */
export interface CaptureTransactionRequest {
  /** Amount to capture (defaults to full authorized amount) */
  amount?: number;
  
  /** Description for the capture */
  description?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Request to void a transaction
 */
export interface VoidTransactionRequest {
  /** Reason for voiding */
  reason?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Request to refund a transaction
 */
export interface RefundTransactionRequest {
  /** Amount to refund in cents (defaults to full amount) */
  amount?: number;
  
  /** Reason for refund */
  reason?: string;
  
  /** Refund description */
  description?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Request to increment authorization amount
 */
export interface IncrementAuthorizationRequest {
  /** Additional amount to authorize in cents */
  amount: number;
  
  /** Description for the increment */
  description?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Transaction search parameters (consumer-facing)
 * Note: These will be transformed to API format with filter objects
 */
export interface TransactionSearchParams {
  /** Customer ID */
  customerId?: string;
  
  /** Transaction status filter */
  status?: TransactionStatus | TransactionStatus[];
  
  /** Transaction type filter */
  type?: TransactionType | TransactionType[];
  
  /** Payment method type filter */
  paymentMethodType?: PaymentMethodType | PaymentMethodType[];
  
  /** Gateway ID filter */
  gatewayId?: string;
  
  /** Order ID filter */
  orderId?: string;
  
  /** Invoice ID filter */
  invoiceId?: string;
  
  /** Amount range filter */
  amountRange?: {
    /** Minimum amount in cents */
    min?: number;
    
    /** Maximum amount in cents */
    max?: number;
  };
  
  /** Date range filter */
  dateRange?: {
    /** Start date (ISO 8601) */
    startDate?: string;
    
    /** End date (ISO 8601) */
    endDate?: string;
  };
  
  /** Created date range filter */
  createdRange?: {
    /** Start date (ISO 8601) */
    startDate?: string;
    
    /** End date (ISO 8601) */
    endDate?: string;
  };
  
  /** Search in description and metadata */
  search?: string;
  
  /** Page number for pagination */
  page?: number;
  
  /** Number of results per page (max 100) */
  limit?: number;
  
  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Transaction search request (API format with filter objects)
 * Note: API expects this structure wrapped in transactionSearchRequest
 */
export interface TransactionSearchRequest {
  /** Customer ID filter */
  customerId?: SearchFilterGuid;
  
  /** Transaction status filter (single value) */
  status?: SearchFilterEnum;
  
  /** Transaction statuses filter (multiple values) - API format */
  transactionStatuses?: {
    operator: 'Contains';
    values: string[];
  };
  
  /** Transaction type filter (single value) */
  type?: SearchFilterEnum;
  
  /** Transaction types filter (multiple values) - API format */
  transactionTypes?: {
    operator: 'Contains';
    values: string[];
  };
  
  /** Payment method type filter (single value) - API uses 'paymentMethod' field */
  paymentMethod?: SearchFilterEnum;
  
  /** Payment method types filter (multiple values) - API format */
  paymentMethodTypes?: {
    operator: 'Contains';
    values: string[];
  };
  
  /** Legacy: Payment method type filter */
  paymentMethodType?: SearchFilterEnum;
  
  /** Gateway ID filter */
  gatewayId?: SearchFilterGuid;
  
  /** Order ID filter */
  orderId?: SearchFilterGuid;
  
  /** Invoice ID filter */
  invoiceId?: SearchFilterGuid;
  
  /** Amount filter (API format with Between operator) */
  amount?: {
    operator: 'Between' | 'IsGreaterOrEqual' | 'IsLessThanOrEqual';
    minValue?: number | undefined;
    maxValue?: number | undefined;
    value?: number | undefined;
  };
  
  /** Legacy: Minimum amount filter */
  amountMin?: SearchFilterNumber;
  
  /** Legacy: Maximum amount filter */
  amountMax?: SearchFilterNumber;
  
  /** createdDateTime filter (API format with Between operator) */
  createdDateTime?: {
    operator: 'Between';
    startDate: string | null;
    endDate: string | null;
  };
  
  /** Legacy: Start date filter */
  startDate?: SearchFilterDate;
  
  /** Legacy: End date filter */
  endDate?: SearchFilterDate;
  
  /** Legacy: Created start date filter */
  createdStartDate?: SearchFilterDate;
  
  /** Legacy: Created end date filter */
  createdEndDate?: SearchFilterDate;
  
  /** Search query */
  search?: string;
  
  /** Page number for pagination */
  page?: number;
  
  /** Number of results per page (max 100) */
  limit?: number;
  
  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Transaction list response
 */
export interface TransactionListResponse {
  /** Array of transactions */
  data: Transaction[];
  
  /** Pagination information */
  pagination: {
    /** Current page number */
    page: number;
    
    /** Results per page */
    limit: number;
    
    /** Total number of transactions */
    total: number;
    
    /** Total number of pages */
    totalPages: number;
    
    /** Whether there is a next page */
    hasNextPage: boolean;
    
    /** Whether there is a previous page */
    hasPreviousPage: boolean;
  };
}