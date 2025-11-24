// app/api/purchase-orders/[poNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";

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
        poNumber: poNumber,
      },
      include: {
        items: {
          orderBy: { itemName: 'asc' },
          // 🟢 เพิ่มการดึงข้อมูล Request และความสัมพันธ์ที่เกี่ยวข้อง
          include: {
            requestItem: {
              include: {
                request: {
                  include: {
                    user: true, // Requester info
                    approvalSteps: {
                      include: {
                        approver: true // Approver info
                      },
                      where: {
                        status: ApprovalStatus.Approved // เอาเฉพาะคนที่อนุมัติแล้ว
                      },
                      orderBy: {
                        approvedAt: 'desc' // เอาคนล่าสุด
                      },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        },
      }
    });

    if (!purchaseOrder) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    // คำนวณยอดรวม (เหมือนเดิม)
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