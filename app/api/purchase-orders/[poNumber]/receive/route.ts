// app/api/purchase-orders/[poNumber]/receive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ poNumber: string }> }) {
    const { poNumber } = await params;

    try {
        const body = await req.json();
        const { receivedItems, notes, receivedById } = body;
        // receivedItems: { poItemId: string, quantity: number }[]

        if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
            return NextResponse.json({ message: "Invalid received items" }, { status: 400 });
        }

        const po = await prisma.purchaseOrder.findUnique({
            where: { poNumber },
            include: { items: { include: { receiptItems: true } } }
        });

        if (!po) return NextResponse.json({ message: "PO not found" }, { status: 404 });

        // Create GoodsReceipt and Items in a transaction
        const receipt = await prisma.$transaction(async (tx) => {
            // 1. Create GoodsReceipt
            const newReceipt = await tx.goodsReceipt.create({
                data: {
                    poId: po.id,
                    receivedById: receivedById || "user_admin_001", // TODO: Get from session
                    notes,
                    items: {
                        create: receivedItems.map((item: any) => ({
                            poItemId: item.poItemId,
                            quantityReceived: item.quantity
                        }))
                    }
                }
            });

            // 2. Re-fetch PO items to calculate new status
            const updatedPoItems = await tx.purchaseOrderItem.findMany({
                where: { poId: po.id },
                include: { receiptItems: true }
            });

            let allFulfilled = true;
            let anyReceived = false;

            for (const item of updatedPoItems) {
                const totalReceived = item.receiptItems.reduce((sum, r) => sum + r.quantityReceived, 0);
                if (totalReceived > 0) anyReceived = true;
                if (totalReceived < item.quantity) allFulfilled = false;
            }

            let newStatus = po.status;
            if (allFulfilled) newStatus = POStatus.Fulfilled;
            else if (anyReceived) newStatus = POStatus.Partial;

            if (newStatus !== po.status) {
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: { status: newStatus }
                });
            }

            return newReceipt;
        });

        return NextResponse.json(receipt, { status: 201 });

    } catch (error) {
        console.error("[PO_RECEIVE_POST]", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ message: msg }, { status: 500 });
    }
}
