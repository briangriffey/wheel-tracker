/**
 * Market Data Types
 * Core type definitions for market data across the application
 */

export interface Quote {
  symbol: string;
  price: number;
  timestamp: Date;
  currency: string;
  exchange?: string;
}

export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface MarketDataError {
  code: string;
  message: string;
  provider: string;
  timestamp: Date;
}

export enum MarketDataProvider {
  ALPHA_VANTAGE = 'alpha_vantage',
  POLYGON = 'polygon',
  YAHOO_FINANCE = 'yahoo_finance',
  IEX_CLOUD = 'iex_cloud',
  MOCK = 'mock'
}

export interface MarketDataConfig {
  provider: MarketDataProvider;
  apiKey: string;
  rateLimitPerMinute?: number;
  cacheTTL?: number;
  retryAttempts?: number;
}
