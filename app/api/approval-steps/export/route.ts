// app/api/approval-steps/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const dynamic = 'force-dynamic'; // เพื่อให้มั่นใจว่าข้อมูลสดใหม่เสมอ

export async function GET() {
  try {
    // 1. ดึงข้อมูล Approval Steps ทั้งหมด
    const steps = await prisma.approvalStep.findMany({
      include: {
        request: {
          include: {
            user: true, // ข้อมูลผู้ขอ (Requester)
          }
        },
        approver: true // ข้อมูลผู้อนุมัติ (Approver)
      },
      orderBy: { request: { createdAt: 'desc' } }
    });

    // 2. สร้าง Header ของ CSV
    const csvRows = [
      [
        "Request ID",
        "Step Name",
        "Status",
        "Requester",
        "Approver",
        "Total Amount",
        "Request Date",
        "Action Date",
        "Comment"
      ].join(",")
    ];

    // 3. วนลูปสร้างข้อมูลแต่ละแถว
    for (const step of steps) {
      const row = [
        `"${step.requestId}"`, // ใช้ "" ครอบเพื่อป้องกันกรณีมี comma ในข้อมูล
        `"${step.stepName}"`,
        `"${step.status}"`,
        `"${step.request.user.name}"`,
        `"${step.approver.name}"`,
        `"${Number(step.request.totalAmount || 0).toFixed(2)}"`,
        `"${format(new Date(step.request.createdAt), "yyyy-MM-dd HH:mm")}"`,
        `"${step.approvedAt ? format(new Date(step.approvedAt), "yyyy-MM-dd HH:mm") : "-"}"`,
        `"${step.comment || "-"}"`
      ];
      
      csvRows.push(row.join(","));
    }

    // 4. รวมเป็น String เดียว
    const csvString = csvRows.join("\n");
    
    // 5. ส่งกลับเป็นไฟล์ CSV
    return new NextResponse(csvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="approval_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv"`,
      },
    });

  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}