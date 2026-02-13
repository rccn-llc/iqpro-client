/**
 * Service modules for IQ Pro+ Client
 * 
 * This module exports all service classes that provide high-level
 * API interactions built on the OAuth-authenticated HTTP client.
 */

// Base service class
export { BaseService } from './BaseService';

// Domain-specific services
export { CustomerService } from './CustomerService';
export { SubscriptionService } from './SubscriptionService';
export { TransactionService } from './TransactionService';

// Default exports for convenience
export { default as Customer } from './CustomerService';
export { default as Subscription } from './SubscriptionService';
export { default as Transaction } from './TransactionService';