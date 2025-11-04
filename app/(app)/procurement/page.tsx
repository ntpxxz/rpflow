// app/(app)/procurement/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react"; // 👈 1. เพิ่ม useMemo
import { PurchaseRequest, User, RequestItem } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Checkbox } from "@/components/ui/checkbox"; 
import { Loader2 } from "lucide-react"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [itemsToOrder, setItemsToOrder] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
 

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/procurement/queue") 
      .then((res) => res.json())
      .then((data: ProcurementItem[]) => {
        setItemsToOrder(data);
      })
      .catch((err) => console.error("Error fetching procurement items:", err))
      .finally(() => {
        setLoading(false);
        setIsSubmitting(false); // 👈 (ย้าย isSubmitting มาที่นี่)
        setSelectedItemIds([]); 
        setIsModalOpen(false);
        setQuotationNumber(""); // 👈 (ปิด Modal ด้วย)
      });
  };

  // ... (Handler handleItemSelect, handleSelectAll) ...
  const handleItemSelect = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId] 
    );
  };
  
  const handleSelectAll = () => {
    if (selectedItemIds.length === itemsToOrder.length) {
      setSelectedItemIds([]); 
    } else {
      setSelectedItemIds(itemsToOrder.map((item) => item.id)); 
    }
  };

  // 4. 🔻 (ใหม่) สร้าง useMemo เพื่อกรอง Item ที่จะแสดงใน Preview 🔻
  const itemsForPreview = useMemo(() => {
    return itemsToOrder.filter(item => selectedItemIds.includes(item.id));
  }, [itemsToOrder, selectedItemIds]);

  // 5. 🔻 (ใหม่) คำนวณยอดรวมสำหรับ Preview 🔻
  const previewTotal = useMemo(() => {
    return itemsForPreview.reduce((total, item) => {
      const quantityToOrder = item.quantity - item.quantityOrdered;
      return total + (quantityToOrder * Number(item.unitPrice));
    }, 0);
  }, [itemsForPreview]);

  // 6. 🔻 (แก้ไข) ฟังก์ชันนี้จะแค่ "เปิด" Modal 🔻
  const handleOpenPreview = () => {
    if (selectedItemIds.length === 0) {
      alert("Please select at least one item.");
      return;
    }
    setQuotationNumber("");
    setIsModalOpen(true); 
    // 👈 เปิด Modal
  };
  
  // 7. 🔻 (ใหม่) ฟังก์ชันนี้จะ "ยืนยัน" การสร้าง PO (ย้าย Logic เดิมมานี่) 🔻
  const handleConfirmPO = async () => {
    setIsSubmitting(true); // 👈 เริ่ม Loading

    const res = await fetch(`/api/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestItemIds: selectedItemIds,
        quotationNumber: quotationNumber || null, // ส่งค่าไปด้วย (ถ้าว่างให้ส่ง null)
      }),
    });

    if (res.ok) {
      alert("Purchase Order Created!");
      fetchItems(); // 👈 รีเฟรช (ซึ่งจะปิด Modal และ Reset State)
    } else {
      const error = await res.json();
      alert(`Failed to create PO: ${error.message}`);
      setIsSubmitting(false); // 👈 หยุด Loading ถ้า Error
    }
  };

  if (loading) return <div>Loading approved items queue...</div>;

  const allSelected = selectedItemIds.length === itemsToOrder.length && itemsToOrder.length > 0;
  const someSelected = selectedItemIds.length > 0 && !allSelected;

  return (
    <> {/* 👈 8. ครอบด้วย Fragment (ถ้ายังไม่ได้ครอบ) */}
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Procurement Queue</h1>
        
        <Card>
          {/* ... (CardHeader, CardContent, Table... ทั้งหมดเหมือนเดิม) ... */}
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected || someSelected}
                      indeterminate={someSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Qty to Order</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                </TableRow>
              </TableHeader>
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
                        <TableCell>
                          <Badge variant="outline">{item.request.id.substring(0, 10)}...</Badge>
                        </TableCell>
                        <TableCell>{item.request.user?.name || item.request.requesterName}</TableCell>
                        <TableCell>
                          <span className="font-bold">{quantityToOrder}</span>
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
          
          {itemsToOrder.length > 0 && (
            <CardFooter className="flex justify-end border-t pt-6">
              {/* 9. 🔻 (แก้ไข) ปุ่มนี้จะเรียก "เปิด" Preview 🔻 */}
              <Button
                size="lg"
                onClick={handleOpenPreview} // 👈 9.1 เปลี่ยน Function
                disabled={isSubmitting || selectedItemIds.length === 0}
              >
                {/* 9.2 (ลบ Loader ออกจากปุ่มนี้) */}
                Create PO for ({selectedItemIds.length}) selected items
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* 10. 🔻 (ใหม่) เพิ่ม Dialog/Modal JSX 🔻 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl"> {/* 👈 (ขยายขนาด Modal) */}
          <DialogHeader>
            <DialogTitle>Confirm Purchase Order Creation</DialogTitle>
            <DialogDescription>
              You are about to create a new PO with {itemsForPreview.length} items.
              Please review the details below.
            </DialogDescription>
          </DialogHeader>
          
          {/* --- ส่วนแสดงตาราง Preview --- */}
          <div className="max-h-[400px] overflow-y-auto pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsForPreview.map((item) => {
                  const qty = item.quantity - item.quantityOrdered;
                  const price = Number(item.unitPrice);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-muted-foreground">{item.request.id}</div>
                      </TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell className="text-right">฿{price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">฿{(qty * price).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {/* --- สิ้นสุดตาราง Preview --- */}

          <div className="text-xl font-bold text-right pt-4 border-t">
            Total: ฿{previewTotal.toFixed(2)}
          </div>
{/* 3. 🔻 (ใหม่) เพิ่มช่องกรอก Quotation No. 🔻 */}
<div className="grid grid-cols-4 items-center gap-4 pt-4">
            <Label htmlFor="quotation" className="text-right">
              Quotation No.
            </Label>
            <Input
              id="quotation"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
              className="col-span-3"
              placeholder="Optional: Enter quotation/reference number"
            />
          </div>
          {/* 3. 🔺 (สิ้นสุดช่องกรอก) 🔺 */}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleConfirmPO} // 👈 10.1 เรียก Function ยืนยัน
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}