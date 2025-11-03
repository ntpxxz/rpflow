/*
  Warnings:

  - You are about to drop the column `item_master_barcode` on the `RequestItem` table. All the data in the column will be lost.
  - You are about to drop the column `item_master_barcode` on the `purchase_order_items` table. All the data in the column will be lost.
  - You are about to drop the `item_master` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `itemName` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."RequestItem" DROP CONSTRAINT "RequestItem_item_master_barcode_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchase_order_items" DROP CONSTRAINT "purchase_order_items_item_master_barcode_fkey";

-- AlterTable
ALTER TABLE "RequestItem" DROP COLUMN "item_master_barcode";

-- AlterTable
ALTER TABLE "purchase_order_items" DROP COLUMN "item_master_barcode",
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "itemName" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."item_master";
