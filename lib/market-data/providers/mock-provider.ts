/**
 * Mock Market Data Provider
 * Useful for development and testing
 */

import { BaseMarketDataProvider } from '../provider';
import { Quote, HistoricalPrice } from '../types';

export class MockMarketDataProvider extends BaseMarketDataProvider {
  private mockPrices: Map<string, number> = new Map([
    ['AAPL', 178.50],
    ['GOOGL', 141.20],
    ['MSFT', 415.30],
    ['TSLA', 248.40],
    ['AMZN', 178.90],
  ]);

  constructor() {
    super({ apiKey: 'mock', rateLimitPerMinute: 1000 });
  }

  async getQuote(symbol: string): Promise<Quote> {
    const basePrice = this.mockPrices.get(symbol) ?? 100.0;
    const variation = (Math.random() - 0.5) * 2; // +/- 1%
    const price = basePrice * (1 + variation / 100);

    return {
      symbol,
      price: Math.round(price * 100) / 100,
      timestamp: new Date(),
      currency: 'USD',
      exchange: 'MOCK',
    };
  }

  async getBatchQuotes(symbols: string[]): Promise<Quote[]> {
    return Promise.all(symbols.map(symbol => this.getQuote(symbol)));
  }

  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    const prices: HistoricalPrice[] = [];
    const basePrice = this.mockPrices.get(symbol) ?? 100.0;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const variation = (Math.random() - 0.5) * 5; // +/- 2.5%
        const dayPrice = basePrice * (1 + variation / 100);

        prices.push({
          symbol,
          date: new Date(currentDate),
          open: dayPrice * 0.98,
          high: dayPrice * 1.02,
          low: dayPrice * 0.97,
          close: dayPrice,
          volume: Math.floor(Math.random() * 10000000),
          adjustedClose: dayPrice,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return prices;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
