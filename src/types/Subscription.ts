/**
 * Subscription entity types and interfaces for IQ Pro+ API
 * 
 * Based on official API documentation:
 * https://api.basyspro.com/iqsaas/v1/scalar/#tag/subscription
 * 
 * The iQ Pro+ Subscription API uses an invoice-based model with:
 * - Complex recurrence scheduling (cron-like)
 * - Line items (products/services) instead of plans
 * - Multiple typed addresses (billing, shipping, remittance)
 * - Operator-based search patterns
 */

/**
 * Subscription status enumeration
 */
export enum SubscriptionStatus {
  ACTIVE = 1,
  PAUSED = 2,
  CANCELLED = 3,
  EXPIRED = 4,
  TRIAL = 5,
  PENDING = 6
}

/**
 * Unit of measure for billing periods
 */
export enum BillingUnitOfMeasure {
  DAY = 1,
  WEEK = 2,
  MONTH = 3,
  YEAR = 4
}

/**
 * Account type for ACH payments
 */
export enum ACHAccountType {
  CHECKING = 'Checking',
  SAVINGS = 'Savings'
}

/**
 * Search operator types
 */
export type SubscriptionSearchOperator = 'Equal' | 'IsLike' | 'GreaterThan' | 'LessThan';

/**
 * Recurrence schedule configuration
 * Complex cron-like scheduling for billing
 */
export interface RecurrenceSchedule {
  /** UUID linking to existing schedule (optional) */
  scheduleId?: string;
  
  /** Custom schedule definition (if not using scheduleId) */
  schedule?: {
    /** Minutes (0-59) */
    minutes?: number[];
    /** Hours (0-23) */
    hours?: number[];
    /** Days of month (1-31) */
    daysOfMonth?: number[];
    /** Days of week (0-6, Sunday=0) */
    daysOfWeek?: number[];
    /** Weeks of month (1-5) */
    weeksOfMonth?: number[];
    /** Weeks of year (1-52) */
    weeksOfYear?: number[];
    /** Months of year (1-12) */
    monthsOfYear?: number[];
  };
  
  /** Reference to billing period configuration */
  billingPeriodId?: number;
  
  /** Number of billing periods (null = infinite) */
  numberOfBillingPeriods?: number | null;
  
  /** Trial period length in days */
  trialLengthInDays?: number;
  
  /** Invoice payment window in days */
  invoiceLengthInDays?: number;
  
  /** Auto-renewal flag */
  isAutoRenewed: boolean;
  
  /** Term start date (ISO 8601) */
  termStartDate: string;
  
  /** Term end date (ISO 8601, null = no end) */
  termEndDate?: string | null;
  
  /** Billing start date (ISO 8601) */
  billingStartDate: string;
  
  /** Allow proration on changes */
  allowProration: boolean;
}

/**
 * Recurrence schedule in response (includes additional fields)
 */
export interface RecurrenceScheduleResponse extends RecurrenceSchedule {
  subscriptionScheduleId: string;
  billingPeriod: {
    billingPeriodId: number;
    name: string | null;
    length: number;
    unitOfMeasure: {
      unitOfMeasureId: number;
      name: string | null;
    };
  };
  schedule: {
    name: string | null;
    minutes: number[];
    hours: number[];
    daysOfMonth: number[];
    daysOfWeek: number[];
    weeksOfMonth: number[];
    weeksOfYear: number[];
    monthsOfYear: number[];
  };
  invoicesRemaining: number;
}

/**
 * Payment method configuration for subscription
 */
export interface SubscriptionPaymentMethod {
  /** UUID of existing customer payment method */
  customerPaymentMethodId?: string;
  
  /** Card processor ID (UUID) */
  cardProcessorId?: string | null;
  
  /** ACH processor ID (UUID) */
  achProcessorId?: string | null;
  
  /** Auto-charge flag */
  isAutoCharged: boolean;
}

/**
 * Payment method details in response
 */
export interface PaymentMethodDetails {
  paymentMethodId: string;
  
  /** ACH account details */
  ach?: {
    achId: string;
    maskedAccount: string | null;
    accountType: ACHAccountType;
    secCode: string;
    token: string | null;
    routingNumber: string | null;
  };
  
  /** Card details */
  card?: {
    cardId: string;
    maskedCard: string | null;
    token: string | null;
    cardType: string;
    expirationDate: string | null;
  };
  
  isDefault: boolean;
}

/**
 * Payment method in subscription response
 */
export interface SubscriptionPaymentMethodResponse {
  subscriptionPaymentMethodId: string;
  customerPaymentMethod: PaymentMethodDetails;
  cardProcessorId: string | null;
  achProcessorId: string | null;
  isAutoCharged: boolean;
}

/**
 * Subscription address
 */
export interface SubscriptionAddress {
  /** UUID - link to existing address */
  addressId?: string;
  
  /** Remittance address flag */
  isRemittance: boolean;
  
  /** Shipping address flag */
  isShipping: boolean;
  
  /** Billing address flag */
  isBilling: boolean;
  
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  fax?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Subscription address in response (includes ID)
 */
export interface SubscriptionAddressResponse extends SubscriptionAddress {
  subscriptionAddressId: string;
}

/**
 * Subscription line item (product/service)
 */
export interface SubscriptionLineItem {
  /** Product/service name */
  name: string;
  
  /** Product/service description */
  description: string;
  
  /** Quantity */
  quantity: number;
  
  /** Unit price in cents */
  unitPrice: number;
  
  /** Discount amount */
  discount?: number;
  
  /** Freight/shipping amount */
  freightAmount?: number | null;
  
  /** Unit of measure ID */
  unitOfMeasureId: number;
  
  /** Local tax percentage */
  localTaxPercent?: number | null;
  
  /** National tax percentage */
  nationalTaxPercent?: number | null;
  
  /** Commodity/product code */
  commodityCode?: string | null;
  
  /** Product ID reference */
  productId?: string | null;
}

/**
 * Line item in response (includes calculated fields)
 */
export interface SubscriptionLineItemResponse extends SubscriptionLineItem {
  lineItemId: string;
  isTaxable: boolean;
  taxAmount: number;
  unitOfMeasure: {
    unitOfMeasureId: number;
    name: string | null;
  };
}

/**
 * Custom field entry
 */
export interface CustomFieldEntry {
  customFieldId: number;
  customFieldValue?: string[];
  name?: string | null;
  value?: string | null;
  type?: string | null;
  dataType?: string | null;
  customFieldCategoryName?: string | null;
  customFieldCategoryId?: number;
  modifiedByUserId?: string;
  modifiedDateTime?: string;
}

/**
 * Subscription remittance/billing totals
 */
export interface SubscriptionRemit {
  subscriptionRemitId: string;
  baseAmount: number;
  taxAmount: number;
  shippingAmount: number | null;
  discountAmount: number | null;
  surchargeAmount: number | null;
  totalAmount: number;
}

/**
 * Invoice summary in subscription
 */
export interface SubscriptionInvoice {
  invoiceId: string;
  status: {
    invoiceStatusId: number;
    name: string | null;
  };
  amountCaptured: number;
  remainingBalance: number;
  invoiceDate: string | null;
  dueDate: string | null;
  createdDateTime: string | null;
  modifiedDateTime: string | null;
}

/**
 * Complete subscription object
 */
export interface Subscription {
  subscriptionId: string;
  name: string | null;
  number: string | null;
  message: string | null;
  note: string | null;
  prefix: string | null;
  
  status: {
    subscriptionStatusId: number;
    name: string | null;
  };
  
  createdByUserId: string;
  createdDateTime: string;
  modifiedByUserId: string;
  modifiedDateTime: string;
  
  gateway: {
    gatewayId: string;
    name: string | null;
  };
  
  customer: {
    customerId: string;
    name: string | null;
  };
  
  paymentMethod: SubscriptionPaymentMethodResponse;
  recurrence: RecurrenceScheduleResponse;
  remit: SubscriptionRemit;
  addresses: SubscriptionAddressResponse[];
  invoices: SubscriptionInvoice[];
  lineItems: SubscriptionLineItemResponse[];
  customFieldEntries: CustomFieldEntry[];
}

/**
 * Request to create subscription
 */
export interface CreateSubscriptionRequest {
  /** Customer ID (UUID) */
  customerId: string;
  
  /** Subscription status ID */
  subscriptionStatusId: number;
  
  /** Subscription name */
  name: string;
  
  /** Optional prefix */
  prefix?: string;
  
  /** Optional number */
  number?: string | null;
  
  /** Optional message */
  message?: string | null;
  
  /** Optional note */
  note?: string | null;
  
  /** Recurrence configuration */
  recurrence: RecurrenceSchedule;
  
  /** Payment method configuration */
  paymentMethod: SubscriptionPaymentMethod;
  
  /** Optional addresses */
  addresses?: SubscriptionAddress[];
  
  /** Line items (products/services) */
  lineItems: SubscriptionLineItem[];
  
  /** Optional custom fields */
  customFields?: Pick<CustomFieldEntry, 'customFieldId' | 'customFieldValue'>[];
}

/**
 * Request to update subscription
 */
export interface UpdateSubscriptionRequest {
  customerId?: string;
  subscriptionStatusId?: number;
  name?: string | null;
  prefix?: string | null;
  number?: string | null;
  message?: string | null;
  note?: string | null;
  recurrence?: Partial<RecurrenceSchedule>;
  paymentMethod?: Partial<SubscriptionPaymentMethod>;
  addresses?: SubscriptionAddress[];
  lineItems?: SubscriptionLineItem[];
  customFields?: Pick<CustomFieldEntry, 'customFieldId' | 'customFieldValue'>[];
}

/**
 * Subscription search request with operator-based filtering
 */
export interface SubscriptionSearchRequest {
  /** Global search across fields */
  globalSearch?: string | null;
  
  /** Subscription ID search */
  subscriptionId?: {
    operator: 'Equal';
    value: string | null;
  };
  
  /** Customer ID search */
  customerId?: {
    operator: 'Equal';
    value: string | null;
  };
  
  /** Customer name search */
  customerName?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Status name search */
  statusName?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Failed transaction flag */
  hasFailedTransaction?: {
    operator: 'Equal';
    value: boolean;
  };
  
  /** Subscription name search */
  subscriptionName?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Subscription number search */
  subscriptionNumber?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Subscription prefix search */
  subscriptionPrefix?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Subscription note search */
  subscriptionNote?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Schedule name search */
  scheduleName?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Billing period name search */
  billingPeriodName?: {
    operator: 'IsLike';
    value: string | null;
  };
  
  /** Term start date search */
  termStartDate?: {
    operator: 'Equal' | 'GreaterThan' | 'LessThan';
    date: string | null;
  };
  
  /** Term end date search */
  termEndDate?: {
    operator: 'Equal' | 'GreaterThan' | 'LessThan';
    date: string | null;
  };
  
  /** Billing start date search */
  billingStartDate?: {
    operator: 'Equal' | 'GreaterThan' | 'LessThan';
    date: string | null;
  };
  
  /** Auto-charge flag search */
  isAutoCharged?: {
    operator: 'Equal';
    value: boolean;
  };
  
  /** Product ID search */
  productId?: {
    operator: 'Equal';
    value: string | null;
  };
  
  /** Created date search */
  createdDate?: {
    operator: 'Equal' | 'GreaterThan' | 'LessThan';
    date: string | null;
  };
  
  /** Modified date search */
  modifiedDate?: {
    operator: 'Equal' | 'GreaterThan' | 'LessThan';
    date: string | null;
  };
  
  /** Pagination offset */
  offset?: number;
  
  /** Pagination limit */
  limit?: number;
  
  /** Sort column name */
  sortColumn?: string | null;
  
  /** Sort direction */
  sortDirection?: 'asc' | 'desc' | null;
}

/**
 * Subscription search response with pagination metadata
 */
export interface SubscriptionSearchResponse {
  statusCode: string;
  statusDetails: string[];
  data: {
    results: Subscription[];
    offset: number;
    limit: number;
    rowCount: number;
  };
}

/**
 * Cancel subscription request
 */
export interface CancelSubscriptionRequest {
  cancel: {
    /** Cancel immediately */
    now: boolean;
    /** Cancel at end of billing period */
    endOfBillingPeriod: boolean;
  };
  refund?: {
    /** Refund most recent payment */
    lastPaidAmount: boolean;
  };
}

/**
 * Resume subscription request
 */
export interface ResumeSubscriptionRequest {
  /** Apply proration for remaining days */
  prorateRemainingDays: boolean;
}

/**
 * API response wrapper for subscription
 */
export interface SubscriptionApiResponse {
  statusCode: string;
  statusDetails: string[];
  data: Subscription;
}
