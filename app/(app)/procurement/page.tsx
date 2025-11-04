// app/(app)/procurement/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PurchaseRequest, User, RequestItem } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter, // 👈 Import CardFooter
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
import { Checkbox } from "@/components/ui/checkbox"; // 👈 Import Checkbox
import { Loader2 } from "lucide-react"; // 👈 Import Loader

// 1. 🔻 (แก้ไข) สร้าง Type ใหม่สำหรับ Item ที่ดึงมา
type ProcurementItem = RequestItem & {
  request: {
    id: string;
    requesterName: string | null;
    user: {
      name: string;
    } | null;
  };
};

export default function ProcurementPage() {
  // 2. 🔻 (แก้ไข) State เก็บ "Items" (ไม่ใช่ Requests)
  const [itemsToOrder, setItemsToOrder] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // 👈 State สำหรับปุ่ม PO

  // 3. 🔻 (ใหม่) State สำหรับเก็บ Item IDs ที่เลือก
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // 4. 🔻 (แก้ไข) Fetch ข้อมูลจาก API ใหม่
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    setLoading(true);
    // 5. 🔻 (แก้ไข) เรียก API ใหม่
    fetch("/api/procurement/queue") 
      .then((res) => res.json())
      .then((data: ProcurementItem[]) => {
        setItemsToOrder(data);
      })
      .catch((err) => console.error("Error fetching procurement items:", err))
      .finally(() => {
        setLoading(false);
        setIsSubmitting(false);
        setSelectedItemIds([]); // 👈 Reset selection
      });
  };

  // 6. 🔻 (ใหม่) Handler สำหรับ Checkbox
  const handleItemSelect = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId) // Uncheck
        : [...prev, itemId] // Check
    );
  };
  
  // 7. 🔻 (ใหม่) Handler สำหรับ "Select All"
  const handleSelectAll = () => {
    if (selectedItemIds.length === itemsToOrder.length) {
      setSelectedItemIds([]); // Deselect all
    } else {
      setSelectedItemIds(itemsToOrder.map((item) => item.id)); // Select all
    }
  };

  // 8. 🔻 (แก้ไข) ฟังก์ชัน "สร้าง PO"
  const handleCreatePO = async () => {
    if (selectedItemIds.length === 0) {
      alert("Please select at least one item to create a Purchase Order.");
      return;
    }
    
    setIsSubmitting(true);

    const res = await fetch(`/api/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 9. 🔻 (แก้ไข) ส่ง "requestItemIds" (Array)
      body: JSON.stringify({ requestItemIds: selectedItemIds }),
    });

    if (res.ok) {
      alert("Purchase Order Created!");
      // 10. 🔻 (แก้ไข) รีเฟรชรายการ (เพราะบางส่วนถูกสั่งไปแล้ว)
      fetchItems(); 
    } else {
      const error = await res.json();
      alert(`Failed to create PO: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading approved items queue...</div>;

  const allSelected = selectedItemIds.length === itemsToOrder.length && itemsToOrder.length > 0;
  const someSelected = selectedItemIds.length > 0 && !allSelected;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Procurement Queue</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Approved Items ({itemsToOrder.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select items to consolidate into a new Purchase Order.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {/* 11. 🔻 (ใหม่) Checkbox "Select All" */}
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected || someSelected}
                    indeterminate={someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Qty to Order</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
              </TableRow>
            </TableHeader>
            
            {/* 12. 🔻 (แก้ไข) แสดง "Items" 🔻 */}
            <TableBody>
              {itemsToOrder.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No items awaiting procurement.
                  </TableCell>
                </TableRow>
              ) : (
                itemsToOrder.map((item) => {
                  const quantityToOrder = item.quantity - item.quantityOrdered;
                  const isSelected = selectedItemIds.includes(item.id);

                  return (
                    <TableRow key={item.id} data-state={isSelected ? "selected" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemSelect(item.id)}
                          aria-label={`Select item ${item.itemName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.detail || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.request.id.substring(0, 10)}...</Badge>
                      </TableCell>
                      <TableCell>{item.request.user?.name || item.request.requesterName}</TableCell>
                      <TableCell>
                        <span className="font-bold">{quantityToOrder}</span>
                        {/* (แสดง (of {item.quantity}) ถ้าต้องการ) */}
                      </TableCell>
                      <TableCell className="text-right">
                        ฿{Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* 13. 🔻 (ใหม่) Footer สำหรับปุ่มสร้าง PO 🔻 */}
        {itemsToOrder.length > 0 && (
          <CardFooter className="flex justify-end border-t pt-6">
            <Button
              size="lg"
              onClick={handleCreatePO}
              disabled={isSubmitting || selectedItemIds.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create PO for ({selectedItemIds.length}) selected items
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}