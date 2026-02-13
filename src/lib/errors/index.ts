export class IQProError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'IQProError';
  }
}

export class AuthenticationError extends IQProError {
  constructor(message: string, details?: string) {
    super(`Authentication failed: ${message}`, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
    if (details) {
      this.message += ` - ${details}`;
    }
  }
}

export class ConfigurationError extends IQProError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends IQProError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NetworkError extends IQProError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends NetworkError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}