// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// POST create user
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        userMail: data.userMail || null,
      },
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// PATCH update user
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...update } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: update,
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID required" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}