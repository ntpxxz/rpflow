// app/(app)/purchase-orders/[poNumber]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchaseOrder, PurchaseOrderItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
import { Loader2, Printer, ChevronLeft } from "lucide-react";

type ExtendedPurchaseOrderItem = PurchaseOrderItem & {
  imageUrl?: string;
};

type PODetails = PurchaseOrder & {
  items: ExtendedPurchaseOrderItem[];
  totalAmount: number;
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poNumber = params.poNumber as string;

  const [poDetails, setPoDetails] = useState<PODetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (poNumber) {
      setLoading(true);
      fetch(`/api/purchase-orders/${poNumber}`) 
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.json().then(d => d.message));
          return res.json();
        })
        .then((data: PODetails) => {
          setPoDetails(data);
          setError(null);
        })
        .catch((err: Error) => {
          console.error(err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [poNumber]);

  if (loading) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }
  if (!poDetails) {
    return <div>Purchase Order not found.</div>;
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    // ... (ฟังก์ชัน getStatusVariant เหมือนเดิม) ...
    switch (status) {
      case "Sent": return "default";
      case "Pending": return "secondary";
      case "Partial": return "outline";
      case "Fulfilled": return "default";
      case "Cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    // 1. 🔻 (แก้ไข) 🔻
    // ใช้ space-y-6 ครอบทั้งหมด
    //
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* --- 2. (ย้ายมา) ส่วนปุ่ม (ห้ามพิมพ์) --- */}
      <div className="no-print flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to PO List
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* --- 3. (แก้ไข) Card นี้คือส่วนที่จะพิมพ์ --- */}
      {/* (ลบปุ่มออกจากข้างในนี้) */}
      <div className="printable-area bg-white p-8 rounded-lg shadow-lg">
        
        {/* --- ส่วน Header ของ PO --- */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PURCHASE ORDER</h1>
              <h2 className="text-2xl font-bold text-gray-700">{poDetails.poNumber}</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold mb-2">IOT SECTION</div>
              <p className="text-sm text-gray-600">NMB, Spindle motor division</p>
              <p className="text-sm text-gray-600">Tel: 2472</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">PO Details</h3>
              <p className="text-sm text-gray-600">
                <strong>PO Date:</strong> {format(new Date(poDetails.createdAt), "dd MMM yyyy")}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sent Date:</strong> {poDetails.sentAt ? format(new Date(poDetails.sentAt), "dd MMM yyyy") : 'N/A'}
              </p>
            </div>
          </div>
        </header>

        {/* --- ส่วนตารางรายการสินค้า --- */}
        <main className="mb-8">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poDetails.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-gray-800">{item.itemName}</TableCell>
                  <TableCell className="font-medium text-gray-800">
                  
                  {/* 🔻🔻 (เพิ่มส่วนนี้) 🔻🔻 */}
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl} // 👈 (API /api/purchase-orders/[poNumber] จะดึงมาให้เอง)
                      alt={item.itemName}
                      className="w-16 h-16 object-cover rounded-md mb-2"
                      width={64}
                      height={64}
                    />
                  )}
                  {/* 🔺🔺 (สิ้นสุด) 🔺🔺 */}
                  
                  {item.itemName}
                </TableCell>
                  <TableCell className="text-right text-gray-800">{item.quantity}</TableCell>
                  <TableCell className="text-right text-gray-800">฿{Number(item.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium text-gray-800">
                    ฿{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </main>

        {/* --- ส่วนสรุปยอด --- */}
        <footer className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">฿{poDetails.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
              <span className="text-lg font-bold">Total Amount:</span>
              <span className="text-lg font-bold">฿{(poDetails.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </footer>
        
        <div className="mt-12 text-center text-xs text-gray-500">
          Thank you for your business!
        </div>
      </div>
      
    </div> // 👈 ปิด .space-y-6
  );
}