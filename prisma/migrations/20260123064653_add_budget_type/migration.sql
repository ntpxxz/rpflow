/*
  Warnings:

  - A unique constraint covering the columns `[month,type]` on the table `monthly_budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "monthly_budgets_month_key";

-- AlterTable
ALTER TABLE "monthly_budgets" ADD COLUMN     "type" "RequestType" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_month_type_key" ON "monthly_budgets"("month", "type");
