/*
  Warnings:

  - A unique constraint covering the columns `[email,code]` on the table `otps` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'COLD_ROOM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';

-- CreateIndex
CREATE UNIQUE INDEX "otps_email_code_key" ON "otps"("email", "code");
