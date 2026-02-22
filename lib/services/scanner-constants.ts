export const SCANNER = {
  // Phase 1: Stock Universe Filter
  MIN_PRICE: 13,
  MAX_PRICE: 150,
  MIN_AVG_VOLUME: 1_000_000,
  SMA_PERIOD: 200,
  SMA_SHORT_PERIOD: 50,
  SMA_TREND_LOOKBACK: 20,

  // Phase 2: Implied Volatility Screen
  MIN_IV_RANK: 20,

  // Phase 3: Option Selection
  TARGET_MIN_DTE: 5,
  TARGET_MAX_DTE: 45,
  TARGET_MIN_DELTA: -0.30,
  TARGET_MAX_DELTA: -0.02,
  DELTA_SWEET_SPOT_MIN: -0.25,
  DELTA_SWEET_SPOT_MAX: -0.22,
  MIN_PREMIUM_YIELD: 8,
  MIN_OPEN_INTEREST: 0,
  MIN_OPTION_VOLUME: 20,

  // Phase 4: Scoring Weights
  WEIGHTS: {
    yield: 0.30,
    iv: 0.25,
    delta: 0.15,
    liquidity: 0.15,
    trend: 0.15,
  },
  YIELD_RANGE_MIN: 8,
  YIELD_RANGE_MAX: 24,
  IV_RANK_RANGE_MIN: 20,
  IV_RANK_RANGE_MAX: 70,
  MAX_TREND_DISTANCE_PCT: 20,
  PREFERRED_OI: 500,
} as const
