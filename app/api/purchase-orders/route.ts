// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextPoNumber } from "@/lib/poNumberGenerator";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function POST(req: NextRequest) {
  try {
    // 🔴 TODO: เปิดใช้งาน Auth
    const actorId =  process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001" // 👈 ใส่ ID ของ Purchaser/Admin ชั่วคราว

    // 1. 🔻 (แก้ไข) รับ "requestItemIds" (Array) 🔻
    // (นี่คือ Logic ใหม่ที่ตรงกับ Schema ที่เราแก้ไขล่าสุด)
    const { requestItemIds } = await req.json();
    if (!requestItemIds || !Array.isArray(requestItemIds) || requestItemIds.length === 0) {
      return NextResponse.json({ message: "requestItemIds (Array) is required" }, { status: 400 });
    }

    const newPoNumber = await generateNextPoNumber();

    // 2. 🔻 (แก้ไข) Logic การสร้าง PO ใหม่ทั้งหมด 🔻
    const newPurchaseOrder = await prisma.$transaction(async (tx) => {
      
      // 2.1 ดึง RequestItems ทั้งหมดที่ถูกเลือก และยังสั่งไม่ครบ
      const itemsToOrder = await tx.requestItem.findMany({
        where: {
          id: { in: requestItemIds },
          request: {
            status: "approved" // 👈 (lowercase) สำหรับ RequestStatus
          },
          quantity: {
            gt: prisma.requestItem.fields.quantityOrdered 
          }
        },
        include: {
          request: true 
        }
      });

      if (itemsToOrder.length === 0) {
        throw new Error("No valid items to order. They might be already ordered or not approved.");
      }
      
      // 2.2 สร้าง PO (Header)
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: newPoNumber,
          
          // 🔻🔻 --- (แก้ไข Bug ตรงนี้) --- 🔻🔻
          // POStatus ใช้ PascalCase (ตาม schema.prisma)
          status: "Sent", 
          // 🔺🔺 --- (สิ้นสุดการแก้ไข Bug) --- 🔺🔺
          
          sentAt: new Date(),
          // (ลบ requestId ออก เพราะ Schema ใหม่ไม่มีแล้ว)
        },
      });

      // 2.3 สร้าง PO Items (วนลูป)
      for (const item of itemsToOrder) {
        const quantityToOrder = item.quantity - item.quantityOrdered;

        await tx.purchaseOrderItem.create({
          data: {
            poId: po.id,
            itemName: item.itemName,
            detail: item.detail,
            imageUrl: item.imageUrl,
            quantity: quantityToOrder,
            unitPrice: item.unitPrice,
            requestItemId: item.id, // 👈 เชื่อมกลับไปที่ RequestItem
          },
        });

        // 2.4 อัปเดต RequestItem ต้นทาง
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quantityOrdered: {
              increment: quantityToOrder 
            }
          }
        });
      }
      
      // 2.5 อัปเดตสถานะ PR แม่
      const relatedRequestIds = [...new Set(itemsToOrder.map(item => item.requestId))];
      
      for (const reqId of relatedRequestIds) {
         const pendingItems = await tx.requestItem.count({
            where: {
              requestId: reqId,
              quantity: {
                gt: tx.requestItem.fields.quantityOrdered
              }
            }
         });

         if (pendingItems === 0) {
            await tx.purchaseRequest.update({
              where: { id: reqId },
              data: { status: "ordered" } // 👈 (lowercase) สำหรับ RequestStatus
            });
         }
         
         // 2.6 สร้าง History
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
    // (เพิ่มการดักจับ Error P2002 เผื่อไว้)
    if ((error as any).code === 'P2002') {
         return NextResponse.json({ message: "Unique constraint violation. Check poNumber logic or other unique fields.", code: "P2002" }, { status: 409 });
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}