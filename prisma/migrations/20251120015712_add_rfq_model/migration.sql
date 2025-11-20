-- AlterTable
ALTER TABLE "RequestItem" ADD COLUMN     "rfq_id" TEXT;

-- CreateTable
CREATE TABLE "request_for_quotations" (
    "id" TEXT NOT NULL,
    "rfq_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_for_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_for_quotations_rfq_number_key" ON "request_for_quotations"("rfq_number");

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "request_for_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
