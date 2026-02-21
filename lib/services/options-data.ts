import { apiRateLimiter } from './rate-limiter'

// === API Response Types (validate against actual API) ===

export interface FinancialDataPriceRecord {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OptionChainRecord {
  identifier: string // contract name, e.g., "AAPL250321P00170000"
  strike: number
  expiration: string // "YYYY-MM-DD"
  type: string // "put" or "call"
}

export interface OptionPriceRecord {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  openInterest?: number
}

export interface OptionGreeksRecord {
  date: string
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  impliedVolatility: number
}

// === Result types ===

export interface StockPriceHistoryResult {
  ticker: string
  records: FinancialDataPriceRecord[]
  success: boolean
  error?: string
}

export interface OptionChainResult {
  ticker: string
  contracts: OptionChainRecord[]
  success: boolean
  error?: string
}

export interface OptionGreeksResult {
  contractName: string
  records: OptionGreeksRecord[]
  success: boolean
  error?: string
}

export interface OptionPriceResult {
  contractName: string
  records: OptionPriceRecord[]
  success: boolean
  error?: string
}

/**
 * Validate API key is configured
 */
function validateApiKey(): void {
  if (!process.env.FINANCIAL_DATA_API_KEY) {
    throw new Error('FINANCIAL_DATA_API_KEY is not configured in environment variables')
  }
}

/**
 * Build API URL for a given endpoint and identifier
 */
function buildUrl(endpoint: string, identifier: string): string {
  const apiKey = process.env.FINANCIAL_DATA_API_KEY
  return `https://financialdata.net/api/v1/${endpoint}?identifier=${encodeURIComponent(identifier)}&key=${apiKey}`
}

/**
 * Handle common HTTP error responses.
 * Returns an error string if the response is not ok, or null if ok.
 */
function handleHttpError(response: Response, identifier: string): string | null {
  if (response.ok) return null

  if (response.status === 401) {
    return 'API authentication failed. Check FINANCIAL_DATA_API_KEY.'
  }
  if (response.status === 404) {
    return `No data found for identifier: ${identifier}`
  }
  if (response.status === 429) {
    return 'API rate limit exceeded. Please try again later.'
  }
  return `API server error: ${response.status} ${response.statusText}`
}

/**
 * Fetch full stock price history for a ticker.
 * Returns the entire array of daily records (unlike fetchStockPrice which returns only the latest).
 * Used by the scanner for SMA calculations.
 */
export async function fetchStockPriceHistory(ticker: string): Promise<StockPriceHistoryResult> {
  validateApiKey()

  const url = buildUrl('stock-prices', ticker.toUpperCase())

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    const httpError = handleHttpError(response, ticker)
    if (httpError) {
      return { ticker, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as FinancialDataPriceRecord[]

    if (!Array.isArray(data) || data.length === 0) {
      return {
        ticker,
        records: [],
        success: false,
        error: `No price history data for ${ticker}`,
      }
    }

    return {
      ticker: ticker.toUpperCase(),
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching price history for ${ticker}:`, message)
    return {
      ticker,
      records: [],
      success: false,
      error: `Failed to fetch price history: ${message}`,
    }
  }
}

/**
 * Fetch the option chain for a ticker.
 * Returns all available contracts; caller filters to puts and target DTE range.
 */
export async function fetchOptionChain(ticker: string): Promise<OptionChainResult> {
  validateApiKey()

  const url = buildUrl('option-chain', ticker.toUpperCase())

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    const httpError = handleHttpError(response, ticker)
    if (httpError) {
      return { ticker, contracts: [], success: false, error: httpError }
    }

    const data = (await response.json()) as OptionChainRecord[]

    if (!Array.isArray(data) || data.length === 0) {
      return {
        ticker,
        contracts: [],
        success: false,
        error: `No option chain data for ${ticker}`,
      }
    }

    return {
      ticker: ticker.toUpperCase(),
      contracts: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching option chain for ${ticker}:`, message)
    return {
      ticker,
      contracts: [],
      success: false,
      error: `Failed to fetch option chain: ${message}`,
    }
  }
}

/**
 * Fetch greeks history for a specific option contract.
 * Returns historical greeks including delta, gamma, theta, vega, IV.
 */
export async function fetchOptionGreeks(contractName: string): Promise<OptionGreeksResult> {
  validateApiKey()

  const url = buildUrl('option-greeks', contractName)

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    const httpError = handleHttpError(response, contractName)
    if (httpError) {
      return { contractName, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as OptionGreeksRecord[]

    if (!Array.isArray(data) || data.length === 0) {
      return {
        contractName,
        records: [],
        success: false,
        error: `No greeks data for ${contractName}`,
      }
    }

    return {
      contractName,
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching option greeks for ${contractName}:`, message)
    return {
      contractName,
      records: [],
      success: false,
      error: `Failed to fetch option greeks: ${message}`,
    }
  }
}

/**
 * Fetch price history for a specific option contract.
 * Returns OHLCV + open interest for the contract.
 */
export async function fetchOptionPrices(contractName: string): Promise<OptionPriceResult> {
  validateApiKey()

  const url = buildUrl('option-prices', contractName)

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    const httpError = handleHttpError(response, contractName)
    if (httpError) {
      return { contractName, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as OptionPriceRecord[]

    if (!Array.isArray(data) || data.length === 0) {
      return {
        contractName,
        records: [],
        success: false,
        error: `No price data for ${contractName}`,
      }
    }

    return {
      contractName,
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching option prices for ${contractName}:`, message)
    return {
      contractName,
      records: [],
      success: false,
      error: `Failed to fetch option prices: ${message}`,
    }
  }
}
