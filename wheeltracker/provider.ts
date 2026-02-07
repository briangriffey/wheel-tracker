/**
 * Market Data Provider Interface
 * Defines the contract for all market data providers
 */

import { Quote, HistoricalPrice, MarketDataError } from './types';

export interface IMarketDataProvider {
  /**
   * Get real-time quote for a symbol
   */
  getQuote(symbol: string): Promise<Quote>;

  /**
   * Get multiple quotes in a single request
   */
  getBatchQuotes(symbols: string[]): Promise<Quote[]>;

  /**
   * Get historical prices for a symbol
   */
  getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]>;

  /**
   * Check if the provider is healthy and available
   */
  healthCheck(): Promise<boolean>;
}

export abstract class BaseMarketDataProvider implements IMarketDataProvider {
  protected apiKey: string;
  protected rateLimitPerMinute: number;
  protected cacheTTL: number;
  protected retryAttempts: number;

  constructor(config: {
    apiKey: string;
    rateLimitPerMinute?: number;
    cacheTTL?: number;
    retryAttempts?: number;
  }) {
    this.apiKey = config.apiKey;
    this.rateLimitPerMinute = config.rateLimitPerMinute ?? 60;
    this.cacheTTL = config.cacheTTL ?? 300; // 5 minutes default
    this.retryAttempts = config.retryAttempts ?? 3;
  }

  abstract getQuote(symbol: string): Promise<Quote>;
  abstract getBatchQuotes(symbols: string[]): Promise<Quote[]>;
  abstract getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]>;
  abstract healthCheck(): Promise<boolean>;

  protected async retry<T>(
    fn: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts > 1) {
        await this.delay(1000);
        return this.retry(fn, attempts - 1);
      }
      throw error;
    }
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
