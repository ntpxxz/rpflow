// app/api/request-quotation/next-number/route.ts
import { NextResponse } from "next/server";
import { generateNextRfqNumber } from "@/lib/rfqNumberGenerator";

export const dynamic = 'force-dynamic'; // เพื่อให้ไม่ cache เลข

export async function GET() {
  try {
    const rfqNumber = await generateNextRfqNumber();
    return NextResponse.json({ rfqNumber });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate number" }, { status: 500 });
  }
}