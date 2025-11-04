// app/api/purchase-requests/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/purchase-requests/{requestId}/submit
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    // TODO: ควรดึง actorId จาก Auth/Session
    const { actorId } = await req.json(); 

    // TODO: นี่คือ Logic การหาผู้อนุมัติ (Approval Logic)
    // คุณต้องไปหา ID ของ "Manager" หรือ "Finance" จากฐานข้อมูล User
    // นี่เป็นตัวอย่าง Hardcode ว่าต้องให้ User ID นี้อนุมัติ
    const managerApproverId = process.env.TEST_APPROVER_ID; // 👈 🔴 HARDCODE: ใส่ ID ของ User ที่เป็น Admin

    if (!actorId || !managerApproverId) {
      return NextResponse.json({ message: "Approver not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. อัปเดตสถานะใบ PR เป็น "กำลังรออนุมัติ"
  
      // 2. สร้างขั้นตอนการอนุมัติ (Approval Steps)
      await tx.approvalStep.createMany({
        data: [
          {
            requestId: requestId,
            stepName: "Manager Approval", // ขั้นตอนที่ 1
            approverId: managerApproverId, // 👈 คนที่ต้องอนุมัติ
            status: "pending",
          },
          // (ถ้ามีขั้นตอนที่ 2 เช่น Finance ก็เพิ่มตรงนี้)
          // {
          //   requestId: requestId,
          //   stepName: "Finance Approval",
          //   approverId: "clx-finance-id", 
          //   status: "Pending",
          // },
        ],
      });

      // 3. สร้าง History
      await tx.requestHistory.create({
        data: {
          requestId: requestId,
          actorId: actorId,
          action: "SUBMITTED",
          details: "Submitted for approval",
        },
      });
    });

    return NextResponse.json({ message: "Request submitted for approval" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}