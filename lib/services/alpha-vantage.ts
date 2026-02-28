import type { StockPriceResult } from './market-data'

interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol': string
    '02. open': string
    '03. high': string
    '04. low': string
    '05. price': string
    '06. volume': string
    '07. latest trading day': string
    '08. previous close': string
    '09. change': string
    '10. change percent': string
  }
}

/**
 * Fetch stock price from Alpha Vantage GLOBAL_QUOTE endpoint.
 * Used for tickers not available on FinancialData.net (e.g. SPY).
 */
export async function fetchFromAlphaVantage(ticker: string): Promise<StockPriceResult> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    return {
      ticker,
      price: 0,
      date: new Date(),
      success: false,
      error: 'ALPHA_VANTAGE_API_KEY is not configured in environment variables',
    }
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker.toUpperCase()}&apikey=${apiKey}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: `Alpha Vantage API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as AlphaVantageGlobalQuote

    const quote = data['Global Quote']
    if (!quote || !quote['05. price']) {
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: 'No data from Alpha Vantage. Ticker may not exist or rate limit reached.',
      }
    }

    const price = parseFloat(quote['05. price'])
    if (isNaN(price)) {
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: 'Invalid price data from Alpha Vantage',
      }
    }

    const date = new Date(quote['07. latest trading day'])

    return {
      ticker: ticker.toUpperCase(),
      price,
      date,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching ${ticker} from Alpha Vantage:`, message)

    return {
      ticker,
      price: 0,
      date: new Date(),
      success: false,
      error: `Failed to fetch from Alpha Vantage: ${message}`,
    }
  }
}
