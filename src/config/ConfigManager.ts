import { config } from 'dotenv';
import { IQProConfig } from '../types/Config';
import { ConfigurationError } from '../lib/errors';

export class ConfigManager {
  static loadConfig(userConfig?: Partial<IQProConfig>): IQProConfig {
    // Load environment variables
    config();
    
    const finalConfig: IQProConfig = {
      clientId: userConfig?.clientId !== undefined ? userConfig.clientId : (process.env.IQPRO_CLIENT_ID || ''),
      clientSecret: userConfig?.clientSecret !== undefined ? userConfig.clientSecret : (process.env.IQPRO_CLIENT_SECRET || ''),
      scope: userConfig?.scope || process.env.IQPRO_SCOPE || 'https://account.basyspro.com/8939cd8f-0b21-4654-8f4d-ee01706dc3d6/.default',
      oauthUrl: userConfig?.oauthUrl || process.env.IQPRO_OAUTH_URL || 'https://account.basyspro.com/account.basyspro.com/B2C_1A_IQPROV2_INTEGRATOR/oauth2/v2.0/token',
      baseUrl: userConfig?.baseUrl || process.env.IQPRO_BASE_URL || 'https://api.basyspro.com/iqsaas/v1',
      timeout: userConfig?.timeout || this.parseIntWithDefault(process.env.IQPRO_TIMEOUT, 30000),
      retryAttempts: userConfig?.retryAttempts || this.parseIntWithDefault(process.env.IQPRO_RETRY_ATTEMPTS, 3)
    };

    // Validate required fields
    if (!finalConfig.clientId) {
      throw new ConfigurationError('Client ID is required. Set IQPRO_CLIENT_ID environment variable or pass clientId in config.');
    }
    
    if (!finalConfig.clientSecret) {
      throw new ConfigurationError('Client secret is required. Set IQPRO_CLIENT_SECRET environment variable or pass clientSecret in config.');
    }

    return finalConfig;
  }

  private static parseIntWithDefault(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static getConfigSummary(config: IQProConfig) {
    return {
      clientId: config.clientId ? `${config.clientId.slice(0, 8)}...` : 'not set',
      hasClientSecret: !!config.clientSecret,
      scope: config.scope,
      oauthUrl: config.oauthUrl,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts
    };
  }
}