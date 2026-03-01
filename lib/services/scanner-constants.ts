export const SCANNER = {
  // Phase 1: Stock Universe Filter
  MIN_PRICE: 10,
  MAX_PRICE: 250,
  MIN_AVG_VOLUME: 1_000_000,
  SMA_PERIOD: 200,
  SMA_SHORT_PERIOD: 50,
  SMA_TREND_LOOKBACK: 20,

  // Phase 2: Implied Volatility Screen
  MIN_IV_RANK: 0,

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

  // Mean Reversion scoring
  EMA_PERIOD: 8,
  VWAP_PERIOD: 20,              // rolling VWAP window in trading days
  EMA8_DISTANCE_BEST: -2.0,     // 2% below EMA8 = score 100
  EMA8_DISTANCE_WORST: 5.0,     // 5% above EMA8 = score 0
  VWAP_DISTANCE_BEST: -1.0,     // 1% below VWAP = score 100
  VWAP_DISTANCE_WORST: 3.0,     // 3% above VWAP = score 0
  EMA8_WEIGHT: 0.60,            // EMA8 weight within mean reversion sub-score
  VWAP_WEIGHT: 0.40,            // VWAP weight within mean reversion sub-score

  // Phase 4: Scoring Weights (must sum to 1.0)
  WEIGHTS: {
    yield: 0.25,         // was 0.30
    iv: 0.20,            // was 0.25
    delta: 0.15,         // unchanged
    liquidity: 0.10,     // was 0.15
    trend: 0.10,         // was 0.15
    meanReversion: 0.20, // NEW
  },
  YIELD_RANGE_MIN: 8,
  YIELD_RANGE_MAX: 24,
  IV_RANK_RANGE_MIN: 20,
  IV_RANK_RANGE_MAX: 70,
  MAX_TREND_DISTANCE_PCT: 20,
  PREFERRED_OI: 500,
} as const
