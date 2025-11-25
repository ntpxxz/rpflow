// app/api/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST() {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);

        // Create users
        const users = [
            {
                id: 'user_requester_001',
                name: 'Test Requester',
                email: 'requester@example.com',
                password: hashedPassword,
                role: UserRole.Requester,
            },
            {
                id: 'user_approver_001',
                name: 'Test Approver',
                email: 'approver@example.com',
                password: hashedPassword,
                role: UserRole.Approver,
            },
            {
                id: 'user_purchaser_001',
                name: 'Test Purchaser',
                email: 'purchaser@example.com',
                password: hashedPassword,
                role: UserRole.Purchaser,
            },
            {
                id: 'user_admin_001',
                name: 'Test Admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: UserRole.Admin,
            },
        ];

        for (const user of users) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    role: user.role,
                    password: user.password,
                },
                create: user,
            });
        }

        return NextResponse.json({
            message: "Database seeded successfully",
            users: users.map(u => ({ email: u.email, role: u.role }))
        });
    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json({
            message: "Failed to seed database",
            error: error.message
        }, { status: 500 });
    }
}
