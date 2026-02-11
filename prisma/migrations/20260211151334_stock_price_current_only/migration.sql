-- DropIndex
DROP INDEX IF EXISTS "StockPrice_ticker_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "StockPrice_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "StockPrice_ticker_date_key";

-- AlterTable: Remove date column and add updatedAt
ALTER TABLE "StockPrice" DROP COLUMN IF EXISTS "date";
ALTER TABLE "StockPrice" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Delete duplicate entries, keeping only the most recent price for each ticker
DELETE FROM "StockPrice" a
USING "StockPrice" b
WHERE a.id < b.id
AND a.ticker = b.ticker;

-- CreateIndex: Make ticker unique
CREATE UNIQUE INDEX IF NOT EXISTS "StockPrice_ticker_key" ON "StockPrice"("ticker");
