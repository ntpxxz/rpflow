/*
  Warnings:

  - You are about to drop the `request_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."request_items" DROP CONSTRAINT "request_items_item_master_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."request_items" DROP CONSTRAINT "request_items_request_id_fkey";

-- DropTable
DROP TABLE "public"."request_items";

-- CreateTable
CREATE TABLE "RequestItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "detail" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "RequestItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
