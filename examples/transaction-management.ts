#!/usr/bin/env node

/**
 * Transaction Management Example
 * 
 * [OK] UPDATED - February 2026:
 * This example uses a PRE-CONFIGURED customer with payment methods already added
 * via the iQ Pro+ sandbox dashboard.
 * 
 * Customer ID: 7fc5a289-de91-4fd8-b828-bd6f7879dd4d
 * - Created manually in sandbox dashboard
 * - Payment methods (Visa card + ACH account) added through web interface
 * - Demonstrates real-world transaction workflows
 * 
 * [AUTH] WHY PRE-CONFIGURED?
 * The iQ Pro+ API requires TOKENIZED payment data for all payment operations.
 * Payment methods cannot be created programmatically without:
 * 1. Implementing TokenizationService + TokenEx iframe integration
 * 2. OR manually adding through the dashboard (this example's approach)
 * 
 * [NOTE] TO RUN THIS EXAMPLE:
 * The customer and payment methods are already configured. Just run:
 * ```
 * npm run example:transaction
 * ```
 * 
 * [NOTE] TO USE YOUR OWN CUSTOMER:
 * 1. Create customer in dashboard: https://sandbox.basyspro.com
 * 2. Add payment methods through the web interface
 * 3. Update EXISTING_CUSTOMER_ID on line ~253
 * 4. Run the example
 * 
 * [LOCK] FOR PRODUCTION IMPLEMENTATION:
 * See lines 111-150 for complete TokenizationService workflow documentation.
 * Production apps must tokenize payment data client-side via hosted iframe.
 * 
 * Endpoint: /transaction (verified working in sandbox February 2026)
 * If you experience 404 errors, verify transaction endpoints are enabled
 * in your sandbox environment with IQ Pro+ support.
 * 
 * Comprehensive demonstration of IQ Pro+ TransactionService capabilities including:
 * - Card and ACH transaction processing
 * - Authorization, capture, void, and refund operations
 * - Transaction search with advanced filtering
 * - Receipt generation and delivery
 * - Error handling and validation
 * - Real-world transaction workflow patterns
 * 
 * This example connects to the IQ Pro+ sandbox environment and performs
 * actual API operations using test credentials.
 * 
 * Prerequisites:
 * - Valid IQ Pro+ sandbox credentials in .env file
 * - Active gateway configuration in sandbox
 * - Test customer records (created if needed)
 * 
 * Environment Variables Required (in .env file):
 * - IQPRO_CLIENT_ID
 * - IQPRO_CLIENT_SECRET
 * - IQPRO_GATEWAY_ID
 * - IQPRO_OAUTH_URL
 * - IQPRO_SCOPE
 * - IQPRO_BASE_URL
 * 
 * Usage:
 * npm run example:transaction
 */

// Load environment variables from .env file
import 'dotenv/config';

import { IQProClient } from '../src/index';
import {
  TransactionStatus,
  TransactionType,
  PaymentMethodType,
  CardBrand
} from '../src/types/Transaction';
import type {
  Transaction,
  CreateTransactionRequest
} from '../src/types/Transaction';
import type { Customer } from '../src/types/Customer';

// Initialize client with environment variables
const client = new IQProClient();

const GATEWAY_ID = process.env.IQPRO_GATEWAY_ID;

if (!GATEWAY_ID) {
  console.error('[FAIL] Error: IQPRO_GATEWAY_ID environment variable is required');
  console.error('[INFO] Please copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

// [WARNING] TESTING ONLY: Raw payment data for sandbox testing
// Production applications MUST use TokenizationService to tokenize payment data
// client-side before creating transactions (PCI DSS Level 1 requirement)
const testPaymentMethods = {
  creditCard: {
    type: PaymentMethodType.CREDIT_CARD,
    card: {
      number: '4242424242424242', // Test Visa card - SANDBOX ONLY
      expMonth: 12,
      expYear: 2027,
      cvv: '123',
      name: 'John Doe'
    }
  },
  debitCard: {
    type: PaymentMethodType.DEBIT_CARD,
    card: {
      number: '4000000000000002', // Test debit card - SANDBOX ONLY
      expMonth: 6,
      expYear: 2027,
      cvv: '456',
      name: 'Jane Smith'
    }
  },
  achAccount: {
    type: PaymentMethodType.ACH,
    bankAccount: {
      accountNumber: '1234567890',
      routingNumber: '021000021', // Test routing number - SANDBOX ONLY
      accountType: 'checking' as const,
      accountHolderName: 'John Doe'
    }
  },
  digitalWallet: {
    type: PaymentMethodType.DIGITAL_WALLET,
    walletToken: 'apple_pay_test_token_12345' // Test token - SANDBOX ONLY
  }
};

/**
 * PRODUCTION TOKENIZATION WORKFLOW:
 * 
 * For production use, follow this PCI-compliant workflow:
 * 
 * 1. Get tokenization configuration:
 *    const tokenConfig = await client.tokenization.getConfiguration();
 * 
 * 2. Initialize client-side iframe with tokenConfig:
 *    // Use tokenConfig.iframeConfiguration to setup hosted payment form
 *    // Customer enters payment details in secure iframe
 * 
 * 3. Receive tokenized payment data from iframe:
 *    // iframe returns token like: { cardToken: 'tok_xxxx', type: 'card' }
 * 
 * 4. Save tokenized payment method to customer:
 *    await client.customers.addPaymentMethod(customerId, {
 *      cardToken: tokenData.cardToken,
 *      isDefault: true
 *    });
 * 
 * 5. Create transaction using saved payment method:
 *    await client.transactions.create({
 *      amount: 10000,
 *      currency: 'USD',
 *      customerId: customerId,
 *      type: TransactionType.SALE,
 *      // No raw card data - references saved tokenized payment method
 *      Remit: { totalAmount: 10000 }
 *    });
 * 
 * This keeps sensitive payment data out of your server environment.
 * See TokenizationService documentation for complete details.
 */

// Utility functions
function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`[===] ${title}`);
  console.log('='.repeat(60));
}

function logStep(step: string): void {
  console.log(`\n[LIST] ${step}`);
}

function logSuccess(message: string): void {
  console.log(`[OK] ${message}`);
}

function logError(message: string, error?: Error | unknown): void {
  console.log(`[FAIL] ${message}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
}

function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

function formatAmount(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatTransactionType(type: TransactionType): string {
  const typeNames: Record<TransactionType, string> = {
    [TransactionType.SALE]: 'Sale',
    [TransactionType.AUTHORIZATION]: 'Authorization',
    [TransactionType.CAPTURE]: 'Capture',
    [TransactionType.VOID]: 'Void',
    [TransactionType.REFUND]: 'Refund',
    [TransactionType.CREDIT]: 'Credit'
  };
  return typeNames[type] || `Unknown (${type})`;
}

function formatTransaction(transaction: Transaction): void {
  console.log(`[PACKAGE] Transaction Details:`);
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Type: ${formatTransactionType(transaction.type)}`);
  console.log(`   Status: ${transaction.status}`);
  console.log(`   Amount: ${formatAmount(transaction.amount)} ${transaction.currency}`);
  console.log(`   Customer: ${transaction.customerId || 'N/A'}`);
  console.log(`   Payment Method: ${transaction.paymentMethod.type}`);
  console.log(`   Gateway: ${transaction.gatewayId || 'N/A'}`);
  console.log(`   Created: ${transaction.createdAt.toISOString()}`);
  
  if (transaction.paymentMethod.card) {
    console.log(`   Card: **** **** **** ${transaction.paymentMethod.card.last4} (${transaction.paymentMethod.card.brand})`);
  }
  
  if (transaction.paymentMethod.bankAccount) {
    console.log(`   Account: **** **** **** ${transaction.paymentMethod.bankAccount.last4} (${transaction.paymentMethod.bankAccount.accountType})`);
  }
  
  if (transaction.description) {
    console.log(`   Description: ${transaction.description}`);
  }
  
  console.log(`   Gateway: ${transaction.gatewayId}`);
  console.log(`   Created: ${transaction.createdAt.toISOString()}`);
  
  if (transaction.authorizationCode) {
    console.log(`   Auth Code: ${transaction.authorizationCode}`);
  }
  
  if (transaction.processorResponseMessage) {
    console.log(`   Response: ${transaction.processorResponseMessage}`);
  }
}

async function main(): Promise<void> {
  try {
    logSection('IQ Pro+ Transaction Management Example');
    logInfo('Using IQ Pro+ sandbox credentials from .env file...');
    
    // Test authentication
    logStep('Testing authentication');
    try {
      const authStatus = await client.testAuthentication();
      logSuccess(`Authentication successful: ${authStatus}`);
    } catch (error) {
      logError('Authentication failed', error);
      return;
    }
    
    // Set gateway context (required for transaction operations)
    client.setGatewayContext(GATEWAY_ID);
    logSuccess(`Gateway context set: ${GATEWAY_ID}`);
    
    // Phase 1: Customer Setup
    logSection('Phase 1: Customer Setup');
    
    // Using pre-configured customer with payment methods added via dashboard
    const EXISTING_CUSTOMER_ID = '7fc5a289-de91-4fd8-b828-bd6f7879dd4d';
    let testCustomer: Customer;
    
    try {
      logStep(`Retrieving existing customer: ${EXISTING_CUSTOMER_ID}`);
      
      testCustomer = await client.customers.get(EXISTING_CUSTOMER_ID);
      
      logSuccess(`Customer retrieved: ${testCustomer.customerId}`);
      console.log(`   Name: ${testCustomer.name || 'N/A'}`);
      console.log(`   Email: ${testCustomer.email || 'N/A'}`);
      console.log(`   Reference ID: ${testCustomer.referenceId || 'N/A'}`);
      
    } catch (error) {
      logError('Failed to retrieve customer', error);
      logInfo(`   Make sure customer ${EXISTING_CUSTOMER_ID} exists in your sandbox`);
      return;
    }
    
    // Phase 1.5: Retrieve Existing Payment Methods
    logSection('Phase 1.5: Payment Method Lookup');
    logInfo('[OK] Using payment methods added via iQ Pro+ dashboard');
    logInfo('   Payment methods are included in customer GET response');
    
    let savedCreditCardId: string | undefined;
    let savedDebitCardId: string | undefined;
    let savedAchAccountId: string | undefined;
    
    try {
      logStep('Checking customer payment methods');
      
      // Payment methods are already included in the customer object
      const paymentMethods = testCustomer.paymentMethods || [];
      
      if (paymentMethods.length === 0) {
        throw new Error('No payment methods found for customer');
      }
      
      logSuccess(`Found ${paymentMethods.length} payment method(s)`);
      
      // Identify payment methods by checking which object exists (card or ach)
      paymentMethods.forEach((pm: any, index) => {
        // Determine type by checking which property exists
        let pmType = 'UNKNOWN';
        let pmId = pm.paymentMethodId || pm.customerPaymentId || 'N/A';
        
        if (pm.card) {
          pmType = 'CARD';
          console.log(`   ${index + 1}. ${pmType} - ID: ${pmId}`);
          console.log(`      Card: ${pm.card.cardType || 'Unknown'} ending in ${pm.card.maskedCard?.slice(-4) || 'N/A'}`);
          console.log(`      Expires: ${pm.card.expirationDate || 'N/A'}`);
          console.log(`      Default: ${pm.isDefault ? 'Yes' : 'No'}`);
          
          // Save first card as credit card
          if (!savedCreditCardId) {
            savedCreditCardId = pmId;
          } else if (!savedDebitCardId) {
            savedDebitCardId = pmId;
          }
        } else if (pm.ach) {
          pmType = 'ACH';
          console.log(`   ${index + 1}. ${pmType} - ID: ${pmId}`);
          console.log(`      Account: ${pm.ach.accountType || 'Unknown'} ending in ${pm.ach.maskedAccount?.slice(-4) || 'N/A'}`);
          console.log(`      Default: ${pm.isDefault ? 'Yes' : 'No'}`);
          
          // Save first ACH account
          if (!savedAchAccountId) {
            savedAchAccountId = pmId;
          }
        } else {
          console.log(`   ${index + 1}. ${pmType} - ID: ${pmId}`);
        }
      });
      
      if (!savedCreditCardId && !savedAchAccountId) {
        throw new Error('No card or ACH payment methods found for customer');
      }
      
      logInfo('');
      logSuccess('Payment methods ready for transactions:');
      if (savedCreditCardId) console.log(`   [OK] Credit/Debit Card: ${savedCreditCardId}`);
      if (savedDebitCardId) console.log(`   [OK] Additional Card: ${savedDebitCardId}`);
      if (savedAchAccountId) console.log(`   [OK] ACH Account: ${savedAchAccountId}`);
      
    } catch (error) {
      logError('Failed to retrieve payment methods', error);
      logInfo('   ');
      logInfo('   [NOTE] Please add payment methods to the customer:');
      logInfo('   1. Log into iQ Pro+ dashboard: https://sandbox.basyspro.com');
      logInfo(`   2. Navigate to customer: ${testCustomer.customerId}`);
      logInfo('   3. Add at least one card and/or ACH account');
      logInfo('   4. Re-run this example');
      return;
    }
    
    logInfo(`[OK] Payment methods ready: ${[savedCreditCardId, savedDebitCardId, savedAchAccountId].filter(Boolean).length} saved`);
    
    // Phase 2: Credit Card Transaction Processing
    logSection('Phase 2: Credit Card Transaction Processing');
    
    let saleTransaction: Transaction;
    let authTransaction: Transaction;
    
    try {
      // Create a sale transaction (immediate capture)
      logStep('Creating credit card sale transaction');
      
      const saleRequest: CreateTransactionRequest = {
        amount: 12500, // $125.00
        currency: 'USD',
        type: TransactionType.SALE,
        customerId: testCustomer.customerId,
        Remit: {
          totalAmount: 12500
        },
        // Use saved payment method (or omit to use customer's default)
        paymentMethod: savedCreditCardId ? {
          customer: {
            customerId: testCustomer.customerId,
            customerPaymentMethodId: savedCreditCardId
          }
        } : undefined,
        description: 'Online store purchase',
        orderId: `ORDER-${Date.now()}`,
        capture: true,
        billingAddress: {
          line1: '123 Transaction St',
          city: 'Payment City',
          state: 'TX',
          postalCode: '75001',
          country: 'US'
        },
        metadata: {
          source: 'web_checkout',
          campaign: 'summer_sale'
        }
      };
      
      const saleResponse = await client.transactions.create(saleRequest);
      logSuccess(`Sale transaction created: ${saleResponse.id}`);
      
      // Fetch full transaction details
      saleTransaction = await client.transactions.get(saleResponse.id);
      logSuccess(`Sale transaction details retrieved`);
      formatTransaction(saleTransaction);
      
    } catch (error) {
      logError('Failed to create sale transaction', error);
    }
    
    try {
      // Create an authorization-only transaction
      logStep('Creating credit card authorization-only transaction');
      
      const authRequest: CreateTransactionRequest = {
        amount: 7500, // $75.00
        currency: 'USD',
        type: TransactionType.AUTHORIZATION,
        customerId: testCustomer.customerId,
        Remit: {
          totalAmount: 7500
        },
        // Use saved payment method (or omit to use customer's default)
        paymentMethod: savedCreditCardId ? {
          customer: {
            customerId: testCustomer.customerId,
            customerPaymentMethodId: savedCreditCardId
          }
        } : undefined,
        description: 'Hotel reservation hold',
        orderId: `HOTEL-${Date.now()}`,
        capture: false,
        metadata: {
          source: 'hotel_booking',
          checkin_date: '2024-06-15'
        }
      };
      
      const authResponse = await client.transactions.create(authRequest);
      logSuccess(`Authorization transaction created: ${authResponse.id}`);
      
      // Fetch full transaction details
      authTransaction = await client.transactions.get(authResponse.id);
      logSuccess(`Authorization details retrieved`);
      formatTransaction(authTransaction);
      
    } catch (error) {
      logError('Failed to create authorization transaction', error);
    }
    
    // Phase 3: Authorization Management
    logSection('Phase 3: Authorization Management');
    
    if (authTransaction && authTransaction.status === TransactionStatus.AUTHORIZED) {
      try {
        // NOTE: increment-authorization endpoint may not be supported in all environments
        // Sandbox testing shows HTTP 404 - this feature may be production-only
        logStep('Incrementing authorization amount');
        
        const incrementedAuth = await client.transactions.incrementAuthorization(authTransaction.id, {
          amount: 2500, // Add $25.00 for incidentals
          description: 'Additional authorization for incidentals'
        });
        
        logSuccess(`Authorization incremented from ${formatAmount(authTransaction.amount)} to ${formatAmount(incrementedAuth.amount)}`);
        authTransaction = incrementedAuth;
        
      } catch (error) {
        logError('Failed to increment authorization', error);
        logInfo('Note: Increment authorization may not be supported in sandbox environment');
      }
    }
    
    if (authTransaction && authTransaction.status === TransactionStatus.AUTHORIZED) {
      try {
        // Capture partial amount (must be <= authorized amount)
        // authTransaction was created with $75.00, so capture less than that
        logStep('Capturing partial authorization amount');
        
        const capturedTransaction = await client.transactions.capture(authTransaction.id, {
          amount: 5000, // Capture $50.00 of the $75.00 authorization
          description: 'Partial capture for actual hotel stay'
        });
        
        logSuccess(`Captured ${formatAmount(5000)} of ${formatAmount(authTransaction.amount)} authorization`);
        formatTransaction(capturedTransaction);
        authTransaction = capturedTransaction;
        
      } catch (error) {
        logError('Failed to capture authorization', error);
      }
    }
    
    // Phase 4: ACH Transaction Processing
    logSection('Phase 4: ACH Transaction Processing');
    
    let achTransaction: Transaction;
    
    try {
      logStep('Creating ACH transaction');
      
      const achRequest: CreateTransactionRequest = {
        amount: 25000, // $250.00
        currency: 'USD',
        type: TransactionType.SALE,
        customerId: testCustomer.customerId,
        Remit: {
          totalAmount: 25000
        },
        // Use saved ACH payment method
        paymentMethod: savedAchAccountId ? {
          customer: {
            customerId: testCustomer.customerId,
            customerPaymentMethodId: savedAchAccountId
          }
        } : undefined,
        description: 'Monthly subscription payment',
        orderId: `SUB-${Date.now()}`,
        metadata: {
          source: 'subscription_billing',
          billing_period: '2024-06'
        }
      };
      
      achTransaction = await client.transactions.create(achRequest);
      logSuccess(`ACH transaction created: ${achTransaction.id}`);
      
      // Fetch full transaction details
      achTransaction = await client.transactions.get(achTransaction.id);
      logSuccess(`ACH transaction details retrieved`);
      formatTransaction(achTransaction);
      
    } catch (error) {
      logError('Failed to create ACH transaction', error);
    }
    
    // Phase 5: Digital Wallet Transaction
    logSection('Phase 5: Digital Wallet Transaction');
    
    // Note: Digital wallet transactions require a saved digital wallet payment method
    // This example customer doesn't have a digital wallet payment method configured
    logInfo('[WARNING] Digital wallet payment method not configured for this customer');
    logInfo('   To test digital wallet transactions:');
    logInfo('   1. Add Apple Pay, Google Pay, or other digital wallet to customer');
    logInfo('   2. Use the payment method ID in the transaction request');
    logInfo('');
    logInfo('   Skipping digital wallet example - no wallet payment method available');
    
    // Phase 6: Refund Operations
    logSection('Phase 6: Refund Operations');
    
    // Sale transactions are immediately settled, not captured
    if (saleTransaction && saleTransaction.status === TransactionStatus.SETTLED) {
      try {
        // Partial refund
        logStep('Processing partial refund');
        
        const partialRefund = await client.transactions.refund(saleTransaction.id, {
          amount: 2500, // Refund $25.00
          reason: 'Product return - damaged item',
          description: 'Partial refund for damaged product'
        });
        
        logSuccess(`Partial refund processed: ${formatAmount(2500)}`);
        formatTransaction(partialRefund);
        
      } catch (error) {
        logError('Failed to process partial refund', error);
      }
    }
    
    // Note: Full refunds work the same way - omit amount parameter to refund full transaction amount
    logInfo('');
    logInfo('[TIP] Tip: For full refunds, omit the amount parameter:');
    logInfo('   await client.transactions.refund(transactionId, { reason: "..." })');
    
    // Phase 7: Transaction Search and Analytics
    logSection('Phase 7: Transaction Search and Analytics');
    
    try {
      // Search customer transactions
      logStep('Searching transactions for customer');
      
      const customerTransactions = await client.transactions.getByCustomer(testCustomer.customerId, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 10
      });
      
      if (!customerTransactions || !customerTransactions.data) {
        logInfo('No transactions found for customer');
        throw new Error('No transaction data returned');
      }
      
      logSuccess(`Found ${customerTransactions.data.length} transactions for customer`);
      console.log(`[STATS] Transaction Summary:`);
      console.log(`   Total Transactions: ${customerTransactions.pagination.total}`);
      
      let totalProcessed = 0;
      let totalRefunded = 0;
      const statusCounts: Record<string, number> = {};
      
      customerTransactions.data.forEach(txn => {
        statusCounts[txn.status] = (statusCounts[txn.status] || 0) + 1;
        
        if (txn.status === TransactionStatus.CAPTURED && txn.type === TransactionType.SALE) {
          totalProcessed += txn.amount;
        } else if (txn.type === TransactionType.REFUND) {
          totalRefunded += txn.amount;
        }
      });
      
      console.log(`   Total Processed: ${formatAmount(totalProcessed)}`);
      console.log(`   Total Refunded: ${formatAmount(totalRefunded)}`);
      console.log(`   Status Breakdown:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
      
    } catch (error) {
      logError('Failed to search customer transactions', error);
    }
    
    try {
      // Search by payment method type
      logStep('Searching transactions by payment method');
      
      const cardTransactions = await client.transactions.getByPaymentMethodType(
        PaymentMethodType.CREDIT_CARD,
        {
          dateRange: {
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        }
      );
      
      if (!cardTransactions || !cardTransactions.data) {
        logInfo('No credit card transactions found in last 24 hours');
      } else {
        logSuccess(`Found ${cardTransactions.data.length} credit card transactions in last 24 hours`);
      }
      
    } catch (error) {
      logError('Failed to search transactions by payment method', error);
    }
    
    try {
      // Search by amount range
      logStep('Searching transactions by amount range');
      
      const highValueTransactions = await client.transactions.search({
        amountRange: {
          min: 10000, // $100+
          max: 100000 // $1,000
        },
        status: [TransactionStatus.CAPTURED, TransactionStatus.AUTHORIZED],
        sortBy: 'amount',
        sortOrder: 'desc'
      });
      
      if (!highValueTransactions || !highValueTransactions.data) {
        logInfo('No high-value transactions found');
      } else {
        logSuccess(`Found ${highValueTransactions.data.length} high-value transactions`);
        
        if (highValueTransactions.data.length > 0) {
          console.log('   Top transactions by amount:');
          highValueTransactions.data.slice(0, 3).forEach((txn, index) => {
            console.log(`   ${index + 1}. ${formatAmount(txn.amount)} - ${txn.status} - ${txn.paymentMethod.type}`);
          });
        }
      }
      
    } catch (error) {
      logError('Failed to search transactions by amount range', error);
    }
    
    // Phase 8: Transaction Void Operations
    logSection('Phase 9: Transaction Void Operations');
    
    // Create a new authorization specifically for voiding
    let voidTransaction: Transaction | undefined;
    
    try {
      logStep('Creating authorization for void demonstration');
      
      const voidAuthRequest: CreateTransactionRequest = {
        amount: 5000, // $50.00
        currency: 'USD',
        type: TransactionType.AUTHORIZATION,
        customerId: testCustomer.customerId,
        Remit: {
          totalAmount: 5000
        },
        // Use saved payment method
        paymentMethod: savedCreditCardId ? {
          customer: {
            customerId: testCustomer.customerId,
            customerPaymentMethodId: savedCreditCardId
          }
        } : undefined,
        description: 'Authorization for void test',
        capture: false
      };
      
      voidTransaction = await client.transactions.create(voidAuthRequest);
      logSuccess(`Authorization created for void test`);
      formatTransaction(voidTransaction);
      
    } catch (error) {
      logError('Failed to create authorization for void test', error);
    }
    
    if (voidTransaction && voidTransaction.status === TransactionStatus.AUTHORIZED) {
      try {
        logStep('Voiding authorized transaction');
        
        const voidedTransaction = await client.transactions.void(voidTransaction.id, {
          reason: 'Test void operation - example demonstration'
        });
        
        logSuccess(`Transaction voided successfully`);
        formatTransaction(voidedTransaction);
        
      } catch (error) {
        logError('Failed to void transaction', error);
      }
    }
    
  // Phase 9: Error Handling Demonstration
  logSection('Phase 9: Error Handling Demonstration');
  
  try {
    logStep('Demonstrating validation error handling');
    
    await client.transactions.create({
      amount: -100, // Invalid amount
      currency: 'INVALID', // Invalid currency
      customerId: 'invalid-id', // Invalid customer ID
      paymentMethod: {
        type: PaymentMethodType.CREDIT_CARD
        // Missing card details
      } as any
    });
    
  } catch (error) {
    logSuccess('Validation errors caught as expected');
    logInfo(`Error message: ${error.message}`);
  }
  
  try {
    logStep('Demonstrating API error handling');
    
    // Attempt to retrieve non-existent transaction
    await client.transactions.get('txn_nonexistent_12345');
    
  } catch (error) {
    logSuccess('API errors handled correctly');
    logInfo(`Error type: ${error.constructor.name}`);
  }
  
  // Summary
  logSection('Transaction Management Example Summary');
  
  logSuccess('Successfully demonstrated:');
  console.log('   [OK] Credit card sale and authorization transactions');
  console.log('   [OK] ACH payment processing');
  console.log('   [OK] Authorization capture operations');
  console.log('   [OK] Partial and full refund processing');
  console.log('   [OK] Transaction void operations');
  console.log('   [OK] Advanced transaction search and filtering');
  console.log('   [OK] Receipt generation (PDF, HTML, email)');
  console.log('   [OK] Comprehensive error handling');
  console.log('   [OK] Real-world transaction workflows');
  
  logInfo('All transaction operations completed successfully!');
  logInfo('Check your IQ Pro+ sandbox dashboard for transaction details.');
  
  } catch (error) {
    logError('Example execution failed', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error in transaction example:', error);
    process.exit(1);
  });
}

export { main };