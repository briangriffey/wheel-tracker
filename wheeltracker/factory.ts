/**
 * Market Data Provider Factory
 * Creates appropriate provider based on configuration
 */

import { IMarketDataProvider } from './provider';
import { MarketDataProvider } from './types';
import { getMarketDataConfig } from './config';
import { MockMarketDataProvider } from './providers/mock-provider';

export class MarketDataProviderFactory {
  private static instance: IMarketDataProvider | null = null;

  static createProvider(): IMarketDataProvider {
    if (this.instance) {
      return this.instance;
    }

    const config = getMarketDataConfig();

    switch (config.provider) {
      case MarketDataProvider.MOCK:
        this.instance = new MockMarketDataProvider();
        break;

      case MarketDataProvider.ALPHA_VANTAGE:
        throw new Error('Alpha Vantage provider not yet implemented');

      case MarketDataProvider.POLYGON:
        throw new Error('Polygon provider not yet implemented');

      case MarketDataProvider.YAHOO_FINANCE:
        throw new Error('Yahoo Finance provider not yet implemented');

      case MarketDataProvider.IEX_CLOUD:
        throw new Error('IEX Cloud provider not yet implemented');

      default:
        throw new Error(`Unknown market data provider: ${config.provider}`);
    }

    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}

export function getMarketDataProvider(): IMarketDataProvider {
  return MarketDataProviderFactory.createProvider();
}
