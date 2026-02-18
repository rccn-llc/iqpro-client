import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenizationService } from '../src/services/TokenizationService';
import type { IQProConfig } from '../src/types/Config';
import type { ApiClient } from '../src/lib/ApiClient';

// Mock ApiClient
vi.mock('../src/lib/ApiClient');

describe('TokenizationService', () => {
  let tokenizationService: TokenizationService;
  let mockApiClient: Partial<ApiClient>;
  let mockConfig: IQProConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox',
      timeout: 30000,
      retryAttempts: 3,
      scope: 'test-scope',
      tokenEndpoint: 'https://test.example.com/token',
      baseUrl: 'https://test.example.com/api',
    };

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    tokenizationService = new TokenizationService(mockApiClient, mockConfig);
    tokenizationService.setGatewayContext('test-gateway-123');
  });

  describe('getTokenizationConfig', () => {
    it('should retrieve tokenization configuration for gateway', async () => {
      const mockConfig = {
        statusCode: 'OK',
        statusDetails: ['Success'],
        data: {
          publicKey: 'pk_test_123456',
          iframeUrl: 'https://tokenization.iqpro.com/iframe',
          allowedDomains: ['example.com'],
          expiresAt: '2026-02-16T12:00:00Z',
        },
      };
      mockApiClient.get.mockResolvedValue(mockConfig);

      const config = await tokenizationService.getTokenizationConfig();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/gateway/test-gateway-123/tokenization'
      );
      expect(config).toEqual(mockConfig.data);
      expect(config.publicKey).toBe('pk_test_123456');
    });

    it('should throw error when gateway context not set', async () => {
      tokenizationService.clearGatewayContext();

      await expect(
        tokenizationService.getTokenizationConfig()
      ).rejects.toThrow('Gateway context is required');
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(
        tokenizationService.getTokenizationConfig()
      ).rejects.toThrow('Network error');
    });
  });

  describe('validateCardToken', () => {
    it('should validate valid card token format', () => {
      const validTokens = [
        'tok_1234567890abcdef',
        'card_abcdefghijklmnop',
        'pm_1234567890123456',
      ];

      validTokens.forEach(token => {
        expect(() => tokenizationService.validateCardToken(token)).not.toThrow();
      });
    });

    it('should throw error for invalid token format', () => {
      const invalidTokens = [
        '',
        'invalid',
        '123',
        'tok_',
        'tok_abc', // Too short
      ];

      invalidTokens.forEach(token => {
        expect(() => {
          tokenizationService.validateCardToken(token);
        }).toThrow('Invalid card token format');
      });
    });
  });

  describe('validateAchToken', () => {
    it('should validate valid ACH token format', () => {
      const validTokens = [
        'ach_1234567890abcdef',
        'ba_abcdefghijklmnop',
        'pm_ach_1234567890',
      ];

      validTokens.forEach(token => {
        expect(() => tokenizationService.validateAchToken(token)).not.toThrow();
      });
    });

    it('should throw error for invalid token format', () => {
      const invalidTokens = [
        '',
        'invalid',
        '123',
        'ach_',
        'ach_ab', // Too short
      ];

      invalidTokens.forEach(token => {
        expect(() => {
          tokenizationService.validateAchToken(token);
        }).toThrow('Invalid ACH token format');
      });
    });
  });

  describe('Card Validation', () => {
    describe('validateCardNumber', () => {
      it('should validate valid Visa card numbers', () => {
        const visaNumbers = [
          '4111111111111111',
          '4242424242424242',
          '4012888888881881',
        ];

        visaNumbers.forEach(number => {
          expect(() => {
            tokenizationService.validateCardNumber(number);
          }).not.toThrow();
        });
      });

      it('should validate valid MasterCard numbers', () => {
        const mastercardNumbers = [
          '5555555555554444',
          '5105105105105100',
          '2221000000000009',
        ];

        mastercardNumbers.forEach(number => {
          expect(() => {
            tokenizationService.validateCardNumber(number);
          }).not.toThrow();
        });
      });

      it('should validate valid Amex numbers', () => {
        const amexNumbers = [
          '378282246310005',
          '371449635398431',
        ];

        amexNumbers.forEach(number => {
          expect(() => {
            tokenizationService.validateCardNumber(number);
          }).not.toThrow();
        });
      });

      it('should fail Luhn check for invalid numbers', () => {
        const invalidNumbers = [
          '4111111111111112', // Fails Luhn
          '1234567890123456', // Fails Luhn
          '5555555555555550', // Fails Luhn
        ];

        invalidNumbers.forEach(number => {
          expect(() => {
            tokenizationService.validateCardNumber(number);
          }).toThrow('Invalid card number (failed Luhn check)');
        });
      });

      it('should reject cards with invalid length', () => {
        const invalidLengthNumbers = [
          '123',
          '12345678901',
          '12345678901234567890', // Too long
        ];

        invalidLengthNumbers.forEach(number => {
          expect(() => {
            tokenizationService.validateCardNumber(number);
          }).toThrow('Card number must be 13-19 digits');
        });
      });

      it('should reject non-numeric input', () => {
        const nonNumericInputs = [
          'abcd-efgh-ijkl-mnop',
          '4111ABCD11111111',
          '4111@111#1111$1111',
        ];

        nonNumericInputs.forEach(input => {
          expect(() => {
            tokenizationService.validateCardNumber(input);
          }).toThrow('Card number must contain only digits');
        });
      });
    });

    describe('validateExpirationDate', () => {
      it('should validate valid future expiration dates', () => {
        const validDates = [
          { month: 12, year: 2026 },
          { month: 1, year: 2027 },
          { month: 6, year: 2030 },
        ];

        validDates.forEach(({ month, year }) => {
          expect(() => {
            tokenizationService.validateExpirationDate(month, year);
          }).not.toThrow();
        });
      });

      it('should reject expired dates', () => {
        const expiredDates = [
          { month: 1, year: 2020 },
          { month: 12, year: 2023 },
          { month: 1, year: 2026 }, // Past month in current year
        ];

        expiredDates.forEach(({ month, year }) => {
          expect(() => {
            tokenizationService.validateExpirationDate(month, year);
          }).toThrow('Card has expired');
        });
      });

      it('should reject invalid month values', () => {
        const invalidMonths = [0, 13, 14, -1, 99];

        invalidMonths.forEach(month => {
          expect(() => {
            tokenizationService.validateExpirationDate(month, 2026);
          }).toThrow('Invalid expiration month (must be 1-12)');
        });
      });

      it('should reject invalid year values', () => {
        const currentYear = new Date().getFullYear();
        const invalidYears = [
          currentYear - 1,
          currentYear - 10,
          1999,
          currentYear + 21, // More than 20 years in future
        ];

        invalidYears.forEach(year => {
          expect(() => {
            tokenizationService.validateExpirationDate(12, year);
          }).toThrow();
        });
      });
    });

    describe('validateCVV', () => {
      it('should validate 3-digit CVV', () => {
        const validCVVs = ['123', '000', '999'];

        validCVVs.forEach(cvv => {
          expect(() => {
            tokenizationService.validateCVV(cvv, false);
          }).not.toThrow();
        });
      });

      it('should validate 4-digit CVV for Amex', () => {
        const validAmexCVVs = ['1234', '0000', '9999'];

        validAmexCVVs.forEach(cvv => {
          expect(() => {
            tokenizationService.validateCVV(cvv, true);
          }).not.toThrow();
        });
      });

      it('should reject invalid CVV length', () => {
        const invalidCVVs = [
          '12',     // Too short
          '12345',  // Too long
        ];

        invalidCVVs.forEach(cvv => {
          expect(() => {
            tokenizationService.validateCVV(cvv, false);
          }).toThrow('CVV must be 3 digits');
        });

        // Empty string gets different error
        expect(() => {
          tokenizationService.validateCVV('', false);
        }).toThrow('CVV cannot be empty');
      });

      it('should reject non-numeric CVV', () => {
        const invalidCVVs = ['abc', '12a', 'xxx'];

        invalidCVVs.forEach(cvv => {
          expect(() => {
            tokenizationService.validateCVV(cvv, false);
          }).toThrow('CVV must contain only digits');
        });
      });
    });
  });

  describe('ACH Validation', () => {
    describe('validateRoutingNumber', () => {
      it('should validate valid routing numbers', () => {
        const validRoutingNumbers = [
          '021000021', // Chase
          '111000025', // Wells Fargo
          '026009593', // Bank of America
        ];

        validRoutingNumbers.forEach(routing => {
          expect(() => {
            tokenizationService.validateRoutingNumber(routing);
          }).not.toThrow();
        });
      });

      it('should reject invalid routing number length', () => {
        const invalidRoutingNumbers = [
          '12345678',   // Too short
          '1234567890', // Too long
        ];

        invalidRoutingNumbers.forEach(routing => {
          expect(() => {
            tokenizationService.validateRoutingNumber(routing);
          }).toThrow('Routing number must be exactly 9 digits');
        });

        // Empty string gets different error
        expect(() => {
          tokenizationService.validateRoutingNumber('');
        }).toThrow('Routing number cannot be empty');
      });

      it('should reject non-numeric routing numbers', () => {
        const invalidRoutingNumbers = ['abcdefghi', '12345678a', '021ABCDE1'];

        invalidRoutingNumbers.forEach(routing => {
          expect(() => {
            tokenizationService.validateRoutingNumber(routing);
          }).toThrow('Routing number must contain only digits');
        });
      });

      it('should reject routing numbers that fail ABA checksum', () => {
        const invalidRoutingNumbers = [
          '123456789', // Fails ABA checksum
          '111111111', // Fails ABA checksum
        ];

        invalidRoutingNumbers.forEach(routing => {
          expect(() => {
            tokenizationService.validateRoutingNumber(routing);
          }).toThrow('Invalid routing number (failed ABA checksum)');
        });
      });
    });

    describe('validateAccountNumber', () => {
      it('should validate valid account numbers', () => {
        const validAccountNumbers = [
          '1234567890',
          '123456789012345',
          '12345678901234567',
        ];

        validAccountNumbers.forEach(account => {
          expect(() => {
            tokenizationService.validateAccountNumber(account);
          }).not.toThrow();
        });
      });

      it('should reject invalid account number length', () => {
        const invalidAccountNumbers = [
          '123',     // Too short
          '123456789012345678', // Too long (>17)
        ];

        invalidAccountNumbers.forEach(account => {
          expect(() => {
            tokenizationService.validateAccountNumber(account);
          }).toThrow('Account number must be 4-17 digits');
        });

        // Empty string gets different error
        expect(() => {
          tokenizationService.validateAccountNumber('');
        }).toThrow('Account number cannot be empty');
      });

      it('should reject non-numeric account numbers', () => {
        const invalidAccountNumbers = [
          'abcd1234567890',
          '1234ABCD5678',
          '1234@5678#90',
        ];

        invalidAccountNumbers.forEach(account => {
          expect(() => {
            tokenizationService.validateAccountNumber(account);
          }).toThrow('Account number must contain only digits');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing gateway context', async () => {
      tokenizationService.clearGatewayContext();

      await expect(
        tokenizationService.getTokenizationConfig()
      ).rejects.toThrow('Gateway context is required');
    });

    it('should provide descriptive validation errors', () => {
      expect(() => {
        tokenizationService.validateCardNumber('1234');
      }).toThrow('Card number must be 13-19 digits');

      expect(() => {
        tokenizationService.validateExpirationDate(13, 2026);
      }).toThrow('Invalid expiration month (must be 1-12)');

      expect(() => {
        tokenizationService.validateCVV('12', false);
      }).toThrow('CVV must be 3 digits');
    });
  });
});
