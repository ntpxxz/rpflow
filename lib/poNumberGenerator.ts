// lib/poNumberGenerator.ts
import { prisma as db } from "@/lib/prisma"; // 👈 ใช้ Prisma client ตัวหลัก

/**
 * สร้าง PO Number ใน format PO-MMYYYYxxxx (เช่น PO-1120250001)
 * (Logic นี้ประยุกต์มาจาก lib/idGenerator.ts)
 */
export async function generateNextPoNumber() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM (e.g., 11)
  const year = date.getFullYear().toString(); // YYYY (e.g., 2025)

  // 1. สร้าง Prefix (e.g., "PO-112025")
  const prefix = `PO-${month}${year}`;

  // 2. ค้นหา PO Number สุดท้ายที่ขึ้นต้นด้วย prefix นี้
  const lastPO = await db.purchaseOrder.findFirst({
    where: {
      poNumber: { // 👈 แก้ไข field
        startsWith: prefix,
      },
    },
    orderBy: {
      poNumber: 'desc', // 👈 แก้ไข field
    },
    select: {
      poNumber: true, // 👈 แก้ไข field
    },
  });

  let nextNumber = 1; // 3. ถ้าเป็นใบแรกของเดือน

  if (lastPO) {
    // 4. ถ้ามีใบเก่า, ดึงเลข 4 ตัวท้ายมาบวก 1
    const lastNumberStr = lastPO.poNumber.slice(-4); // 👈 แก้ไข field
    const lastNumber = parseInt(lastNumberStr, 10);
    nextNumber = lastNumber + 1;
  }

  // 5. แปลงเป็น "xxxx" (e.g., 1 -> "0001")
  const nextNumberStr = nextNumber.toString().padStart(4, '0');

  return `${prefix}${nextNumberStr}`; // e.g., "PO-1120250001"
}