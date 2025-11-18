// app/api/approval-steps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // 👈 1. Import Type สำหรับ Transaction
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

//Create Email Template for Requester
/**
 * Generates the email HTML for the requester after an action.
 */
function generateStatusEmailHtml(
  request: { id: string },
  status: "APPROVED" | "REJECTED",
  comment: string | null
): { subject: string; html: string } {
  
  const isApproved = status === "APPROVED";
  
  // Set Subject
  const subject = `[PR Status Update] Your request ${request.id} has been ${status.toLowerCase()}`;
  
  // Set Link
  const viewUrl = `${
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  }/purchase-requests/${request.id}`;

  // Set styles based on status
  let statusBoxStyle = isApproved
    ? "background-color: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;"
    : "background-color: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5;";
  statusBoxStyle += " padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px;";

  const html = `
    <p>Dear Requester,</p>
    <p>Your Purchase Request (PR) <strong>${request.id}</strong> has been updated.</p>
    
    <div style="${statusBoxStyle}">
      STATUS: ${status}
    </div>

    ${comment ? `<p><strong>Approver's Comment:</strong> ${comment}</p>` : ""}

    ${
      isApproved
        ? "<p>Your request has been fully approved and is now being processed by Procurement.</p>"
        : "<p>Your request was rejected. Please review the comment and contact your manager if necessary.</p>"
    }
    
    <br>
    <p>You can view the request details here:</p>
    <a href="${viewUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
      View Request
    </a>
    <br>
    <p>Thank you,</p>
    <p>The System</p>
  `;
  
  return { subject, html };
}
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

    if (!approvalStepId || !newStatus || !actorId) {
      // ... (error handling)
    }

    const newStatusLower = newStatus.toLowerCase();
    if (newStatusLower !== "approved" && newStatusLower !== "rejected") {
      // ... (error handling)
    }

    // 4. 🔻 (MODIFIED) Store the result of the transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      
      // 1. Update Step
      const updatedStep = await tx.approvalStep.update({
        where: { id: approvalStepId },
        data: {
          status: newStatusLower,
          comment: comment,
          approvedAt: newStatusLower === "approved" ? new Date() : null,
        },
      });

      // 2. Create History
      await tx.requestHistory.create({
        data: {
          requestId: updatedStep.requestId,
          actorId: actorId,
          action: newStatus.toUpperCase(),
          details: `Step "${updatedStep.stepName}" by ${actorId}. Comment: ${comment || ''}`,
        },
      });

      // 3. Update main PR (Budget check logic)
      let finalRequest; // 👈 (NEW) To store the final updated PR

      if (newStatusLower === "rejected") {
        finalRequest = await tx.purchaseRequest.update({
          where: { id: updatedStep.requestId },
          data: { status: "rejected" },
          // 5. 🔻 (MODIFIED) Include the user to get their email
          include: { user: { select: { email: true, name: true } } }
        });

      } else if (newStatusLower === "approved") {
        const pendingSteps = await tx.approvalStep.count({
          where: {
            requestId: updatedStep.requestId,
            status: "pending",
          },
        });

        if (pendingSteps === 0) {
          const request = await tx.purchaseRequest.findUnique({
             where: { id: updatedStep.requestId },
             select: { totalAmount: true }
          });
          const totalAmount = Number(request?.totalAmount) || 0;

          const isBudgetOk = await checkAndReserveBudget(tx, updatedStep.requestId, totalAmount);

          if (isBudgetOk) {
            finalRequest = await tx.purchaseRequest.update({
              where: { id: updatedStep.requestId },
              data: { status: "approved" },
              // 5. 🔻 (MODIFIED) Include the user to get their email
              include: { user: { select: { email: true, name: true } } }
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
              finalRequest = await tx.purchaseRequest.update({
              where: { id: updatedStep.requestId },
              data: { status: "rejected" }, 
              include: { user: { select: { email: true, name: true } } }
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
      }

      // 6. 🔻 (NEW) If no final action, just get the current PR
      if (!finalRequest) {
        finalRequest = await tx.purchaseRequest.findUnique({
          where: { id: updatedStep.requestId },
          include: { user: { select: { email: true, name: true } } }
        });
      }
      
      return finalRequest; // 👈 (NEW) Return the final request from the transaction
    });// 7. 🔻 (NEW) Send Email Alert (AFTER the transaction)
    if (updatedRequest && (updatedRequest.status === "approved" || updatedRequest.status === "rejected")) {
      try {
        const requesterEmail = "nattapon.m@minebea.co.th";
        
        if (requesterEmail) {
          const { subject, html } = generateStatusEmailHtml(
            updatedRequest,
            updatedRequest.status === "approved" ? "APPROVED" : "REJECTED",
            comment
          );
          
          console.log(`\n📧 Sending status update email to: ${requesterEmail}`);
          await transporter.sendMail({
            from: `Purchase Request System <${GMAIL_USER}>`,
            to: requesterEmail,
            subject: subject,
            html: html
          });
          console.log("✅ Status update email sent!");

        } else {
          console.warn(`[Email Warn] No email found for requester on PR: ${updatedRequest.id}`);
        }
      } catch (emailError) {
        // Log the error but don't fail the API, the DB update was successful
        console.error("❌ [EMAIL_ERROR] Failed to send status update email:", emailError);
      }
    }

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
 * 
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