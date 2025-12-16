// app/api/purchase-requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Request ID is required" }, { status: 400 });
    }
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        user: true,
        items: true,
        approvalSteps: {
          include: {
            approver: true,
          },
          orderBy: { id: 'asc' }
        },
        history: {
          include: {
            actor: true,
          },
          orderBy: { timestamp: 'desc' }
        },
      },
    });

    if (!purchaseRequest) {
      return NextResponse.json({ message: "Purchase Request not found" }, { status: 404 });
    }

    return NextResponse.json(purchaseRequest);

  } catch (error) {
    console.error("[PURCHASE_REQUEST_DETAIL_GET]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Request ID is required" }, { status: 400 });
    }

    // Check if user is Admin
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (user?.role !== "Admin") {
      return new NextResponse("Forbidden: Admin only", { status: 403 });
    }

    await prisma.purchaseRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("[PURCHASE_REQUEST_DELETE]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}