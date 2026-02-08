-- CreateEnum
CREATE TYPE "TradeOutcome" AS ENUM ('GREAT', 'OKAY', 'MISTAKE', 'LEARNING');

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "outcome" "TradeOutcome",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MarketBenchmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "initialCapital" DECIMAL(10,2) NOT NULL,
    "setupDate" TIMESTAMP(3) NOT NULL,
    "initialPrice" DECIMAL(10,4) NOT NULL,
    "shares" DECIMAL(10,4) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketBenchmark_userId_idx" ON "MarketBenchmark"("userId");

-- CreateIndex
CREATE INDEX "MarketBenchmark_ticker_idx" ON "MarketBenchmark"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "MarketBenchmark_userId_ticker_key" ON "MarketBenchmark"("userId", "ticker");

-- AddForeignKey
ALTER TABLE "MarketBenchmark" ADD CONSTRAINT "MarketBenchmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
