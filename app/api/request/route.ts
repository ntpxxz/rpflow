import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all requests
export async function GET() {
  const requests = await prisma.request.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

// POST create request
export async function POST(req: NextRequest) {
  const data = await req.json();
  const newRequest = await prisma.request.create({
    data: {
      userId: data.userId,
      itemName: data.itemName,
      quantity: data.quantity,
      description: data.description,
      imageUrl: data.imageUrl,
    },
  });
  return NextResponse.json(newRequest);
}

// PATCH update request status
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const updated = await prisma.request.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}

// DELETE request
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
  await prisma.request.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
