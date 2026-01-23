-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'awaiting_quotation';

-- DropForeignKey
ALTER TABLE "RequestItem" DROP CONSTRAINT "RequestItem_requestId_fkey";

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "is_over_budget" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_mail" TEXT;

-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_month_key" ON "monthly_budgets"("month");

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
