/*
  Warnings:

  - You are about to drop the column `request_id` on the `purchase_orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[request_id,step_name,approver_id]` on the table `approval_steps` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."purchase_orders" DROP CONSTRAINT "purchase_orders_request_id_fkey";

-- DropIndex
DROP INDEX "public"."purchase_orders_request_id_key";

-- AlterTable
ALTER TABLE "RequestItem" ADD COLUMN     "quantity_ordered" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "request_item_id" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "request_id";

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_request_id_step_name_approver_id_key" ON "approval_steps"("request_id", "step_name", "approver_id");

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "RequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
