/**
 * Example: IQ Pro+ Client Service Layer Usage
 * 
 * This example demonstrates how to use the comprehensive service layer
 * built on OAuth 2.0 authentication for managing customers, payments,
 * and subscriptions.
 */

import { IQProClient } from '../src/IQProClient';

async function serviceLayerExample() {
  // Initialize the client with environment variables
  const client = new IQProClient({
    clientId: process.env.IQPRO_CLIENT_ID,
    clientSecret: process.env.IQPRO_CLIENT_SECRET,
    baseUrl: 'https://api-sandbox.iqpro.com', // Use sandbox for testing
    debug: true // Enable debug logging
  });

  try {
    // Set gateway context (required for most operations)
    client.setGatewayContext('your-gateway-id', true); // true = test mode

    // [AUTH] Test authentication
    console.log('Testing OAuth authentication...');
    const isAuthenticated = await client.testAuthentication();
    console.log('[OK] Authentication successful:', isAuthenticated);

    // [USER] Customer Management
    console.log('\
--- Customer Management ---');
    
    // Create a new customer
    const newCustomer = await client.customers.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
      company: 'Acme Corp',
      address: {
        line1: '123 Main Street',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US'
      },
      tags: ['premium', 'enterprise']
    });
    console.log('[OK] Customer created:', newCustomer.id);

    // Get customer by ID
    const customer = await client.customers.get(newCustomer.id);
    console.log('[OK] Customer retrieved:', customer.email);

    // List customers with filters
    const customerList = await client.customers.list({
      page: 1,
      limit: 10,
      status: 'active',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    console.log(`[OK] Found ${customerList.pagination.total} customers`);

    // Get customer statistics
    const stats = await client.customers.getStats();
    console.log('[STATS] Customer stats:', {
      total: stats.total,
      active: stats.active,
      averageLTV: stats.averageLifetimeValue
    });

    // [PAYMENT] Payment Management
    console.log('\
--- Payment Management ---');
    
    // Create a payment method first (in real usage, this would come from your frontend)
    const paymentMethod = await client.payments.createPaymentMethod({
      customerId: newCustomer.id,
      type: 'credit_card', // This would normally come from a tokenized card
      token: 'pm_test_token_visa', // Test token
      billingAddress: {
        line1: '123 Main Street',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US'
      },
      setAsDefault: true
    });
    console.log('[OK] Payment method created:', paymentMethod.id);

    // Create a payment
    const payment = await client.payments.create({
      amount: 2500, // $25.00 in cents
      currency: 'USD',
      customerId: newCustomer.id,
      paymentMethodId: paymentMethod.id,
      description: 'Service subscription payment',
      metadata: {
        orderId: 'order_123',
        invoiceId: 'inv_456'
      }
    });
    console.log('[OK] Payment created:', payment.id, `($${payment.amount / 100})`);

    // List payments for customer
    const paymentList = await client.payments.list({
      customerId: newCustomer.id,
      status: 'completed',
      limit: 5
    });
    console.log(`[OK] Found ${paymentList.pagination.total} payments for customer`);

    // [LIST] Subscription Management
    console.log('\
--- Subscription Management ---');
    
    // Create a price plan first
    const pricePlan = await client.subscriptions.createPlan({
      name: 'Professional Plan',
      description: 'Full-featured professional subscription',
      amount: 2999, // $29.99/month
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
      trialDays: 14
    });
    console.log('[OK] Price plan created:', pricePlan.name);

    // Create a subscription
    const subscription = await client.subscriptions.create({
      customerId: newCustomer.id,
      planId: pricePlan.id,
      paymentMethodId: paymentMethod.id,
      trialDays: 14,
      metadata: {
        source: 'website',
        campaign: 'spring2024'
      }
    });
    console.log('[OK] Subscription created:', subscription.id, `(${subscription.status})`);

    // List active subscriptions
    const subscriptionList = await client.subscriptions.list({
      status: 'active',
      limit: 10
    });
    console.log(`[OK] Found ${subscriptionList.pagination.total} active subscriptions`);

    // Get subscription metrics
    const metrics = await client.subscriptions.getMetrics();
    console.log('[STATS] Subscription metrics:', {
      activeCount: metrics.activeCount,
      mrr: `$${metrics.monthlyRecurringRevenue / 100}`,
      arr: `$${metrics.annualRecurringRevenue / 100}`
    });

    // [REFRESH] Advanced Operations
    console.log('\
--- Advanced Operations ---');

    // Add customer tags
    const updatedCustomer = await client.customers.addTags(newCustomer.id, ['high-value']);
    console.log('[OK] Customer tags updated:', updatedCustomer.tags);

    // Pause subscription
    const pausedSubscription = await client.subscriptions.pause(
      subscription.id,
      undefined, // No resume date (manual resume)
      'keep_as_draft' // Keep invoices as drafts
    );
    console.log('[OK] Subscription paused:', pausedSubscription.status);

    // Resume subscription
    const resumedSubscription = await client.subscriptions.resume(subscription.id);
    console.log('[OK] Subscription resumed:', resumedSubscription.status);

    // Get rate limit status
    const rateLimitStatus = client.getRateLimitStatus();
    console.log('[METRICS] Rate limit status:', {
      remaining: rateLimitStatus.requestsRemaining,
      resetTime: new Date(rateLimitStatus.windowResetTime).toLocaleTimeString()
    });

    // [SEARCH] Custom API Calls
    console.log('\
--- Custom API Calls ---');
    
    // Use direct HTTP methods for custom endpoints
    const customData = await client.get('/custom/analytics', {
      query: {
        period: '30d',
        metrics: 'revenue,customers'
      }
    });
    console.log('[OK] Custom API call successful');

    console.log('\n[SUCCESS] Service layer example completed successfully!');
    
  } catch (error) {
    console.error('[FAIL] Error during service layer example:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }
  }
}

// Export the example function
export { serviceLayerExample };

// Run example if called directly
if (require.main === module) {
  serviceLayerExample().catch(console.error);
}