// app/api/purchase-requests/set-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";

/**
 * API สำหรับ Batch Update สถานะของ Purchase Requests
 * (เช่น ย้ายจาก 'approved' ไป 'awaitingQuotation')
 */
export async function PATCH(req: NextRequest) {
  try {
    // 🔴 TODO: (อนาคต) เพิ่มการตรวจสอบ Role (ต้องเป็น Purchaser/Admin)
    // const actorId = ...

    let { requestIds, newStatus } = await req.json();

    if (!Array.isArray(requestIds) || requestIds.length === 0 || !newStatus) {
      return NextResponse.json({ message: "requestIds (Array) and newStatus are required" }, { status: 400 });
    }

    // Normalize status
    if (newStatus === "Approved") newStatus = "approved";
    if (newStatus === "awaitingQuotation") newStatus = "awaiting_quotation";

    // (Validate สถานะใหม่)
    if (newStatus !== "awaiting_quotation" && newStatus !== "approved") {
      return NextResponse.json({ message: "Invalid target status" }, { status: 400 });
    }

    await prisma.purchaseRequest.updateMany({
      where: {
        id: { in: requestIds },
        // (อัปเดตจากสถานะที่ถูกต้องเท่านั้น)
        status: { in: [RequestStatus.Approved as any, RequestStatus.AwaitingQuotation as any] }
      },
      data: {
        status: newStatus as any
      }
    });

    // (TODO: อาจจะต้องสร้าง History loop)

    return NextResponse.json({ message: "Status updated for " + requestIds.length + " requests." });

  } catch (error) {
    console.error("[SET_REQUEST_STATUS_PATCH]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}