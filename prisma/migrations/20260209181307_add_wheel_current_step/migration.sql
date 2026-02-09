-- CreateEnum
CREATE TYPE "WheelStep" AS ENUM ('IDLE', 'PUT', 'HOLDING', 'COVERED');

-- AlterTable
ALTER TABLE "Wheel" ADD COLUMN     "currentStep" "WheelStep" NOT NULL DEFAULT 'IDLE';
