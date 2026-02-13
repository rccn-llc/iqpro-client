# IQ Pro+ Client Library Examples

This directory contains practical examples demonstrating how to use the API-compliant IQ Pro+ Client Library in various real-world scenarios.

## Available Examples

### 1. Customer Management ([customer-management.ts](./customer-management.ts))
**Comprehensive CRUD Operations Example**

This example demonstrates all customer management operations using the new API-compliant CustomerService:

- **Client Initialization**: OAuth 2.0 setup and gateway context configuration
- **Core CRUD Operations**: Create, Read, Update, Delete customers
- **Advanced Features**: 
  - Customer search with filtering and pagination
  - Address management (create, get, update, delete)
  - Payment method management (create, get, update, delete)  
  - Payable token generation for invoice linking
- **Error Handling**: Comprehensive error handling for validation, authentication, and API errors
- **Resource Cleanup**: Proper cleanup of created resources

**Key Features Demonstrated:**
- New API-compliant request format (single `name` field instead of `firstName`/`lastName`)
- Proper handling of API response wrapper format `{statusCode, statusDetails, data}`
- Complete customer lifecycle management with addresses and payment methods
- Real-time console logging with color-coded output for easy monitoring

### 2. Utility Scripts
- [service-layer-usage.mjs](./service-layer-usage.mjs) - Service layer integration patterns
- [test-oauth.mjs](./test-oauth.mjs) - OAuth authentication testing
- [test-usage.mjs](./test-usage.mjs) - Basic client initialization testing

## Quick Start

### Prerequisites

1. **Environment Setup**: Set required environment variables
2. **API Credentials**: Valid iQ Pro+ API credentials
3. **Gateway Configuration**: Active gateway setup

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Required OAuth 2.0 Configuration
IQPRO_CLIENT_ID=your-client-id
IQPRO_CLIENT_SECRET=your-client-secret
IQPRO_SCOPE=https://account.basyspro.com/8939cd8f-0b21-4654-8f4d-ee01706dc3d6/.default
IQPRO_OAUTH_URL=https://account.basyspro.com/account.basyspro.com/B2C_1A_IQPROV2_INTEGRATOR/oauth2/v2.0/token
IQPRO_BASE_URL=https://api.basyspro.com/iqsaas/v1

# Required Gateway Context
IQPRO_GATEWAY_ID=your-gateway-id

# Optional Configuration
IQPRO_TIMEOUT=30000
IQPRO_RETRY_ATTEMPTS=3
IQPRO_DEBUG=false
```

### Running Examples

```bash
# Run the comprehensive customer management example
npx tsx examples/customer-management.ts

# Run utility scripts
node examples/test-oauth.mjs
node examples/test-usage.mjs
node examples/service-layer-usage.mjs
```

## Example Output

When you run the customer management example, you'll see color-coded console output like this:

```
[DEMO] 2026-02-13T10:30:00.000Z - Starting Customer Management Example
[SUCCESS] 2026-02-13T10:30:00.100Z - Environment variables validated successfully
[SUCCESS] 2026-02-13T10:30:01.200Z - Client initialized with gateway: gw-12345
[SUCCESS] 2026-02-13T10:30:02.300Z - Customer created successfully:
[INFO] 2026-02-13T10:30:02.300Z -   - ID: cust-abc123def456
[INFO] 2026-02-13T10:30:02.300Z -   - Name: John Michael Doe
[INFO] 2026-02-13T10:30:02.300Z -   - Addresses: 1
[INFO] 2026-02-13T10:30:02.300Z -   - Payment Methods: 1
...
```

## API Compliance Features

This library has been updated to be fully compliant with the official iQ Pro+ API documentation:

### Request Format Changes
- **Customer Name**: Uses single `name` field instead of separate `firstName`/`lastName`
- **Address Structure**: Uses `addressLine1`/`addressLine2` instead of `line1`/`line2`
- **Response Parsing**: Handles API wrapper format with `statusCode`/`statusDetails`

### Complete Feature Coverage
- **12/12 Customer Endpoints**: Full coverage of all documented customer API endpoints
- **Validation**: Proper UUID validation and required field checking
- **Error Handling**: API-specific error handling for status codes and validation failures

## Integration Patterns

### Error Handling Pattern
All examples demonstrate proper error handling using the library's specific error types:

```typescript
import { ValidationError, IQProApiError, IQProAuthenticationError } from '@dojo-planner/iqpro-client';

try {
  const customer = await client.customers.create(customerData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof IQProApiError) {
    console.error('API error:', error.statusCode, error.message);
  } else if (error instanceof IQProAuthenticationError) {
    console.error('Authentication failed:', error.message);
  }
}
```

### Gateway Context Pattern
Always set gateway context before making API calls:

```typescript
const client = new IQProClient();
client.setGatewayContext('your-gateway-id');

// Now all API calls will use this gateway context
const customer = await client.customers.create(customerData);
```

### Resource Cleanup Pattern
Always clean up created resources, especially in examples:

```typescript
let customerId: string;
let addressId: string;

try {
  const customer = await client.customers.create(customerData);
  customerId = customer.customerId;
  
  const address = await client.customers.createAddress(customerId, addressData);
  addressId = address.addressId;
  
  // ... perform operations
  
} finally {
  // Clean up resources
  if (addressId) await client.customers.deleteAddress(customerId, addressId);
  if (customerId) await client.customers.delete(customerId);
}
```

## Best Practices

1. **Environment Variables**: Always use environment variables for credentials
2. **Gateway Context**: Set gateway context immediately after client initialization  
3. **Error Handling**: Use specific error types for different failure scenarios
4. **Resource Cleanup**: Clean up created test resources to avoid accumulation
5. **Validation**: Validate input data before API calls using proper TypeScript types
6. **Logging**: Use structured logging for debugging and monitoring
7. **UUID Handling**: All entity IDs are UUIDs - validate format before API calls

## Security Considerations

1. **Credential Security**: Never commit credentials to version control
2. **Environment Isolation**: Use different credentials for different environments
3. **API Response Handling**: Be aware of API wrapper format changes
4. **Data Validation**: Always validate data before processing API responses
5. **Error Information**: Be careful not to log sensitive information in error messages

## Troubleshooting

### Common Issues

**Authentication Errors**
- Verify `IQPRO_CLIENT_ID` and `IQPRO_CLIENT_SECRET` are correct
- Check that OAuth URL matches your tenant configuration
- Ensure scope includes necessary permissions

**API Errors**  
- Check that `IQPRO_GATEWAY_ID` is valid and active
- Verify base URL matches your environment (sandbox vs production)
- Ensure request data matches new API-compliant format

**Validation Errors**
- Check that customer name is provided (required field)
- Verify address structure uses correct field names (`addressLine1` not `line1`)
- Ensure all UUIDs are properly formatted

**Network Issues**
- Verify internet connectivity and firewall settings
- Check timeout configuration for slow networks
- Consider retry logic for transient failures

### Getting Help

- [API Documentation](https://api.basyspro.com/iqsaas/v1/scalar/)
- [Library Documentation](../README.md)
- [GitHub Issues](https://github.com/dojo-planner/iqpro-client/issues)

For additional support, please refer to the official iQ Pro+ documentation or contact your API provider.