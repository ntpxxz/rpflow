// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextPoNumber } from "@/lib/poNumberGenerator";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";

    // 1. รับ "items" (Array of objects) 
    // 🔻 (แก้ไข) คาดหวัง unitPrice และ quantity ใน payload ด้วย
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "items (Array of {id, quotationNumber, unitPrice, quantity}) is required" },
        { status: 400 }
      );
    }

    // 2. สร้าง Map เพื่อเก็บ Item Details จาก Frontend
    const itemDetailsMap = new Map<string, { quotationNumber: string | null, unitPrice: number | undefined, quantity?: number }>(
      items.map((item: { id: string; quotationNumber: string | null; unitPrice?: number; quantity?: number }) => [
        item.id,
        {
          quotationNumber: item.quotationNumber || null,
          unitPrice: item.unitPrice,
          quantity: item.quantity // 🟢 รับ Quantity ที่แก้ไขแล้ว
        },
      ])
    );

    const requestItemIds = items.map((item: { id: string }) => item.id);

    const newPoNumber = await generateNextPoNumber();

    const newPurchaseOrder = await prisma.$transaction(async (tx) => {

      // 2.1 ดึง RequestItems ต้นทาง
      const itemsToOrder = await tx.requestItem.findMany({
        where: {
          id: { in: requestItemIds },
          request: {
            status: "approved",
          },
          quantity: {
            gt: tx.requestItem.fields.quantityOrdered,
          },
        },
        include: {
          request: true,
        },
      });

      if (itemsToOrder.length === 0) {
        throw new Error(
          "No valid items to order. They might be already ordered or not approved."
        );
      }

      // 2.2 สร้าง PO (Header)
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: newPoNumber,
          status: "Sent",
          sentAt: new Date(),
        },
      });

      // 2.3 สร้าง PO Items (วนลูป)
      for (const item of itemsToOrder) {
        const details = itemDetailsMap.get(item.id);

        // 🟢 FIX: ใช้ Quantity จาก Frontend ถ้ามี, ถ้าไม่มีใช้ Quantity ที่เหลือจาก DB
        const maxAvailableQuantity = item.quantity - item.quantityOrdered;

        const quantityToOrder =
          (details?.quantity !== undefined && details.quantity <= maxAvailableQuantity)
            ? details.quantity
            : maxAvailableQuantity; // ใช้ QTY ที่ส่งมา แต่ต้องไม่เกินที่เหลือ

        // ใช้ราคาที่ส่งมาจาก Frontend ถ้ามี
        const finalUnitPrice =
          details?.unitPrice !== undefined ?
            new Decimal(details.unitPrice) :
            item.unitPrice;

        // 2.4 สร้าง PurchaseOrderItem
        await tx.purchaseOrderItem.create({
          data: {
            poId: po.id,
            itemName: item.itemName,
            detail: item.detail,
            imageUrl: item.imageUrl,
            quantity: quantityToOrder, // 🟢 ใช้ Quantity ที่แก้ไขแล้ว
            unitPrice: finalUnitPrice,
            requestItemId: item.id,
            quotationNumber: details?.quotationNumber || null,
          },
        });

        // 2.5 อัปเดต RequestItem ต้นทาง
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quantityOrdered: {
              increment: quantityToOrder, // 🟢 ใช้ Quantity ที่แก้ไขแล้ว
            },
          },
        });
      }

      // ... (อัปเดตสถานะ PR แม่ และ History - เหมือนเดิม)
      const relatedRequestIds = [
        ...new Set(itemsToOrder.map((item) => item.requestId)),
      ];

      for (const reqId of relatedRequestIds) {
        const pendingItems = await tx.requestItem.count({
          where: {
            requestId: reqId,
            quantity: {
              gt: tx.requestItem.fields.quantityOrdered,
            },
          },
        });

        if (pendingItems === 0) {
          await tx.purchaseRequest.update({
            where: { id: reqId },
            data: { status: "ordered" },
          });
        }

        await tx.requestHistory.create({
          data: {
            requestId: reqId,
            actorId: actorId,
            action: "PO_CREATED",
            details: `Items ordered on Purchase Order ${po.poNumber}`,
          },
        });
      }

      return po;
    });

    return NextResponse.json(newPurchaseOrder, { status: 201 });

  } catch (error) {
    console.error("[PURCHASE_ORDER_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Error";
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Unique constraint violation. Check poNumber logic or other unique fields.",
          code: "P2002",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}