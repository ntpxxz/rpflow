-- DropForeignKey
ALTER TABLE "public"."RequestItem" DROP CONSTRAINT "RequestItem_item_master_id_fkey";

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_item_master_id_fkey" FOREIGN KEY ("item_master_id") REFERENCES "item_master"("item_code") ON DELETE SET NULL ON UPDATE CASCADE;
