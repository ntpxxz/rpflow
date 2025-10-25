// app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PurchaseRequest, User, RequestItem } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// สร้าง Type แบบเต็ม (รวม relations)
type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
};

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลใบขอซื้อทั้งหมด
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/purchase-requests") // 👈 (GET /api/purchase-requests/route.ts)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      });
  };

  // 2. ฟังก์ชัน "กดส่งอนุมัติ"
  const handleSubmitForApproval = async (requestId: string) => {
    // TODO: 🔴 HARDCODE: ต้องเปลี่ยนเป็น ID ของ User ที่ Login จริง
    const actorId = "clx...."; // 👈 ใส่ ID ของ User (Admin) ชั่วคราว

    const res = await fetch(`/api/purchase-requests/${requestId}/submit`, { // 👈 (API .../[id]/submit/route.ts)
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: actorId }),
    });

    if (res.ok) {
      alert("Submitted for approval!");
      // 3. อัปเดตสถานะในหน้าจอทันที
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "Approving" } : req
        )
      );
    } else {
      alert("Failed to submit.");
    }
  };

  // 4. (Optional) ฟังก์ชันสำหรับ Badge สี
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Pending": return "outline"; // ร่าง
      case "Approving": return "secondary"; // รอนุมัติ
      case "Approved": return "default"; // อนุมัติแล้ว (สีเขียว ถ้าปรับ theme)
      case "Rejected": return "destructive"; // ปฏิเสธ
      default: return "outline";
    }
  };
  
  // (ดึง Stats จากข้อมูลจริง แทน Hardcode)
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "Pending").length,
    approving: requests.filter(r => r.status === "Approving").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* --- Stats --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
             Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.approving}</p>
          </CardContent>
        </Card>
      </div>

      {/* --- ตารางติดตามสถานะ --- */}
      <Card>
        <CardHeader>
          <CardTitle>All Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.user.name}</TableCell>
                    <TableCell>{req.items.length}</TableCell>
                    <TableCell>฿{Number(req.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* 5. ปุ่ม "Submit" จะแสดงเฉพาะเมื่อสถานะเป็น "Pending" (ร่าง) */}
                      {req.status === "Pending" && (
                        <Button
                          
                          size="sm"
                          onClick={() => handleSubmitForApproval(req.id)}
                        >
                          Approval
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}