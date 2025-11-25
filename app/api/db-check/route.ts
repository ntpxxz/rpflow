// app/api/db-check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // ลองเชื่อมต่อ database
        await prisma.$connect();

        // นับจำนวน users
        const userCount = await prisma.user.count();

        // ดึง users 5 คนแรก (ไม่เอา password)
        const users = await prisma.user.findMany({
            take: 5,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        return NextResponse.json({
            status: "connected",
            userCount,
            sampleUsers: users,
            databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'), // ซ่อน password
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                status: "error",
                message: error.message,
                databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
            },
            { status: 500 }
        );
    }
}
