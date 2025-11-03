/*
  Warnings:

  - The values [approving] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('pending', 'approved', 'ordered', 'received', 'rejected', 'cancelled');
ALTER TABLE "public"."purchase_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "purchase_requests" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "public"."RequestStatus_old";
ALTER TABLE "purchase_requests" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;
