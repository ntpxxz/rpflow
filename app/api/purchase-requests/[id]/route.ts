// app/api/purchase-requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import inventoryPrisma from "@/lib/inventoryPrisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try { 
    const { id } = await params;    
    if (!id) {
      return NextResponse.json({ message: "Request ID is required" }, { status: 400 });
    }
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id }, 
      include: {
        user: true,           
        items: true,
        approvalSteps: {    
          include: {
            approver: true, 
          },
          orderBy: { id: 'asc' } 
        },
        history: {          
          include: {
            actor: true,    
          },
          orderBy: { timestamp: 'desc' }
        },
      },
    });

    if (!purchaseRequest) {
      return NextResponse.json({ message: "Purchase Request not found" }, { status: 404 });
    }

    // 3.1. รวบรวม itemMasterId ทั้งหมด (ที่เป็นค่าจริง ไม่ใช่ null)
    const itemMasterBarcodes = purchaseRequest.items
      .map(item => item.itemMasterBarcode) // 👈 ✅ แก้ไขที่นี่ (ลบ 's' ออก)
      .filter((id): id is string => id !== null && id !== undefined); // กรองค่า null ออก

    let inventoryDetailsMap = new Map<string, { name: string, description: string | null }>();

    if (itemMasterBarcodes.length > 0) {
      // 3.2. ยิง Query ไปยัง Inventory DB
      const inventoryItems = await inventoryPrisma.inventoryItem.findMany({
        where: {
          barcode: { in: itemMasterBarcodes } 
        },
        select: {
          barcode: true,
          name: true,
          description: true
        }
      });

      // 3.3. สร้าง Map เพื่อให้ค้นหาข้อมูลได้ง่าย
      inventoryItems.forEach(item => {
        inventoryDetailsMap.set(item.barcode, { // 👈 ใช้ barcode เป็น key
          name: item.name,
          description: item.description
        });
      });
    }

    // 3.4. ผสานข้อมูล Inventory กลับเข้าไปใน items
    const itemsWithDetails = purchaseRequest.items.map(item => {
      if (!item.itemMasterBarcode) {
        return {
          ...item,
          inventoryDetails: {
            name: item.itemName, // 👈 (ใช้ itemName ที่กรอกเอง)
            description: item.detail || "(Free text item)"
          }
        };
      }
      
      // ถ้าเป็น Item Master
      const details = inventoryDetailsMap.get(item.itemMasterBarcode)
      return {
        ...item,
        inventoryDetails: {
          name: details?.name || item.itemName || "(Name not found in Inventory)", 
          description: details?.description || item.detail || "(Description not found)"
        }
      };
    });
    
    // 3.5. สร้าง Response ใหม่ที่มี items ที่อัปเดตแล้ว
    const responseData = {
      ...purchaseRequest,
      items: itemsWithDetails,
    };
    // --- (สิ้นสุด ส่วนที่เพิ่มเข้ามา) ---

    // 4. 👈 ส่ง responseData กลับไปแทน
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("[PURCHASE_REQUEST_DETAIL_GET]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}