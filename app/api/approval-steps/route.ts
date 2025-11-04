// app/api/approval-steps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // 👈 1. Import Type สำหรับ Transaction

// GET: ดึงรายการทั้งหมด (ทั้ง Pending และ Done)
export async function GET(req: NextRequest) {
  try {
    // 🔴 TODO: ในอนาคต เมื่อเชื่อม Auth แล้ว
    // ให้ดึง session และเพิ่มเงื่อนไข where: { approverId: session.user.id }
    // เพื่อให้ Approver เห็นเฉพาะงานของตัวเอง
    
    const steps = await prisma.approvalStep.findMany({
      where: {
        // 2. 🔻🔻 (แก้ไขจากเดิม) 🔻🔻
        // ลบเงื่อนไข status: "Pending" ออก
        // เพื่อให้ดึงข้อมูลทั้งที่รออนุมัติและที่อนุมัติไปแล้ว (สำหรับ Tab History)
      },
      // 🔺🔺 (สิ้นสุดการแก้ไข) 🔺🔺
      include: {
        request: { 
          include: {
            user: true, 
            items: true
          }
        },
        approver: true 
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

    const newStatusLower = newStatus.toLowerCase();
    if (newStatusLower !== "approved" && newStatusLower !== "rejected") {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
    }
    // เราใช้ $transaction เพื่อให้แน่ใจว่าทุกอย่างสำเร็จพร้อมกัน
    await prisma.$transaction(async (tx) => {
      
      // 1. อัปเดตขั้นตอน (ApprovalStep)
      const updatedStep = await tx.approvalStep.update({
        where: { id: approvalStepId },
        data: {
          status: newStatusLower, 
          comment: comment,
          approvedAt: newStatusLower === "approved" ? new Date() : null,
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

      if (newStatusLower === "rejected") {
        // 3.1 ถ้ามีคนปฏิเสธ: ให้ Reject ใบ PR หลักทันที
        await tx.purchaseRequest.update({
          where: { id: updatedStep.requestId },
          data: { status: "rejected" },
        });

      } else if (newStatusLower === "approved") {
        // 3.2 ถ้าอนุมัติ: ให้เช็กว่ามี step อื่นที่ยัง Pending หรือไม่
        const pendingSteps = await tx.approvalStep.count({
          where: {
            requestId: updatedStep.requestId,
            status: "pending", 
          },
        });

        // 🔻🔻 --- 4. (ส่วนที่เพิ่มเข้ามาตาม Flowchart) --- 🔻🔻
        if (pendingSteps === 0) {
          // 4.1 ถ้าไม่มี (pendingSteps = 0) หมายความว่าอนุมัติครบทุกขั้นตอนแล้ว
          // ...ให้ทำการ "ตรวจสอบงบประมาณ" (Budget Check) ต่อ...
          
          // 4.2 ดึงยอดเงินรวมของใบ PR นี้
          const request = await tx.purchaseRequest.findUnique({
             where: { id: updatedStep.requestId },
             select: { totalAmount: true }
          });
          const totalAmount = Number(request?.totalAmount) || 0;

          // 4.3 (จำลอง) เรียกฟังก์ชันตรวจสอบและจองงบประมาณ
          // เราส่ง `tx` เข้าไปด้วย เพื่อให้การจองงบอยู่ใน Transaction เดียวกัน
          const isBudgetOk = await checkAndReserveBudget(tx, updatedStep.requestId, totalAmount);

          if (isBudgetOk) {
            // 4.4 ถ้า งบ OK: อัปเดตใบ PR หลักเป็น "Approved"
            // (สถานะนี้จะทำให้แผนกจัดซื้อ (Procurement) เห็นในคิวงาน)
            await tx.purchaseRequest.update({
              where: { id: updatedStep.requestId },
              data: { status: "approved" },
            });
            
            // (บันทึก History ว่า Budget OK)
            await tx.requestHistory.create({
              data: {
                requestId: updatedStep.requestId,
                actorId: actorId, // หรือใช้ ID ของ "System"
                action: "BUDGET_APPROVED",
                details: `Budget check passed (Amount: ${totalAmount}). Ready for PO.`,
              },
            });

          } else {
            // 4.5 ถ้า งบไม่พอ (Budget OK? -> No): อัปเดตใบ PR หลักเป็น "Rejected"
            await tx.purchaseRequest.update({
              where: { id: updatedStep.requestId },
              data: { status: "rejected" }, 
            });
            
            // (บันทึก History ว่า งบไม่พอ)
             await tx.requestHistory.create({
              data: {
                requestId: updatedStep.requestId,
                actorId: actorId, // หรือใช้ ID ของ "System"
                action: "BUDGET_REJECTED",
                details: `Budget check failed. Amount ${totalAmount} exceeds available budget.`,
              },
            });
          }
        }
        // (ถ้ายังมี pendingSteps > 0 ก็ไม่ต้องทำอะไร สถานะ PR จะยังคงเป็น "Approving")
        // 🔺🔺 --- (สิ้นสุดส่วนที่เพิ่มเข้ามา) --- 🔺🔺
      }
    }); // --- สิ้นสุด Transaction ---

    return NextResponse.json({ message: "Status updated" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

/**
 * 🔻🔻 (ฟังก์ชันใหม่ที่ต้องสร้าง) 🔻🔻
 * ฟังก์ชันจำลองสำหรับตรวจสอบและจองงบประมาณ
 * * @param tx - Prisma Transaction Client (เพื่อให้การจองงบอยู่ใน Transaction เดียวกัน)
 * @param requestId - ID ของใบ PR
 * @param totalAmount - ยอดเงินที่ขอ
 * @returns Promise<boolean> - คืนค่า true ถ้างบพอ, false ถ้างบไม่พอ
 */
async function checkAndReserveBudget(
  tx: Prisma.TransactionClient,
  requestId: string,
  totalAmount: number
): Promise<boolean> {
  
  // 🔴 TODO: นี่คือ Logic จำลอง (Mock Logic)
  // คุณต้องสร้างระบบงบประมาณจริง (เช่น สร้างตาราง Budget ใน Prisma)
  // และเขียน Logic Query/Update ในส่วนนี้แทน

  console.log(`[Budget Check] Checking budget for Request ID: ${requestId}, Amount: ${totalAmount}`);

  // 1. (สมมติ) ดึงงบประมาณคงเหลือของแผนกนี้
  // (ตอนนี้เรายังไม่มี "แผนก" ใน PR, จึงสมมติเป็นงบรวม)
  // const departmentBudget = await tx.budget.findUnique({ where: { department: '...' } });
  const availableBudget = 100000; // 👈 (ตัวเลขสมมติ)

  // 2. เปรียบเทียบ
  if (totalAmount <= availableBudget) {
    // 3. ถ้างบพอ -> "จอง" งบประมาณ (Reserve Budget)
    // await tx.budget.update({
    //   where: { id: departmentBudget.id },
    //   data: {
    //     remainingAmount: departmentBudget.remainingAmount - totalAmount,
    //     reservedAmount: departmentBudget.reservedAmount + totalAmount
    //   }
    // });
    
    console.log(`[Budget Check] OK. Budget reserved.`);
    return true;
  } else {
    // 4. ถ้างบไม่พอ
    console.warn(`[Budget Check] FAILED. Not enough budget.`);
    return false;
  }
}