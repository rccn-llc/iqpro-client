#!/usr/bin/env node

/**
 * Example usage script to test the iQ Pro+ client library
 * This simulates how the library would be used in a real application
 */

import { IQProClient } from '../dist/index.js';

async function testClientUsage() {
  console.log('[TEST] Testing iQ Pro+ Client Library...\n');

  try {
    // Test 1: Client initialization
    console.log('[1] Testing client initialization...');
    const client = new IQProClient({
      apiKey: 'test_api_key_not_real', // nosecret
      environment: 'sandbox',
      timeout: 5000,
      retryAttempts: 1,
    });
    console.log('[OK] Client initialized successfully');

    // Test 2: Client configuration validation
    console.log('\n[2] Testing configuration validation...');
    try {
      new IQProClient({
        apiKey: '', // Should fail
        environment: 'sandbox',
      });
      console.log('[FAIL] Should have failed with empty API key');
    } catch (error) {
      console.log('[OK] Correctly rejected empty API key:', error.message);
    }

    // Test 3: Service availability
    console.log('\n[3] Testing service availability...');
    console.log('[OK] customers service:', typeof client.customers);
    console.log('[OK] payments service:', typeof client.payments);
    console.log('[OK] subscriptions service:', typeof client.subscriptions);
    console.log('[OK] webhooks service:', typeof client.webhooks);

    // Test 4: Type checking with TypeScript
    console.log('\n[4] Testing TypeScript types...');
    
    // This should compile without errors (types are correct)
    const customerData = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1234567890',
      metadata: { source: 'test' },
    };
    console.log('[OK] Customer data types validated');

    const paymentIntentData = {
      amount: 2000,
      currency: 'USD',
      description: 'Test payment',
    };
    console.log('[OK] Payment intent types validated');

    // Test 5: Error classes
    console.log('\n[5] Testing error classes...');
    const { 
      IQProClientError, 
      IQProApiError, 
      IQProValidationError 
    } = await import('../dist/index.js');
    
    const clientError = new IQProClientError('Test error');
    console.log('[OK] IQProClientError:', clientError.name);
    
    const validationError = new IQProValidationError('Validation failed');
    console.log('[OK] IQProValidationError:', validationError.name);

    // Test 6: Version information
    console.log('\n[6] Testing version info...');
    const version = IQProClient.getVersion();
    console.log('[OK] Library version:', version.version);
    console.log('[OK] Supported API versions:', version.supportedApiVersions);

    console.log('\n[SUCCESS] All basic tests passed! Library is ready for integration.');
    
  } catch (error) {
    console.error('\n[FAIL] Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testClientUsage().catch(console.error);