/*
  Warnings:

  - The values [confirmed] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupTime` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PickupTime" AS ENUM ('MINS_15', 'MINS_30', 'HOUR_1');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('pending', 'negotiating', 'accepted', 'inProgress', 'completed', 'cancelled');
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" 
ADD COLUMN "comment" TEXT,
ADD COLUMN "finalPrice" DOUBLE PRECISION,
ADD COLUMN "fromAddress" TEXT,
ADD COLUMN "pickupTime" "PickupTime",
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "toAddress" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "price" DROP NOT NULL;

-- Update existing orders with default values
UPDATE "Order" 
SET 
  "fromAddress" = 'Unknown',
  "toAddress" = 'Unknown',
  "pickupTime" = 'MINS_30'
WHERE "fromAddress" IS NULL;

-- Make columns required after setting defaults
ALTER TABLE "Order"
ALTER COLUMN "fromAddress" SET NOT NULL,
ALTER COLUMN "toAddress" SET NOT NULL,
ALTER COLUMN "pickupTime" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" 
ADD COLUMN "carModel" TEXT,
ADD COLUMN "carNumber" TEXT,
ADD COLUMN "offerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PriceOffer" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "PriceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceOffer_orderId_idx" ON "PriceOffer"("orderId");

-- CreateIndex
CREATE INDEX "PriceOffer_driverId_idx" ON "PriceOffer"("driverId");

-- CreateIndex
CREATE INDEX "Message_orderId_idx" ON "Message"("orderId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_passengerId_idx" ON "Order"("passengerId");

-- CreateIndex
CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");

-- AddForeignKey
ALTER TABLE "PriceOffer" ADD CONSTRAINT "PriceOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceOffer" ADD CONSTRAINT "PriceOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
