# IQ Pro+ Client Library - API Documentation

This comprehensive guide covers all aspects of the IQ Pro+ Client Library, a TypeScript/Node.js SDK for integrating with the IQ Pro+ payment processing and subscription management platform.

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Authentication](#authentication)
- [Core Client](#core-client)
- [Services Overview](#services-overview)
- [Customer Management](#customer-management)
- [Payment Processing](#payment-processing)
- [Subscription Management](#subscription-management)
- [Webhook Handling](#webhook-handling)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Examples](#examples)

## Installation & Setup

### Installation

```bash
npm install @dojo-planner/iqpro-client
```

### Basic Setup

```typescript
import { IQProClient } from '@dojo-planner/iqpro-client';

const client = new IQProClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  scope: 'api://iq-pro-api/.default',
  oauthUrl: 'https://login.microsoftonline.com/your-tenant/oauth2/v2.0/token',
  baseUrl: 'https://api.iqpro.com',
  timeout: 30000,
  retryAttempts: 3
});

// Set gateway context (required for all operations)
client.setGatewayContext('your-gateway-id', false); // false = production, true = test mode
```

## Authentication

The IQ Pro+ Client Library uses OAuth 2.0 Client Credentials flow with Azure AD B2C for authentication.

### OAuth Configuration

```typescript
import { IQProConfig } from '@dojo-planner/iqpro-client';

const config: IQProConfig = {
  clientId: 'your-azure-app-client-id',
  clientSecret: 'your-azure-app-secret',
  scope: 'api://iq-pro-api/.default',
  oauthUrl: 'https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token',
  baseUrl: 'https://api.iqpro.com',
  timeout: 30000, // 30 seconds
  retryAttempts: 3
};
```

### Token Management

The client automatically handles token refresh and caching:

- Tokens are cached with a 30-second expiry buffer
- Automatic retry logic for failed requests
- Thread-safe token refresh operations

## Core Client

### IQProClient

The main client class provides access to all services and handles authentication.

```typescript
import { IQProClient } from '@dojo-planner/iqpro-client';

const client = new IQProClient(config);

// Access service modules
const customers = client.customers;
const payments = client.payments;
const subscriptions = client.subscriptions;
const webhooks = client.webhooks;

// Gateway context management
client.setGatewayContext('gateway-123', true); // Test mode
client.setGatewayContext('gateway-456', false); // Production mode

const context = client.getGatewayContext();
// Returns: { gatewayId: 'gateway-456', isTestMode: false }
```

### HTTP Methods

The client provides convenient HTTP method shortcuts:

```typescript
// Direct HTTP calls (automatically includes authentication)
const response = await client.get('/custom-endpoint');
const data = await client.post('/custom-endpoint', { key: 'value' });
const updated = await client.put('/custom-endpoint/123', updates);
await client.delete('/custom-endpoint/123');
```

## Services Overview

The library is organized into four main service modules:

1. **CustomerService** - Customer lifecycle management
2. **PaymentService** - Payment processing and payment methods
3. **SubscriptionService** - Recurring billing and subscriptions
4. **WebhookService** - Webhook validation and processing

Each service follows consistent patterns:
- Gateway-scoped operations
- Comprehensive validation
- Type-safe interfaces
- Detailed error handling

## Customer Management

### Creating Customers

```typescript
import { CreateCustomerRequest } from '@dojo-planner/iqpro-client';

const customerData: CreateCustomerRequest = {
  email: 'customer@example.com',
  name: 'John Doe',
  phone: '+1-555-0123',
  address: {
    line1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    postalCode: '12345',
    country: 'US'
  },
  metadata: {
    sourceChannel: 'website',
    customerType: 'premium'
  }
};

const customer = await client.customers.create(customerData);
console.log('Created customer:', customer.id);
```

### Retrieving Customers

```typescript
// Get single customer
const customer = await client.customers.get('customer-uuid');

// List customers with filtering and pagination
const customers = await client.customers.list({
  page: 1,
  limit: 50,
  email: 'john@example.com',
  status: 'active',
  createdAfter: '2024-01-01T00:00:00Z'
});

// Search customers by various criteria
const searchResults = await client.customers.search({
  query: 'john doe',
  includeInactive: false
});
```

### Updating Customers

```typescript
const updatedCustomer = await client.customers.update('customer-uuid', {
  name: 'John Smith',
  phone: '+1-555-9999',
  metadata: {
    lastLogin: new Date().toISOString()
  }
});
```

### Customer Status Management

```typescript
// Activate customer
await client.customers.activate('customer-uuid');

// Deactivate customer
await client.customers.deactivate('customer-uuid', 'Account closed by request');

// Check if customer is active
const isActive = await client.customers.isActive('customer-uuid');
```

### Customer Tags

```typescript
// Add tags to customer
await client.customers.addTags('customer-uuid', ['vip', 'loyalty-member']);

// Remove tags from customer
await client.customers.removeTags('customer-uuid', ['trial-user']);

// Get customer with tags
const customer = await client.customers.get('customer-uuid');
console.log('Customer tags:', customer.tags);
```

### Customer Analytics

```typescript
// Get customer metrics
const metrics = await client.customers.getMetrics('2024-01-01', '2024-12-31');
console.log('Total customers:', metrics.totalCustomers);
console.log('Active customers:', metrics.activeCustomers);
console.log('Growth rate:', metrics.growthRate);
```

## Payment Processing

### Creating Payments

```typescript
import { CreatePaymentRequest } from '@dojo-planner/iqpro-client';

const paymentData: CreatePaymentRequest = {
  amount: 2500, // $25.00 in cents
  currency: 'USD',
  customerId: 'customer-uuid',
  paymentMethodId: 'pm-uuid',
  description: 'Order #12345',
  captureMethod: 'automatic', // or 'manual'
  metadata: {
    orderId: 'order-12345',
    channel: 'online'
  }
};

const payment = await client.payments.create(paymentData);
console.log('Payment status:', payment.status);
```

### Payment Operations

```typescript
// Get payment details
const payment = await client.payments.get('payment-uuid');

// Capture authorized payment
const capturedPayment = await client.payments.capture('payment-uuid', 2000); // Partial capture

// Cancel payment
const cancelledPayment = await client.payments.cancel('payment-uuid', 'Customer request');

// Refund payment
const refund = await client.payments.refund('payment-uuid', 1000, 'Product returned');
console.log('Refund status:', refund.status);
```

### Payment Method Management

```typescript
import { CreatePaymentMethodRequest } from '@dojo-planner/iqpro-client';

// Create payment method
const paymentMethodData: CreatePaymentMethodRequest = {
  customerId: 'customer-uuid',
  type: 'credit_card',
  token: 'pm_test_token_from_frontend',
  billingAddress: {
    line1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    postalCode: '12345',
    country: 'US'
  }
};

const paymentMethod = await client.payments.createPaymentMethod(paymentMethodData);

// List customer payment methods
const paymentMethods = await client.payments.listPaymentMethods('customer-uuid');

// Set default payment method
const defaultPM = await client.payments.setDefaultPaymentMethod('pm-uuid');

// Update payment method
const updatedPM = await client.payments.updatePaymentMethod('pm-uuid', {
  billingAddress: { /* updated address */ }
});

// Delete payment method
await client.payments.deletePaymentMethod('pm-uuid');
```

### Payment Queries

```typescript
// List payments with advanced filtering
const payments = await client.payments.list({
  page: 1,
  limit: 25,
  status: 'completed',
  customerId: 'customer-uuid',
  minAmount: 1000, // $10.00
  maxAmount: 10000, // $100.00
  currency: 'USD',
  createdAfter: '2024-01-01T00:00:00Z'
});

// Get payment analytics
const analytics = await client.payments.getAnalytics('2024-01-01', '2024-12-31');
console.log('Total volume:', analytics.totalVolume);
console.log('Success rate:', analytics.successRate);
```

## Subscription Management

### Creating Subscriptions

```typescript
import { CreateSubscriptionRequest } from '@dojo-planner/iqpro-client';

const subscriptionData: CreateSubscriptionRequest = {
  customerId: 'customer-uuid',
  planId: 'plan-uuid',
  paymentMethodId: 'pm-uuid',
  trialDays: 14,
  billingAnchor: '2024-01-01T00:00:00Z',
  metadata: {
    source: 'website_signup',
    campaign: 'spring_promotion'
  }
};

const subscription = await client.subscriptions.create(subscriptionData);
console.log('Subscription status:', subscription.status);
console.log('Current period:', subscription.currentPeriodStart, 'to', subscription.currentPeriodEnd);
```

### Subscription Lifecycle Management

```typescript
// Get subscription details
const subscription = await client.subscriptions.get('subscription-uuid');

// Update subscription
const updated = await client.subscriptions.update({
  id: 'subscription-uuid',
  paymentMethodId: 'new-pm-uuid',
  metadata: { updated: true }
});

// Pause subscription with resume date
const paused = await client.subscriptions.pause(
  'subscription-uuid',
  '2024-02-01T00:00:00Z' // Resume date
);

// Resume paused subscription
const resumed = await client.subscriptions.resume('subscription-uuid');

// Cancel subscription
const cancelled = await client.subscriptions.cancel({
  id: 'subscription-uuid',
  cancelAt: 'period_end', // or 'now'
  reason: 'Customer request'
});
```

### Billing Plan Management

```typescript
import { PricePlan } from '@dojo-planner/iqpro-client';

// Create billing plan
const planData: Omit<PricePlan, 'id' | 'createdAt' | 'isActive'> = {
  name: 'Premium Plan',
  description: 'Full access with premium features',
  amount: 2999, // $29.99
  currency: 'USD',
  interval: 'month',
  intervalCount: 1,
  trialDays: 7,
  metadata: {
    features: ['feature1', 'feature2', 'feature3']
  }
};

const plan = await client.subscriptions.createPlan(planData);
console.log('Created plan:', plan.id);

// List billing plans
const plans = await client.subscriptions.listPlans(true); // Active only

// Update plan
const updatedPlan = await client.subscriptions.updatePlan('plan-uuid', {
  amount: 3499,
  description: 'Updated premium plan with new features'
});

// Archive plan (soft delete)
const archived = await client.subscriptions.archivePlan('plan-uuid');
```

### Subscription Analytics

```typescript
// Get subscription metrics
const metrics = await client.subscriptions.getMetrics();
console.log('MRR:', metrics.monthlyRecurringRevenue);
console.log('Churn rate:', metrics.churnRate);
console.log('LTV:', metrics.lifetimeValue);

// Get upcoming renewals
const renewals = await client.subscriptions.getUpcomingRenewals(30); // Next 30 days

// Get customer subscriptions
const customerSubs = await client.subscriptions.getByCustomer('customer-uuid', true); // Active only
```

## Webhook Handling

### Webhook Validation

```typescript
import { WebhookService } from '@dojo-planner/iqpro-client';

// Initialize webhook service with your secret
const webhookSecret = 'your-webhook-signing-secret';
const webhooks = new WebhookService(apiClient, config);

// Validate webhook in your endpoint handler
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-iq-pro-signature'] as string;
  const timestamp = req.headers['x-iq-pro-timestamp'] as string;
  const payload = JSON.stringify(req.body);

  try {
    const isValid = webhooks.validateSignature(payload, signature, timestamp, webhookSecret);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook
    const event = req.body;
    await processWebhookEvent(event);
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook validation error:', error);
    res.status(400).json({ error: 'Validation failed' });
  }
});
```

### Webhook Event Processing

```typescript
async function processWebhookEvent(event: any) {
  switch (event.type) {
    case 'payment.completed':
      console.log('Payment completed:', event.data.id);
      // Update order status, send confirmation email, etc.
      break;
      
    case 'subscription.created':
      console.log('New subscription:', event.data.id);
      // Provision access, send welcome email, etc.
      break;
      
    case 'subscription.cancelled':
      console.log('Subscription cancelled:', event.data.id);
      // Revoke access, send cancellation email, etc.
      break;
      
    case 'payment_method.updated':
      console.log('Payment method updated:', event.data.id);
      // Update local records, notify customer, etc.
      break;
      
    default:
      console.log('Unhandled webhook event:', event.type);
  }
}
```

## Error Handling

### Error Types

The library provides specific error types for different scenarios:

```typescript
import {
  IQProError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ConfigurationError
} from '@dojo-planner/iqpro-client';

try {
  const customer = await client.customers.create(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Field errors:', error.details);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Refresh credentials or re-authenticate
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited. Retry after:', error.retryAfter);
    // Implement exponential backoff
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.statusCode, error.message);
    // Implement retry logic
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Handling Best Practices

```typescript
import { IQProClient } from '@dojo-planner/iqpro-client';

class PaymentProcessor {
  private client: IQProClient;

  constructor(config: IQProConfig) {
    this.client = new IQProClient(config);
    this.client.setGatewayContext(config.gatewayId);
  }

  async processPayment(paymentData: CreatePaymentRequest, retryCount = 0): Promise<Payment> {
    const maxRetries = 3;

    try {
      return await this.client.payments.create(paymentData);
    } catch (error) {
      if (error instanceof RateLimitError && retryCount < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processPayment(paymentData, retryCount + 1);
      }

      if (error instanceof NetworkError && error.statusCode >= 500 && retryCount < maxRetries) {
        // Retry server errors
        const delay = 1000 * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processPayment(paymentData, retryCount + 1);
      }

      // Re-throw non-retryable errors
      throw error;
    }
  }
}
```

## Configuration

### Environment Variables

The library supports configuration via environment variables:

```bash
# OAuth Configuration
IQ_PRO_CLIENT_ID=your-client-id
IQ_PRO_CLIENT_SECRET=your-client-secret
IQ_PRO_SCOPE=api://iq-pro-api/.default
IQ_PRO_OAUTH_URL=https://login.microsoftonline.com/tenant/oauth2/v2.0/token

# API Configuration
IQ_PRO_BASE_URL=https://api.iqpro.com
IQ_PRO_TIMEOUT=30000
IQ_PRO_RETRY_ATTEMPTS=3

# Gateway Configuration
IQ_PRO_GATEWAY_ID=your-default-gateway-id
IQ_PRO_TEST_MODE=false
```

### Configuration Loading

```typescript
import { ConfigManager } from '@dojo-planner/iqpro-client';

// Load configuration from environment variables
const config = ConfigManager.loadConfig();

// Override specific values
const customConfig = ConfigManager.loadConfig({
  baseUrl: 'https://api-staging.iqpro.com',
  timeout: 60000
});

// Get configuration summary (credentials masked)
const summary = ConfigManager.getConfigSummary(config);
console.log('Configuration:', summary);
```

### Advanced Configuration

```typescript
import { IQProConfig } from '@dojo-planner/iqpro-client';

const advancedConfig: IQProConfig = {
  // OAuth Settings
  clientId: process.env.IQ_PRO_CLIENT_ID!,
  clientSecret: process.env.IQ_PRO_CLIENT_SECRET!,
  scope: 'api://iq-pro-api/.default',
  oauthUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
  
  // API Settings
  baseUrl: 'https://api.iqpro.com',
  timeout: 30000,
  retryAttempts: 3,
  
  // Custom headers (optional)
  headers: {
    'Custom-Header': 'custom-value'
  },
  
  // Request interceptors (optional)
  interceptors: {
    request: (config) => {
      // Modify request before sending
      config.headers['X-Request-ID'] = generateRequestId();
      return config;
    },
    response: (response) => {
      // Process response data
      logApiCall(response);
      return response;
    }
  }
};

const client = new IQProClient(advancedConfig);
```

## Examples

### Complete E-commerce Integration

```typescript
import { IQProClient, CreateCustomerRequest, CreatePaymentRequest } from '@dojo-planner/iqpro-client';

class EcommerceIntegration {
  private client: IQProClient;

  constructor() {
    this.client = new IQProClient({
      clientId: process.env.IQ_PRO_CLIENT_ID!,
      clientSecret: process.env.IQ_PRO_CLIENT_SECRET!,
      scope: 'api://iq-pro-api/.default',
      oauthUrl: process.env.IQ_PRO_OAUTH_URL!,
      baseUrl: process.env.IQ_PRO_BASE_URL!,
    });
    
    this.client.setGatewayContext(process.env.IQPRO_GATEWAY_ID!);
  }

  async processOrder(orderData: any) {
    try {
      // 1. Create or get customer
      let customer = await this.findOrCreateCustomer(orderData.customer);

      // 2. Create payment method if needed
      if (orderData.paymentToken) {
        const paymentMethod = await this.client.payments.createPaymentMethod({
          customerId: customer.id,
          type: 'credit_card',
          token: orderData.paymentToken,
          billingAddress: orderData.billingAddress
        });
        
        // Set as default if it's the customer's first payment method
        const existingMethods = await this.client.payments.listPaymentMethods(customer.id);
        if (existingMethods.length === 1) {
          await this.client.payments.setDefaultPaymentMethod(paymentMethod.id);
        }
      }

      // 3. Process payment
      const payment = await this.client.payments.create({
        amount: orderData.totalAmount,
        currency: orderData.currency,
        customerId: customer.id,
        paymentMethodId: orderData.paymentMethodId,
        description: `Order #${orderData.orderNumber}`,
        captureMethod: 'automatic',
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          items: JSON.stringify(orderData.items)
        }
      });

      // 4. Handle subscription if applicable
      if (orderData.subscriptionPlan) {
        const subscription = await this.client.subscriptions.create({
          customerId: customer.id,
          planId: orderData.subscriptionPlan,
          paymentMethodId: orderData.paymentMethodId,
          trialDays: orderData.trialDays,
          metadata: {
            orderId: orderData.id,
            source: 'checkout'
          }
        });
        
        return { payment, subscription, customer };
      }

      return { payment, customer };

    } catch (error) {
      console.error('Order processing failed:', error);
      throw error;
    }
  }

  private async findOrCreateCustomer(customerData: any) {
    // Try to find existing customer by email
    const existing = await this.client.customers.search({
      query: customerData.email,
      includeInactive: false
    });

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new customer
    return await this.client.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
      metadata: {
        source: 'checkout',
        firstOrderDate: new Date().toISOString()
      }
    });
  }
}
```

### Subscription Management Dashboard

```typescript
class SubscriptionDashboard {
  private client: IQProClient;

  constructor(config: IQProConfig) {
    this.client = new IQProClient(config);
    this.client.setGatewayContext(config.gatewayId);
  }

  async getDashboardData(dateRange?: { start: string; end: string }) {
    try {
      // Get subscription metrics
      const metrics = await this.client.subscriptions.getMetrics();

      // Get upcoming renewals
      const upcomingRenewals = await this.client.subscriptions.getUpcomingRenewals(30);

      // Get recent subscription activity
      const recentSubscriptions = await this.client.subscriptions.list({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Get customer metrics
      const customerMetrics = await this.client.customers.getMetrics(
        dateRange?.start,
        dateRange?.end
      );

      return {
        metrics: {
          mrr: metrics.monthlyRecurringRevenue,
          totalSubscriptions: metrics.totalSubscriptions,
          activeSubscriptions: metrics.activeSubscriptions,
          churnRate: metrics.churnRate,
          arpu: metrics.averageRevenuePerUser,
          ltv: metrics.lifetimeValue
        },
        upcomingRenewals: upcomingRenewals.map(sub => ({
          id: sub.id,
          customerId: sub.customerId,
          amount: sub.amount,
          renewalDate: sub.currentPeriodEnd,
          status: sub.status
        })),
        recentActivity: recentSubscriptions.data,
        customerGrowth: {
          totalCustomers: customerMetrics.totalCustomers,
          activeCustomers: customerMetrics.activeCustomers,
          growthRate: customerMetrics.growthRate
        }
      };

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      throw error;
    }
  }

  async handleSubscriptionAction(subscriptionId: string, action: string, params?: any) {
    try {
      switch (action) {
        case 'pause':
          return await this.client.subscriptions.pause(subscriptionId, params?.resumeAt);
          
        case 'resume':
          return await this.client.subscriptions.resume(subscriptionId);
          
        case 'cancel':
          return await this.client.subscriptions.cancel({
            id: subscriptionId,
            cancelAt: params?.immediately ? 'now' : 'period_end',
            reason: params?.reason
          });
          
        case 'update_payment_method':
          return await this.client.subscriptions.update({
            id: subscriptionId,
            paymentMethodId: params?.paymentMethodId
          });
          
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error(`Subscription ${action} failed:`, error);
      throw error;
    }
  }
}
```

This comprehensive documentation provides developers with everything they need to successfully integrate and use the IQ Pro+ Client Library in their applications. The library's type-safe interfaces, comprehensive error handling, and extensive feature set make it ideal for building robust payment and subscription management systems.