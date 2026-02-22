/**
 * Black-Scholes pricing and implied volatility computation.
 * Pure math module — zero external dependencies.
 */

export const RISK_FREE_RATE = 0.05

/**
 * Standard normal CDF using Abramowitz & Stegun polynomial approximation.
 * Accuracy ~1e-7.
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const z = Math.abs(x) / Math.SQRT2
  const t = 1.0 / (1.0 + p * z)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
  return 0.5 * (1.0 + sign * y)
}

/**
 * Standard normal PDF.
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

/**
 * Black-Scholes put price.
 * P = K * e^(-rT) * N(-d2) - S * N(-d1)
 */
export function bsPutPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1)
}

/**
 * Black-Scholes vega (same for puts and calls).
 * vega = S * sqrt(T) * n(d1)
 */
export function bsVega(S: number, K: number, T: number, r: number, sigma: number): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))
  return S * Math.sqrt(T) * normalPDF(d1)
}

/**
 * Compute implied volatility via Newton-Raphson iteration.
 * Returns null on bad inputs or non-convergence.
 *
 * @param marketPrice - observed option market price
 * @param S - stock price
 * @param K - strike price
 * @param T - time to expiration in years
 * @param r - risk-free rate
 */
export function computeIV(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number
): number | null {
  if (marketPrice <= 0 || S <= 0 || K <= 0 || T <= 0) return null

  const MAX_ITERATIONS = 100
  const TOLERANCE = 1e-8
  const SIGMA_MIN = 0.001
  const SIGMA_MAX = 5.0

  let sigma = 0.3 // initial guess

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const price = bsPutPrice(S, K, T, r, sigma)
    const diff = price - marketPrice

    if (Math.abs(diff) < TOLERANCE) {
      return sigma
    }

    const v = bsVega(S, K, T, r, sigma)
    if (v < 1e-12) return null // vega too small, can't converge

    sigma = sigma - diff / v
    sigma = Math.max(SIGMA_MIN, Math.min(SIGMA_MAX, sigma))
  }

  return null // did not converge
}

/**
 * Convert DTE (days to expiration) to years.
 */
export function dteToYears(dte: number): number {
  return dte / 365
}
