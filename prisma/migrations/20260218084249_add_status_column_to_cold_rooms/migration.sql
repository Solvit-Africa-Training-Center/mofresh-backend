/*
  Warnings:

  - A unique constraint covering the columns `[email,code]` on the table `otps` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FRUITS_VEGETABLES', 'FRESH_FRUITS', 'MEAT', 'MEDECINE', 'PHARMACEUTICAL');

-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'ColdRoom';

-- AlterTable
ALTER TABLE "cold_rooms" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "coldRoomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "otps_email_code_key" ON "otps"("email", "code");

-- CreateIndex
CREATE INDEX "rentals_coldRoomId_idx" ON "rentals"("coldRoomId");

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_coldRoomId_fkey" FOREIGN KEY ("coldRoomId") REFERENCES "cold_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
