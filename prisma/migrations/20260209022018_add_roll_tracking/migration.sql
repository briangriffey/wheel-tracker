-- CreateEnum
CREATE TYPE "WheelStatus" AS ENUM ('ACTIVE', 'IDLE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "wheelId" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "rollFromTradeId" TEXT,
ADD COLUMN     "wheelId" TEXT;

-- CreateTable
CREATE TABLE "Wheel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "status" "WheelStatus" NOT NULL DEFAULT 'ACTIVE',
    "cycleCount" INTEGER NOT NULL DEFAULT 0,
    "totalPremiums" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalRealizedPL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wheel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wheel_userId_ticker_idx" ON "Wheel"("userId", "ticker");

-- CreateIndex
CREATE INDEX "Wheel_status_idx" ON "Wheel"("status");

-- CreateIndex
CREATE INDEX "Wheel_userId_idx" ON "Wheel"("userId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_rollFromTradeId_fkey" FOREIGN KEY ("rollFromTradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wheel" ADD CONSTRAINT "Wheel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
