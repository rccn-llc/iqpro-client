import { createHmac, timingSafeEqual } from 'crypto';
import { ValidationError, IQProError } from '../lib/errors';

export interface WebhookHeaders {
  'x-iqpro-signature'?: string;
  'x-iqpro-timestamp'?: string;
  'content-type'?: string;
}

export interface WebhookValidationOptions {
  /** Webhook secret provided by IQ Pro+ */
  secret: string;
  /** Maximum age of webhook in seconds (default: 300 = 5 minutes) */
  toleranceSeconds?: number;
  /** Custom timestamp for testing purposes */
  currentTimestamp?: number;
}

export interface WebhookValidationResult {
  isValid: boolean;
  timestamp: number;
  errors: string[];
}

/**
 * Production webhook validation for IQ Pro+ webhooks
 * 
 * Validates webhook signatures and timestamps to ensure authenticity
 * and prevent replay attacks. Uses HMAC-SHA256 for signature verification.
 * 
 * @example
 * ```typescript
 * const validator = new WebhookValidator({
 *   secret: process.env.IQPRO_WEBHOOK_SECRET!
 * });
 * 
 * // In your webhook handler
 * const result = validator.validateWebhook(req.body, req.headers);
 * if (!result.isValid) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * 
 * // Process the validated webhook
 * const webhook = JSON.parse(req.body);
 * ```
 */
export class WebhookValidator {
  private secret: string;
  private toleranceSeconds: number;

  constructor(options: WebhookValidationOptions) {
    this.secret = options.secret;
    this.toleranceSeconds = options.toleranceSeconds || 300; // 5 minutes default
    
    if (!this.secret || this.secret.trim().length === 0) {
      throw new ValidationError('Webhook secret is required');
    }
  }

  /**
   * Validate a webhook request signature and timestamp
   * 
   * @param payload - Raw webhook payload (string)
   * @param headers - Request headers containing signature and timestamp
   * @param options - Optional validation options
   * @returns Validation result with success status and any errors
   */
  validateWebhook(
    payload: string | Buffer,
    headers: WebhookHeaders,
    options?: { currentTimestamp?: number }
  ): WebhookValidationResult {
    const errors: string[] = [];
    const currentTime = options?.currentTimestamp || Math.floor(Date.now() / 1000);

    // Convert payload to string if it's a Buffer
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

    // Extract headers
    const signature = headers['x-iqpro-signature'];
    const timestampHeader = headers['x-iqpro-timestamp'];

    // Validate required headers
    if (!signature) {
      errors.push('Missing x-iqpro-signature header');
    }

    if (!timestampHeader) {
      errors.push('Missing x-iqpro-timestamp header');
    }

    if (errors.length > 0) {
      return { isValid: false, timestamp: 0, errors };
    }

    // Parse and validate timestamp
    const timestamp = parseInt(timestampHeader!, 10);
    if (isNaN(timestamp)) {
      errors.push('Invalid timestamp format');
      return { isValid: false, timestamp: 0, errors };
    }

    // Check timestamp age (prevent replay attacks)
    const age = currentTime - timestamp;
    if (age > this.toleranceSeconds) {
      errors.push(`Webhook timestamp too old (${age}s > ${this.toleranceSeconds}s)`);
    }

    if (age < -this.toleranceSeconds) {
      errors.push(`Webhook timestamp too far in future (${Math.abs(age)}s > ${this.toleranceSeconds}s)`);
    }

    // Validate signature
    if (!this.verifySignature(payloadString, timestamp, signature!)) {
      errors.push('Invalid webhook signature');
    }

    return {
      isValid: errors.length === 0,
      timestamp,
      errors
    };
  }

  /**
   * Verify HMAC-SHA256 signature
   * 
   * @param payload - Raw webhook payload
   * @param timestamp - Webhook timestamp
   * @param signature - Signature from headers
   * @returns true if signature is valid
   */
  private verifySignature(payload: string, timestamp: number, signature: string): boolean {
    try {
      // Create the signed payload (timestamp + payload)
      const signedPayload = `${timestamp}.${payload}`;
      
      // Generate expected signature
      const expectedSignature = createHmac('sha256', this.secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
      
      // Expected format: "sha256=<hex>"
      const expectedHeader = `sha256=${expectedSignature}`;
      
      // Use timing-safe comparison to prevent timing attacks
      return this.timingSafeCompare(signature, expectedHeader);
    } catch (error) {
      return false;
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   * 
   * @param provided - Signature from request
   * @param expected - Expected signature
   * @returns true if strings match
   */
  private timingSafeCompare(provided: string, expected: string): boolean {
    try {
      // Convert strings to buffers for comparison
      const providedBuffer = Buffer.from(provided, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      
      // Buffers must be same length for timingSafeEqual
      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return timingSafeEqual(providedBuffer, expectedBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a test webhook signature for development/testing
   * 
   * @param payload - Webhook payload
   * @param timestamp - Timestamp (defaults to current time)
   * @returns Object with signature and timestamp headers
   */
  createTestSignature(payload: string, timestamp?: number): { signature: string; timestamp: string } {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const signedPayload = `${ts}.${payload}`;
    
    const signature = createHmac('sha256', this.secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    return {
      signature: `sha256=${signature}`,
      timestamp: ts.toString()
    };
  }
}

/**
 * Convenience function to validate a webhook with error throwing
 * 
 * @param payload - Raw webhook payload
 * @param headers - Request headers
 * @param secret - Webhook secret
 * @param toleranceSeconds - Maximum age tolerance (default: 300)
 * @throws {ValidationError} if validation fails
 * @returns Parsed webhook timestamp if validation succeeds
 */
export function validateWebhookOrThrow(
  payload: string | Buffer,
  headers: WebhookHeaders,
  secret: string,
  toleranceSeconds = 300
): number {
  const validator = new WebhookValidator({ secret, toleranceSeconds });
  const result = validator.validateWebhook(payload, headers);
  
  if (!result.isValid) {
    throw new ValidationError(`Webhook validation failed: ${result.errors.join(', ')}`);
  }
  
  return result.timestamp;
}