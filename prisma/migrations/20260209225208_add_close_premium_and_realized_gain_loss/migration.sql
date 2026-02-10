-- Add closePremium and realizedGainLoss columns to Trade table
-- AlterTable
ALTER TABLE "Trade"
ADD COLUMN "closePremium" DECIMAL(10,2),
ADD COLUMN "realizedGainLoss" DECIMAL(10,2);

-- Add comment to explain the fields
COMMENT ON COLUMN "Trade"."closePremium" IS 'Premium paid to close early (BUY_TO_CLOSE)';
COMMENT ON COLUMN "Trade"."realizedGainLoss" IS 'Net P/L when closed early (premium - closePremium)';
