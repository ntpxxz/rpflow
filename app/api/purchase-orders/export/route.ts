// app/api/purchase-orders/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET() {
  try {
    // 1. ดึงข้อมูล PO ทั้งหมด
    const orders = await prisma.purchaseOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    // 2. สร้าง Header ของ CSV
    const csvRows = [
      ["PO Number", "Status", "Date", "Items Count", "Total Amount", "Vendor"].join(",")
    ];

    // 3. วนลูปสร้างข้อมูลแต่ละแถว
    for (const po of orders) {
      const totalAmount = po.items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
      
      // จัดรูปแบบข้อมูล (ระวังเรื่องเครื่องหมาย , ในข้อมูล ถ้ามีอาจต้องครอบ "" เพิ่ม)
      const row = [
        po.poNumber,
        po.status,
        format(new Date(po.createdAt), "yyyy-MM-dd HH:mm"),
        po.items.length.toString(),
        totalAmount.toFixed(2),
        "Vendor Name" // (Mockup: ถ้ามี field vendor ก็ใส่ตรงนี้)
      ];
      
      csvRows.push(row.join(","));
    }

    // 4. รวมเป็น String เดียว
    const csvString = csvRows.join("\n");
    
    // 5. ส่งกลับเป็นไฟล์
    return new NextResponse(csvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="purchase_orders_export_${Date.now()}.csv"`,
      },
    });

  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}