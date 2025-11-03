/*
  Warnings:

  - You are about to drop the column `item_master_id` on the `RequestItem` table. All the data in the column will be lost.
  - You are about to drop the column `item_code` on the `item_master` table. All the data in the column will be lost.
  - You are about to drop the column `item_master_id` on the `purchase_order_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[barcode]` on the table `item_master` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `barcode` to the `item_master` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_master_barcode` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."RequestItem" DROP CONSTRAINT "RequestItem_item_master_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchase_order_items" DROP CONSTRAINT "purchase_order_items_item_master_id_fkey";

-- DropIndex
DROP INDEX "public"."item_master_item_code_key";

-- AlterTable
ALTER TABLE "RequestItem" DROP COLUMN "item_master_id",
ADD COLUMN     "item_master_barcode" TEXT;

-- AlterTable
ALTER TABLE "item_master" DROP COLUMN "item_code",
ADD COLUMN     "barcode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "purchase_order_items" DROP COLUMN "item_master_id",
ADD COLUMN     "item_master_barcode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "item_master_barcode_key" ON "item_master"("barcode");

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_item_master_barcode_fkey" FOREIGN KEY ("item_master_barcode") REFERENCES "item_master"("barcode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_master_barcode_fkey" FOREIGN KEY ("item_master_barcode") REFERENCES "item_master"("barcode") ON DELETE RESTRICT ON UPDATE CASCADE;
