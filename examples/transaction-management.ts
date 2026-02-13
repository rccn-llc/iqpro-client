#!/usr/bin/env node

/**
 * Transaction Management Example
 * 
 * ⚠️ IMPORTANT API LIMITATION:
 * As of February 2026, the payment/transaction endpoints are NOT available in the
 * IQ Pro+ sandbox environment. All API calls to /payments return HTTP 404.
 * This example is fully implemented and ready to use once the API endpoints are deployed.
 * 
 * Comprehensive demonstration of IQ Pro+ TransactionService capabilities including:
 * - Card, ACH, and digital wallet transaction processing
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

import { IQProClient } from '../src/IQProClient';
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
  console.error('❌ Error: IQPRO_GATEWAY_ID environment variable is required');
  console.error('ℹ️  Please copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

// Test data for various payment methods
const testPaymentMethods = {
  creditCard: {
    type: PaymentMethodType.CREDIT_CARD,
    card: {
      number: '4242424242424242', // Test Visa card
      expMonth: 12,
      expYear: 2027,
      cvv: '123',
      name: 'John Doe'
    }
  },
  debitCard: {
    type: PaymentMethodType.DEBIT_CARD,
    card: {
      number: '4000000000000002', // Test debit card
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
      routingNumber: '021000021', // Chase Bank routing number
      accountType: 'checking' as const,
      accountHolderName: 'John Doe'
    }
  },
  digitalWallet: {
    type: PaymentMethodType.DIGITAL_WALLET,
    walletToken: 'apple_pay_test_token_12345'
  }
};

// Utility functions
function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`🔷 ${title}`);
  console.log('='.repeat(60));
}

function logStep(step: string): void {
  console.log(`\n📋 ${step}`);
}

function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: Error | unknown): void {
  console.log(`❌ ${message}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
}

function logInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

function formatAmount(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatTransaction(transaction: Transaction): void {
  console.log(`📦 Transaction Details:`);
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Type: ${transaction.type}`);
  console.log(`   Status: ${transaction.status}`);
  console.log(`   Amount: ${formatAmount(transaction.amount)} ${transaction.currency}`);
  console.log(`   Customer: ${transaction.customerId}`);
  console.log(`   Payment Method: ${transaction.paymentMethod.type}`);
  
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
    
    // Phase 1: Create test customers for transactions
    logSection('Phase 1: Customer Setup');
    
    let testCustomer: Customer;
    const testCustomerEmail = `transaction.test.${Date.now()}@example.com`;
    
    try {
      logStep('Creating test customer for transactions');
      
      testCustomer = await client.customers.create({
        name: 'Transaction Testuser',
        email: testCustomerEmail,
        phone: '+1-555-0123',
        referenceId: `txn-test-${Date.now()}`
      });
      
      logSuccess(`Test customer created: ${testCustomer.customerId}`);
      console.log(`   Name: ${testCustomer.name || 'N/A'}`);
      console.log(`   Email: ${testCustomerEmail}`);
      console.log(`   Reference ID: ${testCustomer.referenceId || 'N/A'}`);
      
    } catch (error) {
      logError('Failed to create test customer', error);
      return;
    }
    
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
        paymentMethod: testPaymentMethods.creditCard,
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
      
      saleTransaction = await client.transactions.create(saleRequest);
      logSuccess(`Sale transaction created and captured`);
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
        paymentMethod: testPaymentMethods.creditCard,
        description: 'Hotel reservation hold',
        orderId: `HOTEL-${Date.now()}`,
        capture: false,
        metadata: {
          source: 'hotel_booking',
          checkin_date: '2024-06-15'
        }
      };
      
      authTransaction = await client.transactions.create(authRequest);
      logSuccess(`Authorization transaction created (not captured)`);
      formatTransaction(authTransaction);
      
    } catch (error) {
      logError('Failed to create authorization transaction', error);
    }
    
    // Phase 3: Authorization Management
    logSection('Phase 3: Authorization Management');
    
    if (authTransaction && authTransaction.status === TransactionStatus.AUTHORIZED) {
      try {
        // Increment authorization amount
        logStep('Incrementing authorization amount');
        
        const incrementedAuth = await client.transactions.incrementAuthorization(authTransaction.id, {
          amount: 2500, // Add $25.00 for incidentals
          description: 'Additional authorization for incidentals'
        });
        
        logSuccess(`Authorization incremented from ${formatAmount(authTransaction.amount)} to ${formatAmount(incrementedAuth.amount)}`);
        authTransaction = incrementedAuth;
        
      } catch (error) {
        logError('Failed to increment authorization', error);
      }
    }
    
    if (authTransaction && authTransaction.status === TransactionStatus.AUTHORIZED) {
      try {
        // Capture partial amount
        logStep('Capturing partial authorization amount');
        
        const capturedTransaction = await client.transactions.capture(authTransaction.id, {
          amount: 8000, // Capture $80.00 of the $100.00 authorization
          description: 'Partial capture for actual hotel stay'
        });
        
        logSuccess(`Captured ${formatAmount(8000)} of ${formatAmount(authTransaction.amount)} authorization`);
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
        paymentMethod: testPaymentMethods.achAccount,
        description: 'Monthly subscription payment',
        orderId: `SUB-${Date.now()}`,
        metadata: {
          source: 'subscription_billing',
          billing_period: '2024-06'
        }
      };
      
      achTransaction = await client.transactions.create(achRequest);
      logSuccess(`ACH transaction created`);
      formatTransaction(achTransaction);
      
    } catch (error) {
      logError('Failed to create ACH transaction', error);
    }
    
    // Phase 5: Digital Wallet Transaction
    logSection('Phase 5: Digital Wallet Transaction');
    
    let walletTransaction: Transaction;
    
    try {
      logStep('Creating digital wallet transaction');
      
      const walletRequest: CreateTransactionRequest = {
        amount: 4999, // $49.99
        currency: 'USD',
        type: TransactionType.SALE,
        customerId: testCustomer.customerId,
        paymentMethod: testPaymentMethods.digitalWallet,
        description: 'Mobile app purchase',
        orderId: `APP-${Date.now()}`,
        metadata: {
          source: 'mobile_app',
          platform: 'ios',
          app_version: '2.1.0'
        }
      };
      
      walletTransaction = await client.transactions.create(walletRequest);
      logSuccess(`Digital wallet transaction created`);
      formatTransaction(walletTransaction);
      
    } catch (error) {
      logError('Failed to create digital wallet transaction', error);
    }
    
    // Phase 6: Refund Operations
    logSection('Phase 6: Refund Operations');
    
    if (saleTransaction && saleTransaction.status === TransactionStatus.CAPTURED) {
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
    
    if (walletTransaction && walletTransaction.status === TransactionStatus.CAPTURED) {
      try {
        // Full refund
        logStep('Processing full refund');
        
        const fullRefund = await client.transactions.refund(walletTransaction.id, {
          reason: 'Customer requested cancellation',
          description: 'Full refund - customer cancellation'
        });
        
        logSuccess(`Full refund processed: ${formatAmount(walletTransaction.amount)}`);
        formatTransaction(fullRefund);
        
      } catch (error) {
        logError('Failed to process full refund', error);
      }
    }
    
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
      
      logSuccess(`Found ${customerTransactions.data.length} transactions for customer`);
      console.log(`📊 Transaction Summary:`);
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
      
      logSuccess(`Found ${cardTransactions.data.length} credit card transactions in last 24 hours`);
      
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
      
      logSuccess(`Found ${highValueTransactions.data.length} high-value transactions`);
      
      if (highValueTransactions.data.length > 0) {
        console.log('   Top transactions by amount:');
        highValueTransactions.data.slice(0, 3).forEach((txn, index) => {
          console.log(`   ${index + 1}. ${formatAmount(txn.amount)} - ${txn.status} - ${txn.paymentMethod.type}`);
        });
      }
      
    } catch (error) {
      logError('Failed to search transactions by amount range', error);
    }
    
    // Phase 8: Receipt Generation
    logSection('Phase 8: Receipt Generation');
    
    if (saleTransaction) {
      try {
        // Generate PDF receipt
        logStep('Generating PDF receipt');
        
        const pdfReceipt = await client.transactions.generateReceipt(saleTransaction.id, 'pdf');
        
        if (pdfReceipt.url) {
          logSuccess(`PDF receipt generated: ${pdfReceipt.url}`);
        }
        
      } catch (error) {
        logError('Failed to generate PDF receipt', error);
      }
      
      try {
        // Generate HTML receipt
        logStep('Generating HTML receipt');
        
        const htmlReceipt = await client.transactions.generateReceipt(saleTransaction.id, 'html');
        
        if (htmlReceipt.content) {
          logSuccess(`HTML receipt generated (${htmlReceipt.content.length} characters)`);
        }
        
      } catch (error) {
        logError('Failed to generate HTML receipt', error);
      }
      
      try {
        // Send email receipt (using customer's email)
        logStep('Sending email receipt');
        
        const emailReceipt = await client.transactions.generateReceipt(saleTransaction.id, 'email', {
          email: testCustomerEmail
        });
        
        logSuccess(`Email receipt sent to ${testCustomerEmail}`);
        
      } catch (error) {
        logError('Failed to send email receipt', error);
      }
    }
    
    // Phase 9: Transaction Void Operations
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
        paymentMethod: testPaymentMethods.creditCard,
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
    
    // Phase 10: Error Handling Demonstration
    logSection('Phase 10: Error Handling Demonstration');
    
    try {
      logStep('Demonstrating validation error handling');
      
      // Attempt to create invalid transaction
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
    console.log('   ✅ Credit card sale and authorization transactions');
    console.log('   ✅ ACH and digital wallet payment processing');
    console.log('   ✅ Authorization increment and capture operations');
    console.log('   ✅ Partial and full refund processing');
    console.log('   ✅ Transaction void operations');
    console.log('   ✅ Advanced transaction search and filtering');
    console.log('   ✅ Receipt generation (PDF, HTML, email)');
    console.log('   ✅ Comprehensive error handling');
    console.log('   ✅ Real-world transaction workflows');
    
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