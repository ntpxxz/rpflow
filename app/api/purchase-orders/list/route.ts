// app/api/purchase-orders/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ดึงข้อมูล PO ทั้งหมด พร้อมรายการสินค้าและยอดรวม (อย่างง่าย)
 */
export async function GET() {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        // ดึงรายการสินค้าใน PO มาด้วย
        items: true,
      },
      orderBy: {
        createdAt: 'desc' // เอา PO ล่าสุดขึ้นก่อน
      }
    });

    // (คำนวณยอดรวมของแต่ละ PO)
    const posWithTotals = purchaseOrders.map(po => {
      const totalAmount = po.items.reduce((sum, item) => {
        return sum + (item.quantity * Number(item.unitPrice));
      }, 0);
      
      return {
        ...po,
        totalAmount: totalAmount,
        itemCount: po.items.length
      };
    });

    return NextResponse.json(posWithTotals);
  } catch (error) {
    console.error("[PO_LIST_GET]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}