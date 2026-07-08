-- AlterTable
ALTER TABLE "RequestItem" ADD COLUMN     "quotation_number" TEXT,
ADD COLUMN     "quoted_unit_price" DECIMAL(10,2),
ADD COLUMN     "quoted_at" TIMESTAMP(3);
