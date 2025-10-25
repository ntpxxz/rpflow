import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma"; // 👈 Your import is correct
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { generateNextRequestId } from "@/lib/idGenerator";
// (Commented out for testing - Keep these lines)
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- (Zod Schemas - No changes) ---
const itemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  detail: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
});
type ParsedItem = z.infer<typeof itemSchema>;
type ItemWithImageUrl = ParsedItem & {
  imageUrl: string | undefined;
};
const itemsArraySchema = z.array(itemSchema);
const requestTypeEnum = z.enum(["NORMAL", "URGENT", "PROJECT"]);

// --- GET Function (No changes - Already fixed for testing) ---
export async function GET() {
  // const session = await getServerSession(authOptions);
  // if (!session) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const requests = await db.purchaseRequest.findMany({
      include: {
        user: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("[PURCHASE_REQUEST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// --- POST Function (Fixes applied) ---
export async function POST(req: Request) {
  try {
    // --- Authentication (Commented out for testing) ---
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== "REQUESTER") {
    //   return new NextResponse("Unauthorized", { status: 401 });
    // }
    // const userId = session.user.id;
    // const userName = session.user.name; // Use session name if available

    // ⬇️⬇️⬇️ FIX 1: Add Hardcoded userId for testing ⬇️⬇️⬇️
    // 🔴 TODO: Replace with a REAL User ID from your 'users' table
    const userId = "clx...."; // Example: Replace with a valid CUID

    // --- Parse FormData ---
    const formData = await req.formData();
    // ⬇️⬇️⬇️ FIX 2: Use hardcoded name OR formData name ⬇️⬇️⬇️
    const requesterName = formData.get("requesterName") as string || "Test User"; // Fallback name
    const requestType = formData.get("requestType") as string;
    const itemsJson = formData.get("items") as string;

    // --- Validation (Basic & Enum/JSON) - No changes ---
    if (!requesterName || !requestType || !itemsJson) { // userId is now hardcoded
      return new NextResponse("Missing required fields", { status: 400 });
    }
    const validatedRequestType = requestTypeEnum.safeParse(requestType);
    if (!validatedRequestType.success) {
      return new NextResponse("Invalid request type", { status: 400 });
    }
    let parsedItems;
    try {
      const rawItems = JSON.parse(itemsJson);
      parsedItems = itemsArraySchema.parse(rawItems);
    } catch (e) {
      return new NextResponse("Invalid items JSON format", { status: 400 });
    }
    if (parsedItems.length === 0) {
      return new NextResponse("Cannot create request with no items", { status: 400 });
    }

    // --- Handle File Uploads (No changes) ---
    const itemsWithImages: ItemWithImageUrl[] = [];
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
      itemsWithImages.push({
        ...item,
        imageUrl: imageUrl,
      });
    }

    // --- Create Database Record (Transaction) ---
    const newRequestId = await generateNextRequestId();
    const purchaseRequest = await db.purchaseRequest.create({
      data: {
        id: newRequestId,
        userId: userId, // ✅ Use the hardcoded userId
        requesterName: requesterName, // ✅ Use name from formData or fallback
        type: validatedRequestType.data,
        status: "Pending",
        items: {
          create: itemsWithImages,
        },
      },
      // ⬇️⬇️⬇️ FIX 3: Add 'include' back ⬇️⬇️⬇️
      include: {
        items: true, // Send items data back in the response
      },
    });

    return NextResponse.json(purchaseRequest, { status: 201 });

  } catch (error) {
    console.error("[PURCHASE_REQUEST_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}