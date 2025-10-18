import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all users
export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(users);
}

// POST create user
export async function POST(req: NextRequest) {
  const data = await req.json();
  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
    },
  });
  return NextResponse.json(newUser);
}

// PATCH update user
export async function PATCH(req: NextRequest) {
  const { id, ...update } = await req.json();
  const updatedUser = await prisma.user.update({
    where: { id },
    data: update,
  });
  return NextResponse.json(updatedUser);
}

// DELETE user
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
