/**
 * TokenizationService
 * 
 * Service for managing payment tokenization configuration with iQ Pro+ API.
 * Provides iframe configuration for PCI-compliant payment data collection.
 * 
 * **Important**: This service does NOT tokenize payment data directly.
 * Tokenization occurs client-side via the iQ Pro+ hosted iframe or mobile SDK.
 * 
 * **Workflow**:
 * 1. Get tokenization configuration (iframe setup)
 * 2. Initialize client-side iframe with configuration
 * 3. Iframe securely collects and tokenizes payment data
 * 4. Use returned token with CustomerService to save payment method
 * 
 * @see https://api.basyspro.com/iqsaas/v1/scalar/#tag/Tokenization
 */

import { BaseService } from './BaseService';
import { ApiClient } from '../lib/ApiClient';
import { IQProConfig } from '../types/Config';
import { ValidationError } from '../lib/errors';
import type { 
  TokenizationConfiguration,
  TokenizationConfigurationResponse 
} from '../types/Customer';

export class TokenizationService extends BaseService {
  constructor(apiClient: ApiClient, config: IQProConfig) {
    super(apiClient, config);
  }

  /**
   * Get tokenization configuration for hosted iframe setup
   * 
   * Retrieves the configuration needed to initialize the iQ Pro+ hosted iframe
   * for secure client-side payment data collection and tokenization.
   * 
   * **Usage**:
   * ```typescript
   * // Get configuration
   * const config = await client.tokenization.getConfiguration();
   * 
   * // Initialize iframe (client-side JavaScript)
   * // Using the config.data.iframeConfiguration.iqProV2 values
   * const iframe = new TokenEx.Iframe({
   *   origin: config.data.iframeConfiguration.iqProV2.origin,
   *   timestamp: config.data.iframeConfiguration.iqProV2.timestamp,
   *   tokenizationId: config.data.iframeConfiguration.iqProV2.tokenizationId,
   *   // ... other config values
   * });
   * 
   * // When iframe returns token:
   * await client.customers.createPaymentMethod(customerId, {
   *   tokenizedCard: {
   *     cardToken: tokenFromIframe,
   *     cardHolderName: 'John Doe',
   *     expirationMonth: 12,
   *     expirationYear: 2025
   *   }
   * });
   * ```
   * 
   * **Configuration Types**:
   * - `iframeConfiguration`: For web browser implementations (recommended)
   * - `mobileConfiguration`: For native mobile apps
   * - `proxyConfiguration`: For server-to-server tokenization
   * - `achConfiguration`: For ACH/bank account tokenization
   * 
   * **Security Notes**:
   * - Configuration includes authentication keys for iframe initialization
   * - Keys are scoped to your gateway and expire (check `expires` field)
   * - Never expose these keys in client-side code logs or error messages
   * - Iframe handles all PCI-sensitive data - your application never touches raw card numbers
   * 
   * @returns Promise resolving to tokenization configuration
   * @throws {IQProApiError} If API request fails
   * @throws {IQProClientError} If gateway context not set or invalid response
   * 
   * @example
   * ```typescript
   * const config = await client.tokenization.getConfiguration();
   * 
   * // Check configuration type available
   * if (config.data.iframeConfiguration?.iqProV2) {
   *   const iframeConfig = config.data.iframeConfiguration.iqProV2;
   *   console.log('Tokenization origin:', iframeConfig.origin);
   *   console.log('Expires at:', iframeConfig.expires);
   * }
   * 
   * // For mobile apps
   * if (config.data.mobileConfiguration?.iqProV2) {
   *   const mobileConfig = config.data.mobileConfiguration.iqProV2;
   *   // Initialize mobile SDK with mobileConfig
   * }
   * ```
   */
  async getConfiguration(): Promise<TokenizationConfiguration> {
    // Build API path (buildPath validates gateway context)
    const path = this.buildPath('/tokenization');

    // Make GET request
    const response = await this.apiClient.get<TokenizationConfigurationResponse>(path);

    // Handle API response wrapper and extract data
    // The API returns TokenizationConfigurationResponse which has {statusCode, statusDetails, data}
    // handleResponse checks if response has 'data' property and returns response.data
    const tokenizationConfig = this.handleResponse<TokenizationConfigurationResponse>(response);

    // handleResponse returns response.data, which is {statusCode, statusDetails, data}
    // We need to extract the data property
    if (!tokenizationConfig || typeof tokenizationConfig !== 'object') {
      throw new ValidationError(
        'Tokenization configuration not found in API response'
      );
    }

    // If tokenizationConfig has a data property, return it; otherwise return tokenizationConfig itself
    // This handles both ApiResponse<TokenizationConfigurationResponse> and TokenizationConfigurationResponse
    if ('data' in tokenizationConfig && tokenizationConfig.data) {
      return tokenizationConfig.data;
    }

    // If no nested data property, validate it has TokenizationConfiguration structure
    // Cast to unknown first to satisfy TypeScript's strict type checking
    const config = tokenizationConfig as unknown;
    
    // Runtime validation that this is actually TokenizationConfiguration
    if (typeof config !== 'object' || config === null) {
      throw new ValidationError(
        'Invalid tokenization configuration structure in API response'
      );
    }

    return config as TokenizationConfiguration;
  }

  /**
   * Get iframe-specific configuration (convenience method)
   * 
   * Extracts just the iframe configuration from the full tokenization config.
   * Useful when you only need iframe setup and want cleaner code.
   * 
   * @returns Promise resolving to iframe configuration or null if not available
   * @throws {IQProApiError} If API request fails
   * 
   * @example
   * ```typescript
   * const iframeConfig = await client.tokenization.getIframeConfiguration();
   * if (iframeConfig?.iqProV2) {
   *   // Initialize iframe with iframeConfig.iqProV2
   * } else {
   *   console.error('Iframe tokenization not configured for this gateway');
   * }
   * ```
   */
  async getIframeConfiguration() {
    const config = await this.getConfiguration();
    return config.iframeConfiguration || null;
  }

  /**
   * Check if tokenization is configured for this gateway
   * 
   * Verifies that tokenization is set up and available.
   * Useful for validation before attempting to collect payment data.
   * 
   * @returns Promise resolving to object with tokenization availability flags
   * @throws {IQProApiError} If API request fails
   * 
   * @example
   * ```typescript
   * const availability = await client.tokenization.checkAvailability();
   * 
   * if (availability.card && availability.iframe) {
   *   // Show credit card form with iframe
   * } else if (availability.card && availability.proxy) {
   *   // Use server-to-server tokenization
   * } else {
   *   // Tokenization not configured
   *   throw new Error('Credit card payments not available');
   * }
   * ```
   */
  async checkAvailability(): Promise<{
    card: boolean;
    ach: boolean;
    iframe: boolean;
    mobile: boolean;
    proxy: boolean;
  }> {
    const config = await this.getConfiguration();
    
    return {
      card: !!config.cardTokenizer,
      ach: !!config.achTokenizer,
      iframe: !!config.iframeConfiguration,
      mobile: !!config.mobileConfiguration,
      proxy: !!config.proxyConfiguration,
    };
  }

  /**
   * Validate a masked card number format
   * 
   * Validates that a masked card number matches the required format for the API.
   * Format: ^\\d{6,8}\\*{4,9}\\d{4}$ (e.g., "424242******4242")
   * 
   * **Note**: This validation is performed client-side. The API will also validate.
   * 
   * @param maskedNumber - The masked card number to validate
   * @returns True if format is valid, false otherwise
   * 
   * @example
   * ```typescript
   * const isValid = client.tokenization.validateMaskedCardNumber('424242******4242');
   * console.log(isValid); // true
   * 
   * const invalid = client.tokenization.validateMaskedCardNumber('4242-****-4242');
   * console.log(invalid); // false (hyphens not allowed)
   * ```
   */
  validateMaskedCardNumber(maskedNumber: string): boolean {
    // API requires format: ^\\d{6,8}\\*{4,9}\\d{4}$
    // 6-8 digits, 4-9 asterisks, last 4 digits
    const pattern = /^\d{6,8}\*{4,9}\d{4}$/;
    return pattern.test(maskedNumber);
  }

  /**
   * Generate a masked card number from a full card number
   * 
   * Creates a masked version of a card number following the API's required format.
   * This is useful for display purposes when you have the full card number available
   * (e.g., in testing scenarios).
   * 
   * **Security Warning**: Never use this with real card numbers in production.
   * In production, the iframe returns the masked number automatically.
   * 
   * @param cardNumber - Full card number (13-19 digits)
   * @returns Masked card number in format "424242******4242"
   * @throws {Error} If card number is invalid length
   * 
   * @example
   * ```typescript
   * // For testing/development only
   * const masked = client.tokenization.generateMaskedCardNumber('4242424242424242');
   * console.log(masked); // "424242******4242"
   * 
   * // Shorter card number (Amex)
   * const amex = client.tokenization.generateMaskedCardNumber('378282246310005');
   * console.log(amex); // "378282***0005"
   * ```
   */
  generateMaskedCardNumber(cardNumber: string): string {
    // Remove any spaces or dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Validate length (credit cards are 13-19 digits)
    if (cleaned.length < 13 || cleaned.length > 19) {
      throw new Error(`Invalid card number length: ${cleaned.length}. Must be 13-19 digits.`);
    }
    
    // Validate all digits
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Card number must contain only digits');
    }
    
    // Extract first 6 and last 4
    const first6 = cleaned.slice(0, 6);
    const last4 = cleaned.slice(-4);
    
    // Calculate middle section (4-9 asterisks based on total length)
    const middleLength = cleaned.length - 10;
    const asterisks = '*'.repeat(Math.max(4, Math.min(9, middleLength)));
    
    return `${first6}${asterisks}${last4}`;
  }

  /**
   * Validate card token format
   * 
   * Validates that a token matches expected tokenization formats.
   * Tokens typically start with prefixes like 'tok_', 'card_', or 'pm_'.
   * 
   * @param token - The card token to validate
   * @throws {Error} If token format is invalid
   */
  validateCardToken(token: string): void {
    if (!token || token.length < 8) {
      throw new Error('Invalid card token format: Token is too short');
    }
    
    // Tokens typically match patterns like tok_xxx, card_xxx, pm_xxx
    const tokenPattern = /^(tok_|card_|pm_)[a-zA-Z0-9_-]{8,}$/;
    if (!tokenPattern.test(token)) {
      throw new Error('Invalid card token format');
    }
  }

  /**
   * Validate ACH token format
   * 
   * Validates that a token matches expected ACH tokenization formats.
   * 
   * @param token - The ACH token to validate
   * @throws {Error} If token format is invalid
   */
  validateAchToken(token: string): void {
    if (!token || token.length < 8) {
      throw new Error('Invalid ACH token format: Token is too short');
    }
    
    // ACH tokens typically match patterns like ach_xxx, ba_xxx, pm_ach_xxx
    const tokenPattern = /^(ach_|ba_|pm_ach_)[a-zA-Z0-9_-]{8,}$/;
    if (!tokenPattern.test(token)) {
      throw new Error('Invalid ACH token format');
    }
  }

  /**
   * Validate card number using Luhn algorithm
   * 
   * Client-side validation for card numbers before tokenization.
   * Useful for providing immediate feedback to users.
   * 
   * @param cardNumber - The card number to validate (digits only)
   * @throws {Error} If card number is invalid
   */
  validateCardNumber(cardNumber: string): void {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Check for empty string
    if (!cleaned || cleaned.length === 0) {
      throw new Error('Card number cannot be empty');
    }
    
    // Check if only digits
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Card number must contain only digits');
    }
    
    // Check length (13-19 digits for credit cards)
    if (cleaned.length < 13 || cleaned.length > 19) {
      throw new Error('Card number must be 13-19 digits');
    }
    
    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      // We've already validated cleaned is all digits with correct length
      let digit = parseInt(cleaned[i]!, 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      throw new Error('Invalid card number (failed Luhn check)');
    }
  }

  /**
   * Validate card expiration date
   * 
   * Checks that expiration date is valid and not expired.
   * 
   * @param month - Expiration month (1-12)
   * @param year - Expiration year (4 digits)
   * @throws {Error} If expiration date is invalid or expired
   */
  validateExpirationDate(month: number, year: number): void {
    // Validate month range
    if (month < 1 || month > 12) {
      throw new Error('Invalid expiration month (must be 1-12)');
    }
    
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Check if card is expired (do this before future year check)
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new Error('Card has expired');
    }
    
    // Check year is not too far in future
    if (year > currentYear + 20) {
      throw new Error('Invalid expiration year');
    }
  }

  /**
   * Validate CVV/CVC code
   * 
   * Validates CVV format (3 digits for most cards, 4 for Amex).
   * 
   * @param cvv - The CVV code
   * @param isAmex - Whether this is an Amex card (4-digit CVV)
   * @throws {Error} If CVV format is invalid
   */
  validateCVV(cvv: string, isAmex: boolean = false): void {
    // Check for empty string
    if (!cvv || cvv.length === 0) {
      throw new Error('CVV cannot be empty');
    }
    
    // Check if only digits
    if (!/^\d+$/.test(cvv)) {
      throw new Error('CVV must contain only digits');
    }
    
    // Check length
    const expectedLength = isAmex ? 4 : 3;
    if (cvv.length !== expectedLength) {
      throw new Error(`CVV must be ${expectedLength} digits${isAmex ? ' for Amex' : ''}`);
    }
  }

  /**
   * Validate ACH routing number using ABA checksum
   * 
   * Validates US bank routing numbers (ABA routing transit numbers).
   * 
   * @param routingNumber - The 9-digit routing number
   * @throws {Error} If routing number is invalid
   */
  validateRoutingNumber(routingNumber: string): void {
    // Remove spaces and dashes
    const cleaned = routingNumber.replace(/[\s-]/g, '');
    
    // Check for empty string
    if (!cleaned || cleaned.length === 0) {
      throw new Error('Routing number cannot be empty');
    }
    
    // Check if only digits
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Routing number must contain only digits');
    }
    
    // Must be exactly 9 digits
    if (cleaned.length !== 9) {
      throw new Error('Routing number must be exactly 9 digits');
    }
    
    // ABA routing number checksum validation
    // We've validated cleaned is exactly 9 digits
    const digits = cleaned.split('').map(Number);
    const checksum = (
      3 * (digits[0]! + digits[3]! + digits[6]!) +
      7 * (digits[1]! + digits[4]! + digits[7]!) +
      (digits[2]! + digits[5]! + digits[8]!)
    ) % 10;
    
    if (checksum !== 0) {
      throw new Error('Invalid routing number (failed ABA checksum)');
    }
  }

  /**
   * Validate ACH account number
   * 
   * Validates format of bank account numbers (4-17 digits).
   * 
   * @param accountNumber - The account number
   * @throws {Error} If account number is invalid
   */
  validateAccountNumber(accountNumber: string): void {
    // Remove spaces and dashes
    const cleaned = accountNumber.replace(/[\s-]/g, '');
    
    // Check for empty string
    if (!cleaned || cleaned.length === 0) {
      throw new Error('Account number cannot be empty');
    }
    
    // Check if only digits
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Account number must contain only digits');
    }
    
    // Check length (typically 4-17 digits)
    if (cleaned.length < 4 || cleaned.length > 17) {
      throw new Error('Account number must be 4-17 digits');
    }
  }

  /**
   * Get tokenization configuration for gateway (alias for getConfiguration)
   * 
   * @deprecated Use getConfiguration() instead
   */
  async getTokenizationConfig(): Promise<TokenizationConfiguration> {
    return this.getConfiguration();
  }
}

