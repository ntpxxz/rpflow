// app/api/budget/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || format(new Date(), "yyyy-MM");

    try {
        if (!prisma.monthlyBudget) {
            console.error("prisma.monthlyBudget is undefined. You need to run 'npx prisma generate' and restart the server.");
            throw new Error("Database client not updated. Please restart the server.");
        }

        const budget = await prisma.monthlyBudget.findUnique({
            where: { month },
        });

        // Calculate total spent for the month
        // We'll consider 'Approved' or 'Ordered' requests as spent, or maybe all non-rejected/cancelled?
        // Let's stick to Approved, Ordered, Received, AwaitingQuotation (committed funds)
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

        const requests = await prisma.purchaseRequest.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
                status: {
                    in: ["Approved", "Ordered", "Received", "AwaitingQuotation", "Pending"], // Pending is also potential spend
                },
            },
            select: {
                totalAmount: true,
            },
        });

        const totalSpent = requests.reduce((sum, req) => sum + Number(req.totalAmount || 0), 0);

        return NextResponse.json({
            month,
            budgetAmount: Number(budget?.amount || 0),
            totalSpent,
            remaining: Number(budget?.amount || 0) - totalSpent,
        });
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch budget", error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { month, amount } = await req.json();

        if (!month || amount === undefined) {
            return NextResponse.json({ message: "Month and amount are required" }, { status: 400 });
        }

        if (!prisma.monthlyBudget) {
            throw new Error("Database client not updated. Please restart the server.");
        }

        const budget = await prisma.monthlyBudget.upsert({
            where: { month },
            update: { amount },
            create: { month, amount },
        });

        return NextResponse.json(budget);
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to update budget", error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");

        if (!month) {
            return NextResponse.json({ message: "Month is required" }, { status: 400 });
        }

        if (!prisma.monthlyBudget) {
            throw new Error("Database client not updated. Please restart the server.");
        }

        await prisma.monthlyBudget.delete({
            where: { month },
        });

        return NextResponse.json({ message: "Budget reset successfully" });
    } catch (error: any) {
        // If record doesn't exist, it's fine
        if (error.code === 'P2025') {
            return NextResponse.json({ message: "Budget already reset" });
        }
        return NextResponse.json({ message: "Failed to reset budget", error: error.message }, { status: 500 });
    }
}
