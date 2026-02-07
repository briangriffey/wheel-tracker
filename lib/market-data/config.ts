/**
 * Market Data Configuration
 * Centralizes configuration for market data providers
 */

import { MarketDataProvider, MarketDataConfig } from './types';

export class MarketDataConfigManager {
  private static instance: MarketDataConfigManager;
  private config: MarketDataConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): MarketDataConfigManager {
    if (!MarketDataConfigManager.instance) {
      MarketDataConfigManager.instance = new MarketDataConfigManager();
    }
    return MarketDataConfigManager.instance;
  }

  private loadConfig(): MarketDataConfig {
    const provider = (process.env.MARKET_DATA_PROVIDER as MarketDataProvider)
      ?? MarketDataProvider.MOCK;
    const apiKey = process.env.MARKET_DATA_API_KEY ?? '';

    return {
      provider,
      apiKey,
      rateLimitPerMinute: parseInt(process.env.MARKET_DATA_RATE_LIMIT ?? '60'),
      cacheTTL: parseInt(process.env.MARKET_DATA_CACHE_TTL ?? '300'),
      retryAttempts: parseInt(process.env.MARKET_DATA_RETRY_ATTEMPTS ?? '3'),
    };
  }

  getConfig(): MarketDataConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MarketDataConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.provider !== MarketDataProvider.MOCK && !this.config.apiKey) {
      errors.push('API key is required for non-mock providers');
    }

    if (this.config.rateLimitPerMinute && this.config.rateLimitPerMinute < 1) {
      errors.push('Rate limit must be at least 1 request per minute');
    }

    if (this.config.cacheTTL && this.config.cacheTTL < 0) {
      errors.push('Cache TTL cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export function getMarketDataConfig(): MarketDataConfig {
  return MarketDataConfigManager.getInstance().getConfig();
}
