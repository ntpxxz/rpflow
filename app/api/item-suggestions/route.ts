// app/api/item-suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";

  if (query.length < 2) {
    return NextResponse.json([]); // ไม่ต้องค้นหาถ้าคำสั้นไป
  }

  try {
    // ค้นหา itemName ที่ตรงกัน, จัดกลุ่ม, เอาอันล่าสุด
    // หมายเหตุ: การ Query แบบนี้อาจจะช้าถ้าข้อมูลเยอะมากๆ
    const suggestions = await db.requestItem.findMany({
      where: {
        itemName: {
          contains: query,
          mode: 'insensitive', // ค้นหาแบบไม่สน case
        },
      },
      orderBy: {
        request: {
          createdAt: 'desc', // เอาอันที่สร้างล่าสุดก่อน
        },
      },
      distinct: ['itemName', 'detail'], // เอาเฉพาะคู่ itemName/detail ที่ไม่ซ้ำกัน
      take: 10, // จำกัดจำนวนผลลัพธ์
      select: {
        itemName: true,
        detail: true,
        unitPrice: true, // เอา unitPrice ล่าสุดมาด้วย
      },
    });
    
    // อาจจะต้องจัดกลุ่มผลลัพธ์เพิ่มเติมถ้า distinct ยังไม่พอ
     const uniqueSuggestions = suggestions.reduce((acc, current) => {
        if (!acc.some(item => item.itemName === current.itemName && item.detail === current.detail)) {
            acc.push({
                name: current.itemName,
                detail: current.detail ?? undefined, // ใช้ undefined ถ้าเป็น null
                lastPrice: Number(current.unitPrice) // แปลงเป็น Number
            });
        }
        return acc;
     }, [] as { name: string; detail?: string; lastPrice: number }[]);


    return NextResponse.json(uniqueSuggestions);

  } catch (error) {
    console.error("[ITEM_SUGGESTIONS_GET]", error);
    return NextResponse.json({ message: "Failed to fetch suggestions" }, { status: 500 });
  }
}