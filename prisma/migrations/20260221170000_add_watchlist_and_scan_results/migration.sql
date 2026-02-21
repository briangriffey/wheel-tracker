-- CreateTable
CREATE TABLE "WatchlistTicker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistTicker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanDate" TIMESTAMP(3) NOT NULL,
    "ticker" TEXT NOT NULL,
    "stockPrice" DECIMAL(10,2),
    "sma200" DECIMAL(10,2),
    "sma50" DECIMAL(10,2),
    "avgVolume" DECIMAL(15,0),
    "trendDirection" TEXT,
    "passedPhase1" BOOLEAN NOT NULL DEFAULT false,
    "phase1Reason" TEXT,
    "currentIV" DECIMAL(8,6),
    "ivHigh52w" DECIMAL(8,6),
    "ivLow52w" DECIMAL(8,6),
    "ivRank" DECIMAL(6,2),
    "passedPhase2" BOOLEAN NOT NULL DEFAULT false,
    "phase2Reason" TEXT,
    "contractName" TEXT,
    "strike" DECIMAL(10,2),
    "expiration" TIMESTAMP(3),
    "dte" INTEGER,
    "delta" DECIMAL(8,6),
    "theta" DECIMAL(8,6),
    "bid" DECIMAL(10,4),
    "ask" DECIMAL(10,4),
    "iv" DECIMAL(8,6),
    "openInterest" INTEGER,
    "optionVolume" INTEGER,
    "premiumYield" DECIMAL(8,2),
    "passedPhase3" BOOLEAN NOT NULL DEFAULT false,
    "phase3Reason" TEXT,
    "yieldScore" DECIMAL(6,2),
    "ivScore" DECIMAL(6,2),
    "deltaScore" DECIMAL(6,2),
    "liquidityScore" DECIMAL(6,2),
    "trendScore" DECIMAL(6,2),
    "compositeScore" DECIMAL(6,2),
    "hasOpenCSP" BOOLEAN NOT NULL DEFAULT false,
    "hasAssignedPos" BOOLEAN NOT NULL DEFAULT false,
    "portfolioFlag" TEXT,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "finalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistTicker_userId_idx" ON "WatchlistTicker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistTicker_userId_ticker_key" ON "WatchlistTicker"("userId", "ticker");

-- CreateIndex
CREATE INDEX "ScanResult_userId_scanDate_idx" ON "ScanResult"("userId", "scanDate");

-- CreateIndex
CREATE INDEX "ScanResult_userId_scanDate_passed_idx" ON "ScanResult"("userId", "scanDate", "passed");

-- CreateIndex
CREATE INDEX "ScanResult_scanDate_idx" ON "ScanResult"("scanDate");

-- CreateIndex
CREATE INDEX "ScanResult_compositeScore_idx" ON "ScanResult"("compositeScore");

-- AddForeignKey
ALTER TABLE "WatchlistTicker" ADD CONSTRAINT "WatchlistTicker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
