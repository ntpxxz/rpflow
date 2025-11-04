// app/api/purchase-requests/route.ts
import { NextResponse, NextRequest } from "next/server"; 
import { prisma as db } from "@/lib/prisma"; 
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { generateNextRequestId } from "@/lib/idGenerator";

// (Zod Schemas - ถูกต้อง)
const itemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"), 
  detail: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
});
type ParsedItem = z.infer<typeof itemSchema>;
const itemsArraySchema = z.array(itemSchema);
const requestTypeEnum = z.enum(["NORMAL", "URGENT", "PROJECT"]);

// --- GET Function (โค้ดนี้ถูกต้อง) ---
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
        approvalSteps: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("[PURCHASE_REQUEST_GET]", error);
    if (error instanceof Error && error.message.includes("Invalid value for argument `status`")) {
      return new NextResponse(JSON.stringify({ message: `Invalid status parameter: ${status}` }), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// --- POST Function (แก้ไข) ---
export async function POST(req: Request) {
  try {
    //
    // 1. 🔻🔻 (เพิ่มโค้ดส่วนที่หายไป) 🔻🔻
    // --- Auth - Test User IDs ---
    const userId = process.env.TEST_REQUESTER_ID; 
    if (!userId) { 
      console.error("Error: TEST_REQUESTER_ID is not set.");
      return new NextResponse("Internal Server Error: Missing test user configuration", { status: 500 });
    }
    const managerApproverId = process.env.TEST_APPROVER_ID || "clx...."; // (ใช้ ID ชั่วคราว)
    if (!managerApproverId) {
      console.error("Error: TEST_APPROVER_ID is not set.");
      return new NextResponse("Internal Server Error: Missing approver configuration", { status: 500 });
    }
    // 🔺🔺 (สิ้นสุดส่วนที่เพิ่ม) 🔺🔺
    //
    
    // --- Parse FormData ---
    const formData = await req.formData();
    const requesterName = formData.get("requesterName") as string;
    const requestType = formData.get("requestType") as string;
    const itemsJson = formData.get("items") as string;

    // --- Validation ---
    if (!requesterName || !requestType || !itemsJson) { 
      return new NextResponse(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
    }
    const validatedRequestType = requestTypeEnum.safeParse(requestType);
    if (!validatedRequestType.success) { 
      return new NextResponse(JSON.stringify({ message: "Invalid request type" }), { status: 400 });
    }
    let parsedItems: ParsedItem[];
    try {
      const rawItems = JSON.parse(itemsJson);
      parsedItems = itemsArraySchema.parse(rawItems); 
    } catch (e) { 
      return new NextResponse(JSON.stringify({ message: "Invalid items JSON" }), { status: 400 });
    }

    // --- Handle File Uploads ---
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
    
    // --- คำนวณ Total Amount ---
    const totalAmount = itemsWithData.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    const newRequestId = await generateNextRequestId();
    
    const purchaseRequest = await db.$transaction(async (tx) => {
      // 6.1. สร้าง PR
      const pr = await tx.purchaseRequest.create({
        data: {
          id: newRequestId,
          userId: userId, // 👈 (ตอนนี้ userId ถูกต้องแล้ว)
          requesterName: requesterName,
          type: validatedRequestType.data,
          status: "pending", // (lowercase ถูกต้อง)
          totalAmount: totalAmount, 
          
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
      // 6.2. สร้าง Approval Step ทันที (ถูกต้อง)
      await tx.approvalStep.create({
        data: {
          requestId: newRequestId,
          stepName: "Manager Approval", 
          approverId: managerApproverId, 
          status: "pending", 
        },
      });

      // 6.3. สร้าง History ทันที (ถูกต้อง)
      await tx.requestHistory.create({
        data: {
          requestId: newRequestId,
          actorId: userId, 
          action: "CREATED & SUBMITTED", 
          details: "Request created and submitted for approval",
        },
      });
      
      
      return pr;
    });

    return NextResponse.json(purchaseRequest, { status: 201 });

  } catch (error: any) {
    // ... (Error handling) ...
    console.error("[PURCHASE_REQUEST_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    if (error.code === 'P2003') {
       console.error("Foreign key constraint violated. Check if TEST_REQUESTER_ID exists in 'users' table.");
       return new NextResponse(JSON.stringify({ message: "Foreign key constraint violated. Ensure the user ID is correct.", code: "P2003" }), { status: 400 });
    }
    if (error.code === 'P2022') {
       console.error("Column does not exist. Did you run 'npx prisma migrate dev'?");
       return new NextResponse(JSON.stringify({ message: "Database schema mismatch. Please run migration.", code: "P2022" }), { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}