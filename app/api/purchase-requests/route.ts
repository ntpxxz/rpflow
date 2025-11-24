import { NextResponse, NextRequest } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { generateNextRequestId } from "@/lib/idGenerator";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// (Zod Schemas)
const itemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  detail: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
});
type ParsedItem = z.infer<typeof itemSchema>;
const itemsArraySchema = z.array(itemSchema);
const requestTypeEnum = z.enum(["NORMAL", "URGENT", "PROJECT"]);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

function generateApprovalEmailHtml(
  newRequest: { id: string; requesterName: string },
  total: number,
  items: (ParsedItem & { imageUrl?: string })[],
  requestType: "NORMAL" | "URGENT" | "PROJECT"
) {
  let typeStyles = "";
  let typeHeaderText = "";
  let subjectPrefix = "";

  switch (requestType) {
    case "URGENT":
      subjectPrefix = "[URGENT] ";
      typeHeaderText = "URGENT REQUEST";
      typeStyles =
        "background-color: #FEE2E2; border: 1px solid #FCA5A5; color: #B91C1C; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px;";
      break;
    case "PROJECT":
      subjectPrefix = "[PROJECT] ";
      typeHeaderText = "PROJECT REQUEST";
      typeStyles =
        "background-color: #DBEAFE; border: 1px solid #93C5FD; color: #1E40AF; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px;";
      break;
    default: // NORMAL
      subjectPrefix = "[New PR] ";
      typeHeaderText = "New Purchase Request";
      typeStyles =
        "background-color: #F3F4F6; border: 1px solid #E5E7EB; color: #374151; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px;";
  }
  const reviewUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/purchase-requests/${newRequest.id}`;
  const itemHtml = items
    .map(
      (item) => `
    <li>
      ${item.itemName} (Qty: ${item.quantity}) - THB ${(
          item.unitPrice * item.quantity
        ).toFixed(2)}
    </li>
  `
    )
    .join("");

  const subject = `${subjectPrefix}ใบขอซื้อใหม่รออนุมัติ - ${newRequest.requesterName}`;
  const html = `
    <p>เรียน Approver,</p>
    <p>มีใบขอซื้อใหม่ (PR) รอการอนุมัติจากคุณ</p>
    <p><strong>ประเภท:</strong> ${requestType}</p>
    <p><strong>ผู้ขอ:</strong> ${newRequest.requesterName}</p>
    <p><strong>มูลค่ารวม:</strong> THB ${total.toFixed(2)}</p>
    <br>
    <strong>รายการ:</strong>
    <ul>
      ${itemHtml}
    </ul>
    <br>
    <p>กรุณาคลิกลิงก์ด้านล่างเพื่อตรวจสอบและอนุมัติ:</p>
    <a href="${reviewUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
      ตรวจสอบใบขอซื้อ
    </a>
    <br>
    <p>ขอบคุณครับ</p>
    <p>ขอแสดงความนับถือ</p>
  `;
  return { subject, html };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status) {
      whereClause.status = status.toLowerCase();
    }

    const requests = await db.purchaseRequest.findMany({
      where: whereClause,
      include: {
        user: true,
        items: true,
        approvalSteps: {
          include: { approver: true }
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("[PURCHASE_REQUEST_GET]", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { items, requestType, dueDate } = body;

    const parsedItems = itemsArraySchema.parse(items);
    const parsedType = requestTypeEnum.parse(requestType);

    const totalAmount = parsedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const newId = await generateNextRequestId();

    const approver = await db.user.findFirst({
      where: { role: { in: ["Approver", "Admin"] } },
    });

    const purchaseRequest = await db.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.create({
        data: {
          id: newId,
          requesterName: session.user?.name || "Unknown",
          userId: (session.user as any).id,
          type: parsedType,
          status: "pending",
          totalAmount,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          items: {
            create: parsedItems.map((item) => ({
              itemName: item.itemName,
              detail: item.detail,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
          approvalSteps: approver
            ? {
              create: {
                stepName: "Manager Approval",
                approverId: approver.id,
                status: "pending",
              },
            }
            : undefined,
        },
        include: { items: true },
      });
      return pr;
    });

    if (approver && approver.email) {
      try {
        const { subject, html } = generateApprovalEmailHtml(
          {
            id: purchaseRequest.id,
            requesterName: purchaseRequest.requesterName,
          },
          totalAmount,
          purchaseRequest.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            detail: item.detail || undefined,
            imageUrl: item.imageUrl || undefined,
          })),
          purchaseRequest.type
        );
        await transporter.sendMail({
          from: GMAIL_USER,
          to: approver.email,
          subject,
          html,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
    }

    return NextResponse.json(purchaseRequest, { status: 201 });
  } catch (error: any) {
    console.error("[PURCHASE_REQUEST_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}