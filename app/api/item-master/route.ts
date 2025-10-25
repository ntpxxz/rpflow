// app/api/item-master/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all items from ItemMaster
export async function GET() {
  try {
    const items = await prisma.itemMaster.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}