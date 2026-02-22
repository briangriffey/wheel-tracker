import { apiRateLimiter } from './rate-limiter'
import { logger } from '../logger'

const log = logger.child({ module: 'options-data' })

// === API Response Types (validate against actual API) ===

export interface FinancialDataPriceRecord {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Raw shape returned by the FinancialData.net option-chain endpoint.
// Field names differ from our canonical OptionChainRecord.
interface RawOptionChainRecord {
  trading_symbol: string
  central_index_key: string
  registrant_name: string
  contract_name: string    // e.g. "MSFT271217P00660000"
  expiration_date: string  // "YYYY-MM-DD"
  put_or_call: string      // "Put" or "Call"
  strike_price: number
}

export enum OptionType {
  Put = 'Put',
  Call = 'Call',
}

export interface OptionChainRecord {
  identifier: string // from contract_name, e.g., "MSFT271217P00660000"
  strike: number     // from strike_price
  expiration: string // from expiration_date, "YYYY-MM-DD"
  type: OptionType   // from put_or_call
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
 * Build a sanitized URL for logging (API key redacted)
 */
function buildSanitizedUrl(endpoint: string, identifier: string): string {
  return `https://financialdata.net/api/v1/${endpoint}?identifier=${encodeURIComponent(identifier)}&key=[REDACTED]`
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
 * Check a record for null/undefined/NaN fields and log a warning if any are found.
 */
function warnEmptyFields(record: Record<string, unknown>, context: string): void {
  const empty = Object.entries(record)
    .filter(([, v]) => v === null || v === undefined || (typeof v === 'number' && isNaN(v)))
    .map(([k]) => k)
  if (empty.length > 0) {
    log.warn({ emptyFields: empty, context }, 'Record contains null/undefined/NaN fields')
  }
}

/**
 * Fetch full stock price history for a ticker.
 * Returns the entire array of daily records (unlike fetchStockPrice which returns only the latest).
 * Used by the scanner for SMA calculations.
 */
export async function fetchStockPriceHistory(ticker: string): Promise<StockPriceHistoryResult> {
  validateApiKey()

  const endpoint = 'stock-prices'
  const url = buildUrl(endpoint, ticker.toUpperCase())
  const sanitizedUrl = buildSanitizedUrl(endpoint, ticker.toUpperCase())

  log.debug(
    { endpoint, identifier: ticker, url: sanitizedUrl, queueLength: apiRateLimiter.getQueueLength() },
    'HTTP GET enqueued'
  )

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    log.debug(
      { endpoint, identifier: ticker, status: response.status, statusText: response.statusText },
      'HTTP response received'
    )

    const httpError = handleHttpError(response, ticker)
    if (httpError) {
      log.warn({ endpoint, identifier: ticker, status: response.status, error: httpError }, 'HTTP error response')
      return { ticker, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as FinancialDataPriceRecord[]

    log.debug({ endpoint, identifier: ticker, payload: data }, 'Full response payload')

    if (!Array.isArray(data) || data.length === 0) {
      log.warn(
        { endpoint, identifier: ticker, dataType: typeof data, isArray: Array.isArray(data) },
        'Empty or non-array response'
      )
      return {
        ticker,
        records: [],
        success: false,
        error: `No price history data for ${ticker}`,
      }
    }

    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
    log.info(
      {
        endpoint,
        identifier: ticker,
        recordCount: data.length,
        latestDate: sorted[0]?.date,
        oldestDate: sorted[sorted.length - 1]?.date,
        latestClose: sorted[0]?.close,
        latestVolume: sorted[0]?.volume,
      },
      'Price history fetched successfully'
    )

    // Check most recent record for empty fields
    warnEmptyFields(sorted[0] as unknown as Record<string, unknown>, `${ticker} latest price record`)

    return {
      ticker: ticker.toUpperCase(),
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error({ endpoint, identifier: ticker, error: message }, 'Exception fetching price history')
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

  const endpoint = 'option-chain'
  const url = buildUrl(endpoint, ticker.toUpperCase())
  const sanitizedUrl = buildSanitizedUrl(endpoint, ticker.toUpperCase())

  log.debug(
    { endpoint, identifier: ticker, url: sanitizedUrl, queueLength: apiRateLimiter.getQueueLength() },
    'HTTP GET enqueued'
  )

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    log.debug(
      { endpoint, identifier: ticker, status: response.status, statusText: response.statusText },
      'HTTP response received'
    )

    const httpError = handleHttpError(response, ticker)
    if (httpError) {
      log.warn({ endpoint, identifier: ticker, status: response.status, error: httpError }, 'HTTP error response')
      return { ticker, contracts: [], success: false, error: httpError }
    }

    const raw = (await response.json()) as RawOptionChainRecord[]

    log.debug({ endpoint, identifier: ticker, payload: raw }, 'Full response payload')

    if (!Array.isArray(raw) || raw.length === 0) {
      log.warn(
        { endpoint, identifier: ticker, dataType: typeof raw, isArray: Array.isArray(raw) },
        'Empty or non-array response'
      )
      return {
        ticker,
        contracts: [],
        success: false,
        error: `No option chain data for ${ticker}`,
      }
    }

    // Map raw API field names to our canonical OptionChainRecord shape
    const contracts: OptionChainRecord[] = raw.map((r) => ({
      identifier: r.contract_name,
      strike: r.strike_price,
      expiration: r.expiration_date,
      type: r.put_or_call === 'Put' ? OptionType.Put : OptionType.Call,
    }))

    const puts = contracts.filter((c) => c.type === OptionType.Put)
    const calls = contracts.filter((c) => c.type === OptionType.Call)
    log.info(
      { endpoint, identifier: ticker, totalContracts: contracts.length, puts: puts.length, calls: calls.length },
      'Option chain fetched successfully'
    )

    // Check first raw record for empty fields (before mapping)
    if (raw[0]) {
      warnEmptyFields(raw[0] as unknown as Record<string, unknown>, `${ticker} first option chain record`)
    }

    return {
      ticker: ticker.toUpperCase(),
      contracts,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error({ endpoint, identifier: ticker, error: message }, 'Exception fetching option chain')
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

  const endpoint = 'option-greeks'
  const url = buildUrl(endpoint, contractName)
  const sanitizedUrl = buildSanitizedUrl(endpoint, contractName)

  log.debug(
    { endpoint, identifier: contractName, url: sanitizedUrl, queueLength: apiRateLimiter.getQueueLength() },
    'HTTP GET enqueued'
  )

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    log.debug(
      { endpoint, identifier: contractName, status: response.status, statusText: response.statusText },
      'HTTP response received'
    )

    const httpError = handleHttpError(response, contractName)
    if (httpError) {
      log.warn({ endpoint, identifier: contractName, status: response.status, error: httpError }, 'HTTP error response')
      return { contractName, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as OptionGreeksRecord[]

    log.debug({ endpoint, identifier: contractName, payload: data }, 'Full response payload')

    if (!Array.isArray(data) || data.length === 0) {
      log.warn(
        { endpoint, identifier: contractName, dataType: typeof data, isArray: Array.isArray(data) },
        'Empty or non-array response'
      )
      return {
        contractName,
        records: [],
        success: false,
        error: `No greeks data for ${contractName}`,
      }
    }

    const latest = [...data].sort((a, b) => b.date.localeCompare(a.date))[0]
    log.info(
      {
        endpoint,
        identifier: contractName,
        recordCount: data.length,
        latestDate: latest.date,
        latestDelta: latest.delta,
        latestIV: latest.impliedVolatility,
        latestTheta: latest.theta,
        latestGamma: latest.gamma,
      },
      'Option greeks fetched successfully'
    )

    // Check most recent record for empty fields
    warnEmptyFields(latest as unknown as Record<string, unknown>, `${contractName} latest greeks record`)

    return {
      contractName,
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error({ endpoint, identifier: contractName, error: message }, 'Exception fetching option greeks')
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

  const endpoint = 'option-prices'
  const url = buildUrl(endpoint, contractName)
  const sanitizedUrl = buildSanitizedUrl(endpoint, contractName)

  log.debug(
    { endpoint, identifier: contractName, url: sanitizedUrl, queueLength: apiRateLimiter.getQueueLength() },
    'HTTP GET enqueued'
  )

  try {
    const response = await apiRateLimiter.enqueue(() => fetch(url))

    log.debug(
      { endpoint, identifier: contractName, status: response.status, statusText: response.statusText },
      'HTTP response received'
    )

    const httpError = handleHttpError(response, contractName)
    if (httpError) {
      log.warn({ endpoint, identifier: contractName, status: response.status, error: httpError }, 'HTTP error response')
      return { contractName, records: [], success: false, error: httpError }
    }

    const data = (await response.json()) as OptionPriceRecord[]

    log.debug({ endpoint, identifier: contractName, payload: data }, 'Full response payload')

    if (!Array.isArray(data) || data.length === 0) {
      log.warn(
        { endpoint, identifier: contractName, dataType: typeof data, isArray: Array.isArray(data) },
        'Empty or non-array response'
      )
      return {
        contractName,
        records: [],
        success: false,
        error: `No price data for ${contractName}`,
      }
    }

    const latest = [...data].sort((a, b) => b.date.localeCompare(a.date))[0]

    if (latest.openInterest === undefined || latest.openInterest === null) {
      log.warn(
        { identifier: contractName, date: latest.date },
        'openInterest field is missing from option price record'
      )
    }

    log.info(
      {
        endpoint,
        identifier: contractName,
        recordCount: data.length,
        latestDate: latest.date,
        latestClose: latest.close,
        latestOpen: latest.open,
        latestHigh: latest.high,
        latestLow: latest.low,
        latestVolume: latest.volume,
        openInterest: latest.openInterest ?? null,
      },
      'Option prices fetched successfully'
    )

    // Check most recent record for empty fields
    warnEmptyFields(latest as unknown as Record<string, unknown>, `${contractName} latest price record`)

    return {
      contractName,
      records: data,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error({ endpoint, identifier: contractName, error: message }, 'Exception fetching option prices')
    return {
      contractName,
      records: [],
      success: false,
      error: `Failed to fetch option prices: ${message}`,
    }
  }
}
