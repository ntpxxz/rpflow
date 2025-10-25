// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // 👈 1. Import singleton client

// GET all users
export async function GET() {
  try { // 👈 2. เพิ่ม Error Handling
    const users = await prisma.user.findMany({ 
      orderBy: { createdAt: "desc" } 
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// POST create user
export async function POST(req: NextRequest) {
  try { // 👈 2. เพิ่ม Error Handling
    const data = await req.json();

    // 3. ใช้งาน camelCase (Prisma จะแมป 'role' ให้เป็น 'admin' หรือ 'user' เอง)
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
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
  try { // 👈 2. เพิ่ม Error Handling
    const { id, ...update } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: update, // 3. 'update' สามารถมี 'name', 'email', 'role' (camelCase)
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(req: NextRequest) {
  try { // 👈 2. เพิ่ม Error Handling
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