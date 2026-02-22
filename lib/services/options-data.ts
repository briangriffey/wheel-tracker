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
function buildUrl(endpoint: string, identifier: string, offset = 0): string {
  const apiKey = process.env.FINANCIAL_DATA_API_KEY
  const base = `https://financialdata.net/api/v1/${endpoint}?identifier=${encodeURIComponent(identifier)}&key=${apiKey}`
  return offset > 0 ? `${base}&offset=${offset}` : base
}

/**
 * Build a sanitized URL for logging (API key redacted)
 */
function buildSanitizedUrl(endpoint: string, identifier: string, offset = 0): string {
  const base = `https://financialdata.net/api/v1/${endpoint}?identifier=${encodeURIComponent(identifier)}&key=[REDACTED]`
  return offset > 0 ? `${base}&offset=${offset}` : base
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

/** Number of records per page for the option-chain offset parameter. */
const OPTION_CHAIN_PAGE_SIZE = 300

/**
 * Returns "YYYY-MM-DD" for today + days, in local time.
 */
function dateStringPlusDays(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Fetch the option chain for a ticker.
 *
 * The API returns at most 300 records per request. This function paginates
 * using the `offset` query param, stopping as soon as a page contains a
 * contract whose expiration_date is earlier than today + minDte. The API
 * returns contracts newest-expiration-first, so this guarantees we collect
 * every contract in and beyond our target DTE window without fetching pages
 * of already-expired contracts.
 *
 * @param minDte  Stop fetching once a record with expiration_date < today+minDte
 *                is seen. Defaults to 0 (stop only on an empty page).
 */
export async function fetchOptionChain(ticker: string, minDte = 0): Promise<OptionChainResult> {
  validateApiKey()

  const endpoint = 'option-chain'
  const cutoffDateStr = dateStringPlusDays(minDte)
  const allRaw: RawOptionChainRecord[] = []
  let offset = 0

  log.debug({ ticker, cutoffDateStr, minDte }, 'fetchOptionChain: pagination cutoff computed')

  try {
    while (true) {
      const url = buildUrl(endpoint, ticker.toUpperCase(), offset)
      const sanitizedUrl = buildSanitizedUrl(endpoint, ticker.toUpperCase(), offset)

      log.debug(
        { endpoint, identifier: ticker, url: sanitizedUrl, offset, queueLength: apiRateLimiter.getQueueLength() },
        'HTTP GET enqueued'
      )

      const response = await apiRateLimiter.enqueue(() => fetch(url))

      log.debug(
        { endpoint, identifier: ticker, status: response.status, statusText: response.statusText, offset },
        'HTTP response received'
      )

      const httpError = handleHttpError(response, ticker)
      if (httpError) {
        log.warn({ endpoint, identifier: ticker, status: response.status, error: httpError, offset }, 'HTTP error response')
        return { ticker, contracts: [], success: false, error: httpError }
      }

      const page = (await response.json()) as RawOptionChainRecord[]

      log.debug({ endpoint, identifier: ticker, offset, pageSize: Array.isArray(page) ? page.length : 'n/a', payload: page }, 'Full response payload')

      if (!Array.isArray(page)) {
        log.warn(
          { endpoint, identifier: ticker, offset, dataType: typeof page },
          'Non-array response'
        )
        return { ticker, contracts: [], success: false, error: `No option chain data for ${ticker}` }
      }

      // Empty page: no data (at offset 0) or natural end of the dataset
      if (page.length === 0) {
        if (offset === 0) {
          log.warn({ endpoint, identifier: ticker }, 'Empty response on first page')
          return { ticker, contracts: [], success: false, error: `No option chain data for ${ticker}` }
        }
        log.debug({ endpoint, identifier: ticker, offset }, 'Empty page — end of data')
        break
      }

      allRaw.push(...page)

      log.debug(
        { endpoint, identifier: ticker, offset, pageSize: page.length, totalSoFar: allRaw.length },
        'Page accumulated'
      )

      // Stop once we've reached contracts that expire before our DTE window.
      // Subsequent pages would only contain shorter-dated / expired contracts.
      const hasEarlyExpiry = page.some((r) => r.expiration_date < cutoffDateStr)
      if (hasEarlyExpiry) {
        log.debug(
          { endpoint, identifier: ticker, offset, cutoffDateStr },
          'Page contains contract below DTE cutoff — stopping pagination'
        )
        break
      }

      offset += OPTION_CHAIN_PAGE_SIZE
    }

    //Remove all of the contracts that are not within the DTE window
    const rawContractsWithValidDates = allRaw.filter((r) => r.expiration_date >= cutoffDateStr)

    // Map raw API field names to our canonical OptionChainRecord shape
    const contracts: OptionChainRecord[] = rawContractsWithValidDates.map((r) => ({
      identifier: r.contract_name,
      strike: r.strike_price,
      expiration: r.expiration_date,
      type: r.put_or_call === 'Put' ? OptionType.Put : OptionType.Call,
    }))

    const puts = contracts.filter((c) => c.type === OptionType.Put)
    const calls = contracts.filter((c) => c.type === OptionType.Call)
    log.info(
      { endpoint, identifier: ticker, totalContracts: contracts.length, puts: puts.length, calls: calls.length, pages: offset / OPTION_CHAIN_PAGE_SIZE + 1 },
      'Option chain fetched successfully'
    )

    // Check first raw record for empty fields (before mapping)
    if (allRaw[0]) {
      warnEmptyFields(allRaw[0] as unknown as Record<string, unknown>, `${ticker} first option chain record`)
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

    log.debug({ endpoint, identifier: contractName, payload: JSON.stringify(data), }, 'Full response payload')

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
