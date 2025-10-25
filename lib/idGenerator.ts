import { prisma as db } from "@/lib/prisma"; // 👈 แก้ path ถ้าจำเป็น

/**
 * สร้าง ID ใน format RF-MMYYYYxxxx (เช่น RF-1020250001)
 */
export async function generateNextRequestId() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM (e.g., 10)
  const year = date.getFullYear().toString(); // YYYY (e.g., 2025)

  // 1. สร้าง Prefix สำหรับเดือนนี้ (e.g., "RF-102025")
  const prefix = `RF-${month}${year}`;

  // 2. ค้นหา ID สุดท้ายที่ขึ้นต้นด้วย prefix นี้
  const lastRequest = await db.purchaseRequest.findFirst({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc', // เรียงจากมากไปน้อย
    },
    select: {
      id: true,
    },
  });

  let nextNumber = 1; // 3. ถ้าเป็นใบแรกของเดือน

  if (lastRequest) {
    // 4. ถ้ามีใบเก่า, ดึงเลข 4 ตัวท้ายมาบวก 1
    const lastNumberStr = lastRequest.id.slice(-4); // ดึง "xxxx"
    const lastNumber = parseInt(lastNumberStr, 10);
    nextNumber = lastNumber + 1;
  }

  // 5. แปลงเป็น "xxxx" (e.g., 1 -> "0001", 123 -> "0123")
  const nextNumberStr = nextNumber.toString().padStart(4, '0');

  return `${prefix}${nextNumberStr}`; // e.g., "RF-1020250001"
}