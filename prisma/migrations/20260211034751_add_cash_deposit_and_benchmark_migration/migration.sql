-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "CashDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "DepositType" NOT NULL DEFAULT 'DEPOSIT',
    "depositDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "spyPrice" DECIMAL(10,4) NOT NULL,
    "spyShares" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDeposit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MarketBenchmark" ADD COLUMN     "migrated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "migratedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CashDeposit_userId_idx" ON "CashDeposit"("userId");

-- CreateIndex
CREATE INDEX "CashDeposit_depositDate_idx" ON "CashDeposit"("depositDate");

-- CreateIndex
CREATE INDEX "CashDeposit_userId_depositDate_idx" ON "CashDeposit"("userId", "depositDate");

-- CreateIndex
CREATE INDEX "CashDeposit_type_idx" ON "CashDeposit"("type");

-- CreateIndex
CREATE INDEX "MarketBenchmark_migrated_idx" ON "MarketBenchmark"("migrated");

-- AddForeignKey
ALTER TABLE "CashDeposit" ADD CONSTRAINT "CashDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
