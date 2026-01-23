// app/api/budget/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { RequestType } from "@prisma/client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || format(new Date(), "yyyy-MM");
    const type = (searchParams.get("type") as RequestType) || "NORMAL";

    try {
        if (!prisma.monthlyBudget) {
            console.error("prisma.monthlyBudget is undefined. You need to run 'npx prisma generate' and restart the server.");
            throw new Error("Database client not updated. Please restart the server.");
        }

        // Fetch budget for specific type
        const budget = await prisma.monthlyBudget.findUnique({
            where: {
                month_type: {
                    month,
                    type
                }
            },
        });

        // Calculate total spent for the month and type
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

        const requests = await prisma.purchaseRequest.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
                status: {
                    in: ["Approved", "Ordered", "Received", "AwaitingQuotation", "Pending"],
                },
                type: type,
            },
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const totalSpent = requests.reduce((sum, req) => sum + Number(req.totalAmount || 0), 0);

        // Fetch all budgets for history (specific type)
        const allBudgets = await prisma.monthlyBudget.findMany({
            where: { type },
            orderBy: { month: "desc" },
            take: 12
        });

        // Fetch current month budgets for ALL types to show summary
        const currentMonthBudgets = await prisma.monthlyBudget.findMany({
            where: { month }
        });

        return NextResponse.json({
            month,
            type,
            budgetAmount: Number(budget?.amount || 0),
            totalSpent,
            remaining: Number(budget?.amount || 0) - totalSpent,
            requests: requests.map(r => ({
                id: r.id,
                requesterName: r.requesterName,
                totalAmount: Number(r.totalAmount),
                status: r.status,
                createdAt: r.createdAt,
                type: r.type
            })),
            history: allBudgets.map(b => ({
                month: b.month,
                amount: Number(b.amount)
            })),
            summary: currentMonthBudgets.map(b => ({
                type: b.type,
                amount: Number(b.amount)
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch budget", error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { month, amount, type } = await req.json();

        if (!month || amount === undefined || !type) {
            return NextResponse.json({ message: "Month, amount, and type are required" }, { status: 400 });
        }

        if (!prisma.monthlyBudget) {
            throw new Error("Database client not updated. Please restart the server.");
        }

        const budget = await prisma.monthlyBudget.upsert({
            where: {
                month_type: {
                    month,
                    type
                }
            },
            update: { amount },
            create: { month, amount, type },
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
        const type = (searchParams.get("type") as RequestType) || "NORMAL";

        if (!month) {
            return NextResponse.json({ message: "Month is required" }, { status: 400 });
        }

        if (!prisma.monthlyBudget) {
            throw new Error("Database client not updated. Please restart the server.");
        }

        await prisma.monthlyBudget.delete({
            where: {
                month_type: {
                    month,
                    type
                }
            },
        });

        return NextResponse.json({ message: "Budget reset successfully" });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ message: "Budget already reset" });
        }
        return NextResponse.json({ message: "Failed to reset budget", error: error.message }, { status: 500 });
    }
}
