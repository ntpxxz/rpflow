// app/(app)/approval/page.tsx
"use client";

import { useState, useEffect } from "react";

import { ApprovalStep, PurchaseRequest, User } from "@prisma/client"; // 👈 ใช้ Type ใหม่
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea"; 
import { Badge } from "@/components/ui/badge";       
// สร้าง Type รวมข้อมูล
type PendingApproval = ApprovalStep & {
  request: PurchaseRequest & {
    user: User;
    items: any[]; // (ควรสร้าง Type ที่ซับซ้อนกว่านี้)
  };
  approver: User;
};

export default function Approval() {
  const [pendingSteps, setPendingSteps] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");

  // 1. Fetch ข้อมูลจาก API ใหม่
  useEffect(() => {
    fetch("/api/approval-steps?status=Pending")
      .then((res) => res.json())
      .then((data) => {
        setPendingSteps(data);
        setLoading(false);
      });
  }, []);

  // 2. Handle Approve / Reject
  const handleUpdateStatus = async (
    approvalStepId: string,
    newStatus: "Approved" | "Rejected"
  ) => {
    // TODO: ดึง ID ของคนที่กำลังกดปุ่ม (Actor) มาจากระบบ Auth
    const actorId = "clx...."; // 👈 🔴 HARDCODE: ใส่ ID ของ User (Admin) ชั่วคราว

    const res = await fetch("/api/approval-steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalStepId: approvalStepId,
        newStatus: newStatus,
        comment: comment,
        actorId: actorId,
      }),
    });

    if (res.ok) {
      // 3. ถ้าสำเร็จ ให้ลบรายการนี้ออกจากหน้าจอ (เพราะมันไม่ Pending แล้ว)
      setPendingSteps((prev) =>
        prev.filter((step) => step.id !== approvalStepId)
      );
      setComment(""); // เคลียร์ Comment
    } else {
      alert("Failed to update status.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Your Approval ({pendingSteps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requestor</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSteps.map((step) => (
                <TableRow key={step.id}>
                  <TableCell>{step.request.user.name}</TableCell>
                  <TableCell>
                    {step.request.id.substring(0, 10)}...
                  </TableCell>
                  <TableCell>
                    ${Number(step.request.totalAmount).toFixed(2)}
                  </TableCell>
                  <TableCell>{step.request.items.length}</TableCell>
                  <TableCell>
                    {/* (ใช้ Textarea เฉพาะรายการนี้) */}
                    <Textarea
                      placeholder="Optional comment..."
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus(step.id, "Rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(step.id, "Approved")}
                    >
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}