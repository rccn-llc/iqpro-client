import { describe, it, expect, beforeEach } from 'vitest';
import { WebhookValidator, validateWebhookOrThrow } from '../src/webhooks/WebhookValidator';
import { ValidationError } from '../src/lib/errors';
import type { WebhookHeaders } from '../src/webhooks/WebhookValidator';

describe('WebhookValidator', () => {
  let validator: WebhookValidator;
  const testSecret = 'test-webhook-secret';
  const testPayload = '{"event": "test", "data": {"id": "123"}}';
  
  beforeEach(() => {
    validator = new WebhookValidator({ secret: testSecret });
  });

  describe('constructor', () => {
    it('should create validator with secret', () => {
      expect(validator).toBeDefined();
    });

    it('should throw error for empty secret', () => {
      expect(() => {
        new WebhookValidator({ secret: '' });
      }).toThrow(ValidationError);
    });

    it('should accept custom tolerance seconds', () => {
      const customValidator = new WebhookValidator({ 
        secret: testSecret, 
        toleranceSeconds: 600 
      });
      expect(customValidator).toBeDefined();
    });
  });

  describe('webhook validation', () => {
    it('should validate correct webhook signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload, timestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp: timestamp });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBe(timestamp);
    });

    it('should reject webhook with invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'sha256=invalid-signature',
        'x-iqpro-timestamp': timestamp.toString()
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp: timestamp });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid webhook signature');
    });

    it('should reject webhook with missing signature header', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const headers: WebhookHeaders = {
        'x-iqpro-timestamp': timestamp.toString()
      };

      const result = validator.validateWebhook(testPayload, headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing x-iqpro-signature header');
    });

    it('should reject webhook with missing timestamp header', () => {
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'sha256=some-signature'
      };

      const result = validator.validateWebhook(testPayload, headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing x-iqpro-timestamp header');
    });

    it('should reject webhook with invalid timestamp format', () => {
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'sha256=some-signature',
        'x-iqpro-timestamp': 'invalid-timestamp'
      };

      const result = validator.validateWebhook(testPayload, headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid timestamp format');
    });

    it('should reject webhook with timestamp too old', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload, oldTimestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('timestamp too old'))).toBe(true);
    });

    it('should reject webhook with timestamp too far in future', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400 seconds in future
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload, futureTimestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('too far in future'))).toBe(true);
    });

    it('should handle Buffer payloads', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadBuffer = Buffer.from(testPayload, 'utf8');
      const testSig = validator.createTestSignature(testPayload, timestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      const result = validator.validateWebhook(payloadBuffer, headers, { currentTimestamp: timestamp });
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('createTestSignature', () => {
    it('should create valid test signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload, timestamp);
      
      expect(testSig.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(testSig.timestamp).toBe(timestamp.toString());
      
      // Verify the signature is valid
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };
      
      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp: timestamp });
      expect(result.isValid).toBe(true);
    });

    it('should use current timestamp when none provided', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload);
      const afterTime = Math.floor(Date.now() / 1000);
      
      const sigTimestamp = parseInt(testSig.timestamp);
      expect(sigTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(sigTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('validateWebhookOrThrow', () => {
    it('should not throw for valid webhook', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const testSig = validator.createTestSignature(testPayload, timestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      expect(() => {
        const resultTimestamp = validateWebhookOrThrow(testPayload, headers, testSecret);
        expect(resultTimestamp).toBe(timestamp);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid webhook', () => {
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'sha256=invalid-signature',
        'x-iqpro-timestamp': Math.floor(Date.now() / 1000).toString()
      };

      expect(() => {
        validateWebhookOrThrow(testPayload, headers, testSecret);
      }).toThrow(ValidationError);
    });

    it('should use custom tolerance seconds', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 100;
      const testSig = validator.createTestSignature(testPayload, oldTimestamp);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': testSig.signature,
        'x-iqpro-timestamp': testSig.timestamp
      };

      // Should not throw with high tolerance
      expect(() => {
        validateWebhookOrThrow(testPayload, headers, testSecret, 200);
      }).not.toThrow();

      // Should throw with low tolerance
      expect(() => {
        validateWebhookOrThrow(testPayload, headers, testSecret, 50);
      }).toThrow(ValidationError);
    });
  });

  describe('timing safety', () => {
    it('should handle signatures of different lengths safely', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'sha256=short',
        'x-iqpro-timestamp': timestamp.toString()
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp: timestamp });
      expect(result.isValid).toBe(false);
    });

    it('should handle malformed signature format safely', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const headers: WebhookHeaders = {
        'x-iqpro-signature': 'not-sha256-format',
        'x-iqpro-timestamp': timestamp.toString()
      };

      const result = validator.validateWebhook(testPayload, headers, { currentTimestamp: timestamp });
      expect(result.isValid).toBe(false);
    });
  });
});