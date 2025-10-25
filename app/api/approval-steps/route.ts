// app/api/approval-steps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: ดึงรายการทั้งหมดที่ยังรอดำเนินการ (Pending)
export async function GET(req: NextRequest) {
  try {
    const steps = await prisma.approvalStep.findMany({
      where: {
        status: "Pending",
        // TODO: ในอนาคต ควรกรองเฉพาะ 'approverId' ของคนที่ login
      },
      include: {
        request: { // ดึงข้อมูลใบ PR หลักมาด้วย
          include: {
            user: true, // ดึงข้อมูลคนสร้าง PR
            items: {    // ดึงข้อมูลสินค้าใน PR
              include: {
              }
            }
          }
        },
        approver: true // ดึงข้อมูลคนอนุมัติ
      },
      orderBy: { request: { createdAt: "desc" } }
    });
    return NextResponse.json(steps);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { approvalStepId, newStatus, comment, actorId } = await req.json();
    // actorId คือ ID ของคนที่กดปุ่ม (ควรมาจาก Auth)

    if (!approvalStepId || !newStatus || !actorId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // ตรวจสอบค่า newStatus (เพื่อความปลอดภัย)
    if (newStatus !== "Approved" && newStatus !== "Rejected") {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
    }

    // เราใช้ $transaction เพื่อให้แน่ใจว่าทุกอย่างสำเร็จพร้อมกัน
    await prisma.$transaction(async (tx) => {
      
      // 1. อัปเดตขั้นตอน (ApprovalStep)
      const updatedStep = await tx.approvalStep.update({
        where: { id: approvalStepId },
        data: {
          status: newStatus, // "Approved" หรือ "Rejected"
          comment: comment,
          approvedAt: newStatus === "Approved" ? new Date() : null,
        },
      });

      // 2. สร้าง History
      await tx.requestHistory.create({
        data: {
          requestId: updatedStep.requestId,
          actorId: actorId,
          action: newStatus.toUpperCase(), // "APPROVED" หรือ "REJECTED"
          details: `Step "${updatedStep.stepName}" by ${actorId}. Comment: ${comment || ''}`,
        },
      });

      // --- 3. (ส่วนที่แก้ไข) ตรวจสอบและอัปเดตใบ PR หลัก ---

      if (newStatus === "Rejected") {
        // 3.1 ถ้ามีคนปฏิเสธ: ให้ Reject ใบ PR หลักทันที
        await tx.purchaseRequest.update({
          where: { id: updatedStep.requestId },
          data: { status: "Rejected" },
        });

      } else if (newStatus === "Approved") {
        // 3.2 ถ้าอนุมัติ: ให้เช็กว่ามี step อื่นที่ยัง Pending หรือไม่
        const pendingSteps = await tx.approvalStep.count({
          where: {
            requestId: updatedStep.requestId,
            status: "Pending", // 👈 ค้นหาขั้นตอนอื่นที่ยัง "Pending"
          },
        });

        if (pendingSteps === 0) {
          // 3.3 ถ้าไม่มี (pendingSteps = 0) หมายความว่าอนุมัติครบแล้ว
          // ให้อัปเดตใบ PR หลักเป็น "Approved"
          await tx.purchaseRequest.update({
            where: { id: updatedStep.requestId },
            data: { status: "Approved" }, // 👈 พร้อมสำหรับให้ Purchaser สร้าง PO
          });
        }
        // (ถ้ายังมี pendingSteps > 0 ก็ไม่ต้องทำอะไร สถานะ PR จะยังคงเป็น "Approving")
      }
    }); // --- สิ้นสุด Transaction ---

    return NextResponse.json({ message: "Status updated" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}