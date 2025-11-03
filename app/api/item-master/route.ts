// app/api/item-master/route.ts
import { NextRequest, NextResponse } from "next/server";
import inventoryPrisma from "@/lib/inventoryPrisma"; // 👈 Import client ใหม่

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || ""; // รับค่า search query (ถ้ามี)

  try {
    // 👇 ใช้ inventoryPrisma query ตาราง inventory
    const items = await inventoryPrisma.inventoryItem.findMany({
      where: {
        // เพิ่มเงื่อนไขค้นหา (ถ้าต้องการ)
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20, // จำกัดจำนวนผลลัพธ์ (ตัวอย่าง)
      orderBy: { name: "asc" },
      select: { // เลือกเฉพาะ field ที่ต้องการส่งกลับ
        barcode: true,
        name: true,
        description: true,
        unit_price: true,
      }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[ITEM_MASTER_GET_INVENTORY]", error);
    // ตรวจสอบ Error การเชื่อมต่อ
    if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
         return NextResponse.json({ message: "Could not connect to Inventory database" }, { status: 503 }); // Service Unavailable
    }
    return NextResponse.json({ message: "Something went wrong fetching items from inventory" }, { status: 500 });
  } finally {
     // พิจารณา disconnect ถ้าไม่ได้ใช้ singleton
     // await inventoryPrisma.$disconnect();
  }
}