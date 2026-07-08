// app/api/procurement/review-quotation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";

/**
 * ดึงรายการสินค้าที่ขอใบเสนอราคาไปแล้ว (isQuotationRequested = true)
 * เพื่อนำมาบันทึกเลขที่ใบเสนอราคา (Quotation No.) และราคาที่เสนอ (Quoted Unit Price)
 * รวมถึงรายการที่บันทึกไปแล้ว เพื่อให้สามารถแก้ไขได้
 */
export async function GET() {
  try {
    const items = await prisma.requestItem.findMany({
      where: {
        isQuotationRequested: true,
        request: { status: RequestStatus.Approved },
      },
      include: {
        rfq: true,
        request: {
          select: {
            id: true,
            requesterName: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { rfq: { createdAt: "asc" } },
        { itemName: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[REVIEW_QUOTATION_GET]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

/**
 * บันทึกเลขที่ใบเสนอราคา + ราคาที่เสนอ ลงในแต่ละ RequestItem
 * body: { items: [{ id, quotationNumber, quotedUnitPrice }] }
 */
export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "items (Array of {id, quotationNumber, quotedUnitPrice}) is required" },
        { status: 400 }
      );
    }

    // ตรวจสอบข้อมูลก่อนบันทึก
    for (const item of items) {
      if (!item.id) {
        return NextResponse.json({ message: "Each item requires an id" }, { status: 400 });
      }
      if (item.quotedUnitPrice != null && Number(item.quotedUnitPrice) < 0) {
        return NextResponse.json(
          { message: `Quoted unit price must be >= 0 (item ${item.id})` },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      items.map((item: { id: string; quotationNumber?: string | null; quotedUnitPrice?: number | null }) =>
        prisma.requestItem.update({
          where: { id: item.id },
          data: {
            quotationNumber: item.quotationNumber?.trim() || null,
            quotedUnitPrice:
              item.quotedUnitPrice != null && item.quotedUnitPrice !== undefined
                ? Number(item.quotedUnitPrice)
                : null,
            quotedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error) {
    console.error("[REVIEW_QUOTATION_POST]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
