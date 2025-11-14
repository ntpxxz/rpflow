// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextPoNumber } from "@/lib/poNumberGenerator";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";

    // 1.รับ "items" (Array of objects) แทน "requestItemIds" 🔻
    const { items } = await req.json(); //{ requestItemIds }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "items (Array of {id, quotationNumber}) is required" },
        { status: 400 }
      );
    }

    // 2. 🔻 (ใหม่) สร้าง Map และ Array ของ IDs จาก "items" 🔻
    
    // สร้าง Map เพื่อเก็บ { itemId -> quotationNumber }
    const quotationMap = new Map<string, string | null>(
      items.map((item: { id: string; quotationNumber: string | null }) => [
        item.id,
        item.quotationNumber || null,
      ])
    );
    
    // ดึงเฉพาะ IDs ออกมาเป็น Array เพื่อใช้ในการ query
    const requestItemIds = items.map((item: { id: string }) => item.id);
    // 2. 🔺 (สิ้นสุด) 🔺

    const newPoNumber = await generateNextPoNumber();

    const newPurchaseOrder = await prisma.$transaction(async (tx) => {
      
      // 2.1 ดึง RequestItems
      const itemsToOrder = await tx.requestItem.findMany({
        where: {
          id: { in: requestItemIds }, 
          request: {
            status: "approved",
          },
          quantity: {
            gt: prisma.requestItem.fields.quantityOrdered,
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

      // 2.2 สร้าง PO (Header) - (เหมือนเดิม)
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: newPoNumber,
          status: "Sent",
          sentAt: new Date(),
        },
      });

      // 2.3 สร้าง PO Items (วนลูป)
      for (const item of itemsToOrder) {
        const quantityToOrder = item.quantity - item.quantityOrdered;

        // 3.เพิ่ม "quotationNumber" ตอนสร้าง PO Item 🔻
        await tx.purchaseOrderItem.create({
          data: {
            poId: po.id,
            itemName: item.itemName,
            detail: item.detail,
            imageUrl: item.imageUrl,
            quantity: quantityToOrder,
            unitPrice: item.unitPrice,
            requestItemId: item.id,
            quotationNumber: quotationMap.get(item.id) || null, // 👈 (ดึงค่าจาก Map)
          },
        });
        // 3. 🔺 (สิ้นสุด) 🔺

        // 2.4 อัปเดต RequestItem ต้นทาง (เหมือนเดิม)
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quantityOrdered: {
              increment: quantityToOrder,
            },
          },
        });
      }

      // 2.5 อัปเดตสถานะ PR แม่ (เหมือนเดิม)
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

        // 2.6 สร้าง History (เหมือนเดิม)
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