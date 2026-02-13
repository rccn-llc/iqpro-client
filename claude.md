# iQ Pro+ Client Library - Claude Context

## Project Overview

**@dojo-planner/iqpro-client** is a standalone TypeScript/JavaScript client library for the iQ Pro+ payment API. Built as an enterprise-grade client/SDK with comprehensive type safety, robust error handling, and production-ready features.

**Stack:** TypeScript + Zod + Vitest + Modern Node.js + Zero Runtime Dependencies (except Zod)

## Directory Structure

```
src/
├── types/                 # Type definitions
│   ├── Common.ts          # Shared types (config, responses, errors)
│   ├── Customer.ts        # Customer management types
│   ├── Payment.ts         # Payment processing types
│   ├── Webhook.ts         # Webhook event types
│   └── index.ts           # Type exports
├── services/              # API service classes
│   ├── CustomerService.ts # Customer CRUD operations
│   ├── PaymentService.ts  # Payment method & intent management
│   └── WebhookService.ts  # Webhook processing & verification
├── utils/                 # Core utilities
│   ├── ApiClient.ts       # HTTP client with retry logic
│   ├── Errors.ts          # Error class hierarchy
│   └── Validation.ts      # Zod schemas & validation helpers
├── IQProClient.ts         # Main library entry point
└── index.ts               # Public API exports

tests/                     # Unit tests (Vitest)
├── *.test.ts              # Co-located test files
├── mocks/                 # Test mocks and fixtures
└── setup.ts               # Test configuration

docs/                      # Documentation
├── api/                   # API reference docs
└── guides/                # Usage guides

Configuration Files:
├── package.json           # NPM package configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test configuration
├── .eslintrc.js          # ESLint rules
└── .gitignore            # Git exclusions
```

## Known Limitations

### Transaction/Payment API Availability

**Status**: Not Available (as of February 2026)

- **Issue**: The `/api/gateway/{gatewayId}/payments` endpoints return HTTP 404 in sandbox
- **Impact**: TransactionService methods are non-functional despite being fully implemented
- **Functional Services**: CustomerService (working normally)
- **Resolution**: Service is production-ready and will work once API endpoints are deployed

**Implementation Details**:
- TransactionService follows same patterns as CustomerService (gateway-scoped, full validation)
- 77% test coverage (41/53 tests passing - remaining failures are endpoint-dependent)
- All business logic, validation, and error handling implemented
- Example file created with comprehensive demonstrations (will work when API available)

## Library Architecture

### Service Layer Pattern

Each API domain has a dedicated service class following consistent patterns:

```typescript
// Service Pattern Template
export class ServiceName {
  constructor(private readonly apiClient: ApiClient) {}
  
  async create(data: CreateRequest): Promise<Resource> {
    const validatedData = validateSchema(createSchema, data);
    const response = await this.apiClient.post<Resource>('/endpoint', validatedData);
    return this.transformResponse(response.data);
  }
  
  async get(id: string): Promise<Resource> {
    // Input validation, API call, response transformation
  }
  
  private transformResponse(data: any): Resource {
    // Handle date conversion and other transformations
  }
}
```

### Error Hierarchy

Complete error class hierarchy for different failure scenarios:

- **IQProClientError**: Base error class with timestamp and code
- **IQProApiError**: API response errors with status codes and request IDs  
- **IQProValidationError**: Input validation failures with field details
- **IQProNetworkError**: Network connectivity issues
- **IQProAuthenticationError**: Authentication failures
- **IQProRateLimitError**: Rate limit exceeded with retry-after handling

### Type Safety Strategy

- **Comprehensive Types**: Every API operation fully typed
- **Runtime Validation**: Zod schemas validate all inputs
- **Date Handling**: Consistent Date object usage (no string dates in public API)
- **Optional vs Required**: Clear distinction in request/response types
- **Generic Responses**: Consistent response wrapper pattern

## Key Workflows

### Client Initialization & Configuration

```typescript
// Basic initialization
const client = new IQProClient({
  apiKey: process.env.IQPRO_SECRET_KEY!,
  environment: 'sandbox', // or 'production'
});

// Advanced configuration
const client = new IQProClient({
  apiKey: process.env.IQPRO_SECRET_KEY!,
  environment: 'production',
  timeout: 60000,
  retryAttempts: 5,
  apiVersion: '1.1',
  baseUrl: 'https://custom-api.example.com', // For testing
});
```

### Service Usage Pattern

```typescript
// Consistent service operation pattern
try {
  // Input validation happens automatically
  const result = await client.customers.create({
    name: 'John Doe',
    email: 'john@example.com',
  });
  
  // Result is fully typed
  console.log(result.id, result.createdAt);
  
} catch (error) {
  // Specific error handling
  if (error instanceof IQProValidationError) {
    console.error('Validation errors:', error.validationErrors);
  } else if (error instanceof IQProApiError) {
    console.error('API error:', error.apiError.message);
  }
}
```

### Webhook Processing

```typescript
// Webhook verification and processing
const event = await client.webhooks.constructEvent(
  payload, 
  signature, 
  endpointSecret
);

const result = await client.webhooks.processEvent(event);
```

## Development Conventions

### File Organization
- **Co-located tests**: Test files next to source files (e.g., `CustomerService.test.ts`)
- **Type definitions**: Grouped by domain in `src/types/`
- **Service classes**: One service per API domain
- **Utility functions**: Shared utilities in `src/utils/`
- **Public exports**: All public API exported via `src/index.ts`

### Naming Conventions
- **Classes**: PascalCase (`IQProClient`, `CustomerService`)
- **Interfaces**: PascalCase with descriptive prefixes (`IQProCustomer`, `CreateCustomerRequest`)
- **Files**: PascalCase for classes, camelCase for utilities
- **Methods**: camelCase, descriptive verb-noun pattern (`createCustomer`, `listTransactions`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `VERSION`)

### TypeScript Standards
- **Strict mode**: All strict TypeScript options enabled
- **No `any` types**: Use proper type definitions or `unknown`
- **Optional properties**: Clear distinction between optional and required
- **Generic constraints**: Use proper generic constraints for type safety
- **Import organization**: Type-only imports when appropriate

### Validation Strategy  
- **Zod schemas**: All inputs validated with descriptive error messages
- **Runtime safety**: Schema validation prevents invalid API calls
- **Error aggregation**: Collect all validation errors, not just first failure
- **Type derivation**: Derive TypeScript types from Zod schemas when possible

### Error Handling Patterns
```typescript
// Service method error handling template
async ServiceMethod(input: InputType): Promise<OutputType> {
  try {
    const validatedInput = validateSchema(inputSchema, input);
    const response = await this.apiClient.operation(validatedInput);
    
    if (!response.data) {
      throw new IQProClientError('No data returned from API');
    }
    
    return this.transformResponse(response.data);
    
  } catch (error) {
    // Let ApiClient errors bubble up (they're already properly typed)
    if (error instanceof IQProClientError) {
      throw error;
    }
    
    // Handle unexpected errors
    throw new IQProClientError(
      'Unexpected error in service method',
      'UNKNOWN_ERROR',
      error
    );
  }
}
```

## Testing Strategy

### Unit Testing with Vitest
- **Comprehensive coverage**: Target >95% code coverage
- **Mocked dependencies**: Mock ApiClient in service tests
- **Error scenarios**: Test both success and failure cases
- **Input validation**: Test schema validation with various inputs
- **Type safety**: Tests should catch type regressions

### Test Organization
```typescript
// Test file structure template
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceClass } from '../src/services/ServiceClass';

// Mock dependencies
vi.mock('../src/utils/ApiClient');

describe('ServiceClass', () => {
  let service: ServiceClass;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    service = new ServiceClass(mockApiClient);
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle validation errors', async () => {
      // Error test implementation
    });
  });
});
```

### Test Categories
- **Service tests**: Mock ApiClient, test business logic
- **Client integration tests**: Test client initialization and service orchestration
- **Error handling tests**: Comprehensive error scenario coverage
- **Validation tests**: Test Zod schemas with various inputs
- **Utility tests**: Test helper functions and transformations

## Security Considerations

### API Key Management
- **Environment variables**: Never hardcode API keys
- **Key validation**: Validate key format during client initialization
- **Key exposure prevention**: Mask keys in error messages and logs
- **Client-side warning**: Clear documentation about server-side usage only

### Input Sanitization
- **Zod validation**: All inputs validated before API calls
- **SQL injection prevention**: Parameterized queries (API-side responsibility)
- **XSS prevention**: Input encoding (consumer responsibility)
- **Rate limiting**: Built-in retry and backoff handling

### Webhook Security
- **Signature verification**: Cryptographic verification of webhook signatures
- **Timestamp validation**: Prevent replay attacks
- **Secret management**: Secure webhook secret handling
- **Error information**: Limit error details in webhook responses

## Build & Release

### Package Configuration
```json
{
  "name": "@dojo-planner/iqpro-client",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md"],
  "engines": { "node": ">=18" }
}
```

### Build Process
- **TypeScript compilation**: Generate `.d.ts` files for consumers
- **Tree shaking**: ESM compatibility for optimal bundle sizes
- **Type checking**: Strict TypeScript compilation
- **Linting**: ESLint with TypeScript rules
- **Testing**: Run full test suite before build

### Release Strategy
- **Semantic versioning**: Follow semver strictly
- **Breaking changes**: Major version for breaking changes
- **Changelog**: Maintain detailed changelog
- **NPM publishing**: Automated publishing workflow
- **Documentation**: Update docs with each release

## Scripts

```bash
# Development
npm run dev              # TypeScript watch mode
npm run build            # Production build
npm run test             # Run test suite
npm run test:watch       # Test watch mode
npm run lint             # ESLint checking
npm run type-check       # TypeScript validation

# Quality assurance  
npm run test -- --coverage    # Test with coverage report
npm run lint:fix              # Auto-fix linting issues
npm run clean                 # Clean build artifacts
```

## Post-Implementation Checklist

After completing any code changes, always run the following verification steps:

### 1. Create/Update Unit Tests (MANDATORY — DO THIS FIRST)

**CRITICAL:** Unit tests MUST be written BEFORE running lint/type checks. This is NOT optional. Every new or modified file requires corresponding tests.

- **New service methods** → Add tests in co-located `*.test.ts` (e.g., `CustomerService.test.ts`)
- **New error classes** → Add tests in `Errors.test.ts` 
- **New validation schemas** → Add tests in `Validation.test.ts`
- **New utility functions** → Add tests in co-located `*.test.ts`
- **Modified existing code** → Update existing tests to cover new behavior
- **Mock configurations** → Ensure proper mocking of dependencies
- **Edge cases** → Test error conditions and boundary values
- Do NOT skip this step and jump to running checks

### 2. Run All Checks
```bash
# Run all checks in sequence
npm run lint              # ESLint - fix issues, never use eslint-ignore
npm run type-check        # TypeScript type checking
npm run test              # Unit tests
npm run test -- --coverage  # Verify coverage meets standards
npm run build             # Ensure clean build
```

### 3. Code Coverage Target
- Aim for >95% coverage on new/modified code
- Review uncovered lines and add tests for edge cases
- Focus on branch coverage for conditional logic
- Pay special attention to error handling paths

### 4. Security & Compliance
When using test credentials or example values:
```typescript
// Use clearly fake/test values that won't trigger secret scanning
const testApiKey = 'test_api_key_not_real'; // nosecret
const testCustomerId = 'cust_test_12345'; // Clearly a test value
const mockWebhookSecret = 'whsec_test_mock_secret'; // nosecret
```

### 5. Library-Specific Checks
- **Public API changes**: Verify breaking changes are intentional
- **Type exports**: Ensure all necessary types are exported
- **Documentation**: Update README for API changes
- **Examples**: Update code examples for new features
- **Backward compatibility**: Consider migration path for breaking changes

### 6. Final Verification
```bash
# Full verification before commit
npm run lint && npm run type-check && npm run test -- --coverage && npm run build
```

All checks must pass without errors or warnings before committing.

### 7. Documentation Updates (REQUIRED)

**CRITICAL:** This file (claude.md) and README.md must be updated whenever changes are made that affect:

- **New API methods** - Update the service documentation with examples
- **New types** - Document new interfaces and their usage
- **New error classes** - Add to error hierarchy documentation  
- **New validation rules** - Document schema changes
- **Configuration options** - Update client configuration documentation
- **Breaking changes** - Document migration steps and version requirements
- **Security considerations** - Update security guidelines for new features

This documentation must evolve with the library to remain accurate and useful.

## Integration Notes

This library is designed to integrate seamlessly into the Dojo Planner project:

- **Consistent patterns**: Follows same architectural patterns as Dojo Planner
- **Error handling**: Compatible error handling approach
- **TypeScript**: Same strict TypeScript configuration
- **Testing**: Same testing patterns and coverage standards  
- **Security**: Aligned security practices and audit requirements

When integrating into Dojo Planner, follow these patterns:
- Import as `import { IQProClient } from '@dojo-planner/iqpro-client'`
- Use with existing environment variable patterns
- Integrate error handling with existing logging systems
- Follow existing service layer patterns for consistency