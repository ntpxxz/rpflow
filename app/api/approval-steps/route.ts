// app/api/approval-steps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, RequestStatus, ApprovalStatus } from "@prisma/client";
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

// Create Email Template for Requester
function generateStatusEmailHtml(
  request: { id: string },
  status: "APPROVED" | "REJECTED",
  comment: string | null
): { subject: string; html: string } {

  const isApproved = status === "APPROVED";

  // Set Subject
  const subject = `[PR Status Update] Your request ${request.id} has been ${status.toLowerCase()}`;

  // Set Link
  const viewUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3095"}/purchase-requests/${request.id}`;

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

    ${isApproved
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

// GET: Fetch all approval steps
export async function GET(req: NextRequest) {
  try {
    const steps = await prisma.approvalStep.findMany({
      where: {},
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

// PATCH: Update approval step status
export async function PATCH(req: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { approvalStepId, newStatus, comment } = await req.json();

    if (!approvalStepId || !newStatus) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const newStatusLower = newStatus.toLowerCase();
    if (newStatusLower !== "approved" && newStatusLower !== "rejected") {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    // 2. Fetch the approval step to check permissions
    const approvalStep = await prisma.approvalStep.findUnique({
      where: { id: approvalStepId },
      include: { approver: true }
    });

    if (!approvalStep) {
      return NextResponse.json({ message: "Approval step not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // 3. Authorization check: user must be the assigned approver OR an Admin
    if (approvalStep.approverId !== userId && userRole !== "Admin" && userRole !== "Approver") {
      return NextResponse.json({
        message: "Forbidden: You are not authorized to approve this request"
      }, { status: 403 });
    }

    const actorId = userId;

    // Normalize status to Title Case for Prisma Enums
    const prismaStatus = newStatusLower === "approved" ? ApprovalStatus.Approved : ApprovalStatus.Rejected;

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update Step
      const updatedStep = await tx.approvalStep.update({
        where: { id: approvalStepId },
        data: {
          status: prismaStatus,
          comment: comment,
          approvedAt: prismaStatus === ApprovalStatus.Approved ? new Date() : null,
        },
      });

      // 2. Create History
      await tx.requestHistory.create({
        data: {
          requestId: updatedStep.requestId,
          actorId: actorId,
          action: prismaStatus.toUpperCase(),
          details: `Step "${updatedStep.stepName}" by ${session.user?.name || actorId}. Comment: ${comment || ''}`,
        },
      });

      // 3. Update main PR (Budget check logic)
      let finalRequest;

      if (prismaStatus === ApprovalStatus.Rejected) {
        finalRequest = await tx.purchaseRequest.update({
          where: { id: updatedStep.requestId },
          data: { status: RequestStatus.Rejected },
          include: { user: { select: { email: true, userMail: true, name: true } } } // Added userMail
        });
      } else if (prismaStatus === ApprovalStatus.Approved) {
        const pendingSteps = await tx.approvalStep.count({
          where: {
            requestId: updatedStep.requestId,
            status: ApprovalStatus.Pending,
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
              data: { status: RequestStatus.Approved },
              include: { user: { select: { email: true, userMail: true, name: true } } } // Added userMail
            });

            await tx.requestHistory.create({
              data: {
                requestId: updatedStep.requestId,
                actorId: actorId,
                action: "BUDGET_APPROVED",
                details: `Budget check passed (Amount: ${totalAmount}). Ready for PO.`,
              },
            });
          } else {
            finalRequest = await tx.purchaseRequest.update({
              where: { id: updatedStep.requestId },
              data: { status: RequestStatus.Rejected },
              include: { user: { select: { email: true, userMail: true, name: true } } } // Added userMail
            });

            await tx.requestHistory.create({
              data: {
                requestId: updatedStep.requestId,
                actorId: actorId,
                action: "BUDGET_REJECTED",
                details: `Budget check failed. Amount ${totalAmount} exceeds available budget.`,
              },
            });
          }
        }
      }

      if (!finalRequest) {
        finalRequest = await tx.purchaseRequest.findUnique({
          where: { id: updatedStep.requestId },
          include: { user: { select: { email: true, userMail: true, name: true } } } // Added userMail
        });
      }

      return finalRequest;
    });

    // Send Email Alert
    const requestWithUser = updatedRequest as any;
    if (requestWithUser && (requestWithUser.status === RequestStatus.Approved || requestWithUser.status === RequestStatus.Rejected)) {
      try {
        // Use userMail if available, otherwise fallback to login email
        const requesterEmail = requestWithUser.user?.userMail || requestWithUser.user?.email;
        const approverEmail = session.user?.email; // Email of the person who performed the action

        if (requesterEmail) {
          const { subject, html } = generateStatusEmailHtml(
            requestWithUser,
            requestWithUser.status === RequestStatus.Approved ? "APPROVED" : "REJECTED",
            comment
          );

          console.log(`\n📧 Sending status update email to Requester: ${requesterEmail}`);
          console.log(`   - userMail: ${requestWithUser.user?.userMail || 'NOT SET'}`);
          console.log(`   - loginEmail: ${requestWithUser.user?.email}`);

          if (approverEmail) {
            console.log(`   - Reply-To: ${approverEmail}`);
          }

          await transporter.sendMail({
            from: `Purchase Request System <${GMAIL_USER}>`,
            to: requesterEmail,
            replyTo: approverEmail || undefined, // Allow requester to reply to approver
            subject: subject,
            html: html
          });
          console.log("✅ Status update email sent successfully!");
        } else {
          console.warn(`[Email Warn] No email found for requester on PR: ${requestWithUser.id}`);
        }
      } catch (emailError) {
        console.error("❌ [EMAIL_ERROR] Failed to send status update email:", emailError);
      }
    }

    return NextResponse.json({ message: "Status updated" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

async function checkAndReserveBudget(
  tx: Prisma.TransactionClient,
  requestId: string,
  totalAmount: number
): Promise<boolean> {
  console.log(`[Budget Check] Checking budget for Request ID: ${requestId}, Amount: ${totalAmount}`);
  const availableBudget = 100000; // Mock budget

  if (totalAmount <= availableBudget) {
    console.log(`[Budget Check] OK. Budget reserved.`);
    return true;
  } else {
    console.warn(`[Budget Check] FAILED. Not enough budget.`);
    return false;
  }
}