// lib/rfqNumberGenerator.ts
import { prisma as db } from "@/lib/prisma";

export async function generateNextRfqNumber() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  const day = date.getDate().toString().padStart(2, '0');

  const prefix = `RPQ-${year}${month}-`; 

  const lastRFQ = await db.requestForQuotation.findFirst({
    where: {
      rfqNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      rfqNumber: 'desc',
    },
  });

  let nextNumber = 1;

  if (lastRFQ) {
    // ดึง 3 ตัวท้ายมาบวก 1
    const lastNumberStr = lastRFQ.rfqNumber.slice(-3); 
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const nextNumberStr = nextNumber.toString().padStart(3, '0');
  return `${prefix}${nextNumberStr}`;
}