// app/api/purchase-orders/[poNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ดึงข้อมูล PO 1 ใบ โดยใช้ poNumber
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poNumber: string }> }
) {
  try {
    const { poNumber } = await params;

    if (!poNumber) {
      return NextResponse.json({ message: "PO Number is required" }, { status: 400 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        poNumber: poNumber, // 👈 ค้นหาด้วย poNumber (ซึ่ง @unique)
      },
      include: {
        items: { // 👈 ดึงรายการสินค้าทั้งหมดใน PO นี้
          orderBy: {
            itemName: 'asc'
          }
        }, 
        // 🔴 TODO: (อนาคต) เมื่อมี Model Vendor
        // vendor: true, 
      }
    });

    if (!purchaseOrder) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    // (คำนวณยอดรวม)
    const totalAmount = purchaseOrder.items.reduce((sum, item) => {
        return sum + (item.quantity * Number(item.unitPrice));
    }, 0);

    const poWithTotal = {
      ...purchaseOrder,
      totalAmount: totalAmount
    };

    return NextResponse.json(poWithTotal);

  } catch (error) {
    console.error("[PO_DETAIL_GET]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}