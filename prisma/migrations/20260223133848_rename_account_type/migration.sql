/*
  Warnings:

  - You are about to drop the column `clientAccountType` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "capacityNeededKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clientAccountType",
ADD COLUMN     "accountType" "AccountType";

-- DropEnum
DROP TYPE "ClientAccountType";
