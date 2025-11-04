// app/api/procurement/queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ดึงข้อมูล Items ทั้งหมดที่พร้อมสำหรับ Procurement
 * (มาจาก PR ที่ "approved" และยังสั่งของไม่ครบ)
 */
async function getProcurementQueue() {
  const items = await prisma.requestItem.findMany({
    where: {
      // 1. ต้องมาจาก PR ที่ "approved"
      request: {
        status: "approved", // (lowercase)
      },
      // 2. ต้องมีของค้างสั่ง
      // (เช็คว่า quantity > quantityOrdered)
      quantity: {
        gt: prisma.requestItem.fields.quantityOrdered,
      },
    },
    include: {
      // ดึงข้อมูล PR แม่มาด้วยเพื่อแสดงผล
      request: { 
        select: {
          id: true,
          requesterName: true,
          user: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: {
      request: {
        createdAt: 'asc' // เอาของที่ค้างนานที่สุดขึ้นก่อน
      }
    }
  });
  return items;
}

export async function GET() {
  try {
    const items = await getProcurementQueue();
    return NextResponse.json(items);
  } catch (error) {
    console.error("[PROCUREMENT_QUEUE_GET]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}