// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
// (สมมติว่าคุณได้ตั้งค่า 'authOptions' จาก NextAuth แล้ว)
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบสิทธิ์ (Authentication)
    // 🔴 TODO: เปิดใช้งานส่วนนี้เมื่อติดตั้ง NextAuth
    /*
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "PURCHASER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const actorId = session.user.id;
    */
    
    // 🔴 TODO: ลบ Hardcode นี้เมื่อเปิดใช้ Auth
    const actorId = "clx...."; // 👈 ใส่ ID ของ User ที่เป็น Purchaser/Admin ชั่วคราว

    const { purchaseRequestId } = await req.json();
    if (!purchaseRequestId) {
      return NextResponse.json({ message: "PurchaseRequest ID is required" }, { status: 400 });
    }

    // 2. ใช้ Transaction เพื่อความปลอดภัย
    const newPurchaseOrder = await prisma.$transaction(async (tx) => {
      
      // 2.1 ดึงข้อมูลใบขอซื้อและสินค้า
      const request = await tx.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
        include: { items: true },
      });

      // 2.2 ตรวจสอบสถานะ
      if (!request) throw new Error("Request not found");
      if (request.status !== "Approved") {
        throw new Error("Request is not approved yet");
      }

      // 2.3 สร้าง PO (Header)
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: `PO-${Date.now()}`, // TODO: สร้างเลข PO ที่ดีกว่านี้
          status: "Sent", // (สมมติว่าสร้างแล้วส่งเลย)
          requestId: request.id,
          sentAt: new Date(),
        },
      });

      // 2.4 คัดลอกรายการสินค้าจาก Request ไปยัง PO
      await tx.purchaseOrderItem.createMany({
        data: request.items.map((item) => ({
          poId: po.id,
          itemMasterId: item.itemMasterId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      // 2.5 อัปเดตสถานะใบขอซื้อเดิมเป็น "สั่งแล้ว"
      await tx.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "Ordered" },
      });

      // 2.6 สร้าง History
      await tx.requestHistory.create({
        data: {
          requestId: request.id,
          actorId: actorId,
          action: "PO_CREATED",
          details: `Created Purchase Order ${po.poNumber}`,
        },
      });

      return po;
    });

    return NextResponse.json(newPurchaseOrder, { status: 201 });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}