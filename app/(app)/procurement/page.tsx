// app/(app)/procurement/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PurchaseRequest, User } from "@prisma/client";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// (Type นี้เหมือนใน Dashboard)
type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: any[];
};

export default function ProcurementPage() {
  const [approvedRequests, setApprovedRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch ข้อมูล (เฉพาะที่ 'Approved')
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    setLoading(true);
    // (เราใช้ API เดิม แต่เดี๋ยวเราจะกรองฝั่ง Client)
    // TODO: ในอนาคต ควรสร้าง API ที่กรอง 'status=Approved' มาจาก Server เลย
    fetch("/api/purchase-requests") 
      .then((res) => res.json())
      .then((data: RequestWithDetails[]) => {
        // 👈 กรองเฉพาะที่ 'Approved'
        setApprovedRequests(data.filter(req => req.status === "Approved"));
        setLoading(false);
      });
  };

  // 2. ฟังก์ชัน "สร้าง PO"
  const handleCreatePO = async (purchaseRequestId: string) => {
    const res = await fetch(`/api/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseRequestId: purchaseRequestId }),
    });

    if (res.ok) {
      alert("Purchase Order Created!");
      // 3. ลบรายการนี้ออกจาก Queue (เพราะมันถูกสั่งไปแล้ว)
      setApprovedRequests((prev) =>
        prev.filter((req) => req.id !== purchaseRequestId)
      );
    } else {
      const error = await res.json();
      alert(`Failed to create PO: ${error.message}`);
    }
  };

  if (loading) return <div>Loading approved requests...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Procurement Queue</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Approved Requests ({approvedRequests.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            รายการที่อนุมัติแล้ว รอการสร้างใบสั่งซื้อ (PO)
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.id.substring(0, 10)}...</TableCell>
                  <TableCell>{req.user.name}</TableCell>
                  <TableCell>{req.items.length}</TableCell>
                  <TableCell>${Number(req.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleCreatePO(req.id)}
                    >
                      Create PO
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