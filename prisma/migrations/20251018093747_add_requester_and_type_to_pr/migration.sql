/*
  Warnings:

  - Added the required column `requesterName` to the `purchase_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `purchase_requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('NORMAL', 'URGENT', 'PROJECT');

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "requesterName" TEXT NOT NULL,
ADD COLUMN     "type" "RequestType" NOT NULL;
