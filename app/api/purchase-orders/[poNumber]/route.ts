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
        receipts: {
          include: {
            receivedBy: true,
            items: {
              include: {
                poItem: true
              }
            }
          },
          orderBy: { receivedAt: 'desc' }
        },
        items: {
          orderBy: { itemName: 'asc' },
          include: {
            receiptItems: true, // Include receipt items to calculate total received
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

    // Calculate totals and received quantities
    const itemsWithReceived = purchaseOrder.items.map(item => {
      const quantityReceived = item.receiptItems.reduce((sum, r) => sum + r.quantityReceived, 0);
      return {
        ...item,
        quantityReceived,
        unitPrice: Number(item.unitPrice)
      };
    });

    const totalAmount = itemsWithReceived.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const poWithDetails = {
      ...purchaseOrder,
      items: itemsWithReceived,
      totalAmount: totalAmount
    };

    return NextResponse.json(poWithDetails);

  } catch (error) {
    console.error("[PO_DETAIL_GET]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}