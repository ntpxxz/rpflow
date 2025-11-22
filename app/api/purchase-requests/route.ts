// app/api/purchase-requests/route.ts
import { NextResponse, NextRequest } from "next/server"; 
import { prisma as db } from "@/lib/prisma"; 
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { generateNextRequestId } from "@/lib/idGenerator";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth"; // 👈 Import เพิ่ม
import { authOptions } from "@/lib/auth";     // 👈 Import เพิ่ม

// ... (ส่วน Zod Schema และ Email Function เหมือนเดิม ไม่ต้องแก้) ...

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

// ... (ฟังก์ชัน generateApprovalEmailHtml เหมือนเดิม) ...
function generateApprovalEmailHtml(
  newRequest: { id: string; requesterName: string },
  total: number,
  items: (ParsedItem & { imageUrl?: string })[],
  requestType: "NORMAL" | "URGENT" | "PROJECT"
) {
    // ... (Code เดิมในฟังก์ชันนี้)
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
  const reviewUrl = `${
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  }/purchase-requests/${newRequest.id}`; 
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

    const subject = `${subjectPrefix}ใบขอซื้อใหม่รออนุมัติ - ${newRequest.requesterName}`;  const html = `
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
    <p>ขอแสดงความนับถือ</P>
  `;
  return {subject, html}
}


// GET Function (เหมือนเดิม)
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
            include: { approver: true } // include approver details
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

// POST Function (แก้ไขส่วน Auth)
export async function POST(req: Request) {
  try {
    // 1. 🟢 Get Session
    const session = await getServerSession(authOptions);
    
    // 2. 🟢 Check if user is logged in
    if (!session || !session.user) {
        return new NextResponse(JSON.stringify({ message: "Unauthorized. Please login." }), { status: 401 });
    }

    // 3. 🟢 Use ID from Session
    const userId = (session.user as any).id;
    
    // Approver ยังคง Hardcode สำหรับ Demo หรือจะเปลี่ยน Logic ในอนาคตก็ได้
    const managerApproverId = process.env.TEST_APPROVER_ID || "user_approver_001"; 

    const formData = await req.formData();
    const requesterName = formData.get("requesterName") as string;
    const requestType = formData.get("requestType") as string;
    const itemsJson = formData.get("items") as string;
    const dueDate = formData.get("dueDate") as string | null; 

    if (!requesterName || !requestType || !itemsJson) { 
      return new NextResponse(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
    }

    const validatedRequestType = requestTypeEnum.safeParse(requestType);
    if (!validatedRequestType.success) { 
      return new NextResponse(JSON.stringify({ message: "Invalid request type" }), { status: 400 });
    }

    // Date Logic
    let finalDueDate: Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (validatedRequestType.data === "NORMAL") {
      finalDueDate = new Date();
      finalDueDate.setDate(finalDueDate.getDate() + 7);
    } else {
      if (!dueDate) {
        return new NextResponse(JSON.stringify({ message: "Due date is required for Urgent/Project" }), { status: 400 });
      }
      finalDueDate = new Date(dueDate);
      if (finalDueDate.getTime() < today.getTime()) {
         return new NextResponse(JSON.stringify({ message: "Due Date cannot be in the past." }), { status: 400 });
      }
    }

    let parsedItems: ParsedItem[];
    try {
      const rawItems = JSON.parse(itemsJson);
      parsedItems = itemsArraySchema.parse(rawItems); 
    } catch (e) { 
      return new NextResponse(JSON.stringify({ message: "Invalid items JSON" }), { status: 400 });
    }

    // Handle File Uploads
    const itemsWithData: (ParsedItem & { imageUrl?: string })[] = [];
    for (let i = 0; i < parsedItems.length; i++) {
       const item = parsedItems[i];
       const file = formData.get(`image_${i}`) as File | null;
       let imageUrl: string | undefined = undefined;
       if (file) {
         const bytes = await file.arrayBuffer();
         const buffer = Buffer.from(bytes);
         const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
         const path = join(process.cwd(), "public", "uploads", filename);
         await writeFile(path, buffer);
         imageUrl = `/uploads/${filename}`;
       }
       itemsWithData.push({ ...item, imageUrl: imageUrl });
    }
    
    const totalAmount = itemsWithData.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const newRequestId = await generateNextRequestId();
    
    const purchaseRequest = await db.$transaction(async (tx) => {
      // Create PR linked to Session User
      const pr = await tx.purchaseRequest.create({
        data: {
          id: newRequestId,
          userId: userId, // 🟢 Linked to logged-in user
          requesterName: requesterName,
          type: validatedRequestType.data,
          status: "pending",
          totalAmount: totalAmount, 
          dueDate: finalDueDate,
          items: {
            create: itemsWithData.map(item => ({
              itemName: item.itemName,         
              detail: item.detail,
              imageUrl: item.imageUrl,       
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      await tx.approvalStep.create({
        data: {
          requestId: newRequestId,
          stepName: "Manager Approval", 
          approverId: managerApproverId, 
          status: "pending", 
        },
      });

      await tx.requestHistory.create({
        data: {
          requestId: newRequestId,
          actorId: userId, // 🟢 Linked to logged-in user
          action: "CREATED & SUBMITTED", 
          details: "Request created and submitted for approval",
        },
      });
      
      return pr;
    });

    // Send Email
    try {
      const APPROVER_EMAIL = "nattapon.m@minebea.co.th"; 
      const { subject, html } = generateApprovalEmailHtml(
        purchaseRequest,
        totalAmount,
        itemsWithData,
        validatedRequestType.data
      );

      console.log(`\n📧 Sending approval email to: ${APPROVER_EMAIL}`);

      await transporter.sendMail({
        from: `Purchase Request System <${GMAIL_USER}>`,
        to: APPROVER_EMAIL, 
        subject: subject, 
        html: html, 
      });
      console.log("✅ Approval email sent!");
      
    } catch (emailError) {
      console.error("❌ [EMAIL_ERROR] Failed to send approval email:", emailError);
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