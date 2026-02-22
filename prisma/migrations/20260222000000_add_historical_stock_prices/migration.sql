-- CreateTable
CREATE TABLE "HistoricalStockPrice" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(10,4) NOT NULL,
    "high" DECIMAL(10,4) NOT NULL,
    "low" DECIMAL(10,4) NOT NULL,
    "close" DECIMAL(10,4) NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "HistoricalStockPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalStockPrice_ticker_date_key" ON "HistoricalStockPrice"("ticker", "date");

-- CreateIndex
CREATE INDEX "HistoricalStockPrice_ticker_idx" ON "HistoricalStockPrice"("ticker");
