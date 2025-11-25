// app/api/users/hash-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * API สำหรับ hash password ของ user ที่มีอยู่แล้วใน database
 * ใช้เมื่อ user มี password เป็น plain text หรือต้องการเปลี่ยน password
 */
export async function POST(req: NextRequest) {
    try {
        const { email, newPassword } = await req.json();

        if (!email || !newPassword) {
            return NextResponse.json(
                { message: "Email and newPassword are required" },
                { status: 400 }
            );
        }

        // ตรวจสอบว่า user มีอยู่หรือไม่
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Hash password ใหม่
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password ใน database
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        return NextResponse.json({
            message: "Password updated successfully",
            email: user.email,
        });
    } catch (error: any) {
        console.error("Hash password error:", error);
        return NextResponse.json(
            { message: "Failed to update password", error: error.message },
            { status: 500 }
        );
    }
}

/**
 * API สำหรับ hash password ของ user หลายคนพร้อมกัน
 * ส่ง array ของ { email, password }
 */
export async function PATCH(req: NextRequest) {
    try {
        const { users } = await req.json();

        if (!Array.isArray(users) || users.length === 0) {
            return NextResponse.json(
                { message: "users array is required" },
                { status: 400 }
            );
        }

        const results = [];

        for (const userData of users) {
            const { email, password } = userData;

            if (!email || !password) {
                results.push({ email, status: "skipped", reason: "Missing email or password" });
                continue;
            }

            try {
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user) {
                    results.push({ email, status: "failed", reason: "User not found" });
                    continue;
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                await prisma.user.update({
                    where: { email },
                    data: { password: hashedPassword },
                });

                results.push({ email, status: "success" });
            } catch (error: any) {
                results.push({ email, status: "failed", reason: error.message });
            }
        }

        return NextResponse.json({
            message: "Batch password update completed",
            results,
        });
    } catch (error: any) {
        console.error("Batch hash password error:", error);
        return NextResponse.json(
            { message: "Failed to update passwords", error: error.message },
            { status: 500 }
        );
    }
}
