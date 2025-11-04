// app/(app)/purchase-orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PurchaseOrder, PurchaseOrderItem } from "@prisma/client";
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
import { format } from "date-fns";

// 1. (ใหม่) สร้าง Type สำหรับ PO ที่มีข้อมูลสรุป
type POWithSummary = PurchaseOrder & {
  itemCount: number;
  totalAmount: number;
};

export default function PurchaseOrderList() {
  const [purchaseOrders, setPurchaseOrders] = useState<POWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 2. Fetch ข้อมูล PO
  useEffect(() => {
    fetch("/api/purchase-orders/list") // 👈 เรียก API ใหม่
      .then((res) => res.json())
      .then((data: POWithSummary[]) => {
        setPurchaseOrders(data);
      })
      .catch((err) => console.error("Error fetching POs:", err))
      .finally(() => setLoading(false));
  }, []);

  // 3. (ฟังก์ชันสำหรับคลิกดูรายละเอียด - อนาคต)
  const handleRowClick = (poNumber: string) => {
    // 
    // 🔴 TODO: (ขั้นต่อไป) เราจะสร้างหน้านี้
    router.push(`/purchase-orders/${poNumber}`);
    // 
    alert(`Go to PO Detail Page: ${poNumber}`);
  };

  // 4. (ฟังก์ชันสำหรับ Badge)
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Sent": return "default";
      case "Pending": return "secondary";
      case "Partial": return "outline";
      case "Fulfilled": return "default"; // (อาจจะเปลี่ยนเป็นสีเขียว)
      case "Cancelled": return "destructive";
      default: return "outline";
    }
  };


  if (loading) return <div>Loading Purchase Orders...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Purchase Order List</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Created POs ({purchaseOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No Purchase Orders found.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => (
                  <TableRow 
                    key={po.id} 
                    onClick={() => handleRowClick(po.poNumber)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{format(new Date(po.createdAt), "yyyy-MM-dd")}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(po.status)}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.itemCount}</TableCell>
                    <TableCell className="text-right">
                      ฿{Number(po.totalAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}