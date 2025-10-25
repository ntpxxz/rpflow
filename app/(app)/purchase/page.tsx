// app/(app)/purchase/page.tsx
"use client";

import { useState, FormEvent, ChangeEvent } from "react";
// 👈 1. ลบ ItemMaster ออก, เพิ่ม Textarea
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Loader2 } from "lucide-react";

// 👈 2. อัปเดต Type ของ CartItem ใหม่ทั้งหมด
type CartItem = {
  itemName: string;
  detail: string;
  image?: File; // 👈 เก็บไฟล์รูปภาพ
  quantity: number;
  unitPrice: number;
};

// ... (type SubmitStatus ไม่เปลี่ยนแปลง) ...
type SubmitStatus = {
  type: "success" | "error";
  message: string;
};

export default function Purchase() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // 👈 3. State สำหรับฟอร์ม "Header" ใหม่
  const [requesterName, setRequesterName] = useState<string>("");
  const [requestType, setRequestType] = useState<string>(""); // NORMAL, URGENT, PROJECT
  
  // 👈 4. State สำหรับฟอร์ม "เพิ่มสินค้า" ใหม่
  const [currentItemName, setCurrentItemName] = useState<string>("");
  const [currentItemDetail, setCurrentItemDetail] = useState<string>("");
  const [currentItemImage, setCurrentItemImage] = useState<File | undefined>(undefined);
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // State สำหรับ UX
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);

  // 👈 5. ลบ useEffect ที่ fetch /api/item-master ทิ้งทั้งหมด

  // 6. ฟังก์ชัน "เพิ่มลงตะกร้า" (ปรับปรุงใหม่)
  const handleAddItemToCart = (e: FormEvent) => {
    e.preventDefault(); 
    
    // 👈 เช็คข้อมูลใหม่
    if (!currentItemName || currentQuantity <= 0 || currentPrice < 0) {
        // (อาจจะเพิ่มการแจ้งเตือนที่นี่)
        return;
    }

    const newItem: CartItem = {
      itemName: currentItemName,
      detail: currentItemDetail,
      image: currentItemImage,
      quantity: currentQuantity,
      unitPrice: currentPrice,
    };
    
    setCart((prev) => [...prev, newItem]);

    // 👈 Reset form ใหม่
    setCurrentItemName("");
    setCurrentItemDetail("");
    setCurrentItemImage(undefined);
    setCurrentQuantity(1);
    setCurrentPrice(0);
    setSubmitStatus(null); 
    
    // 👈 (Optional) เคลียร์ค่าใน input file
    const fileInput = document.getElementById('item-image') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };
  
  // 7. ฟังก์ชัน "ลบออกจากตะกร้า" (ไม่เปลี่ยนแปลง)
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    setSubmitStatus(null); 
  };
  
  // 👈 8. ฟังก์ชัน "ส่งใบขอซื้อ" (เปลี่ยนไปใช้ FormData)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !requesterName || !requestType) {
        setSubmitStatus({ type: "error", message: "Please fill all required fields." });
        return;
    };

    setIsSubmitting(true); 
    setSubmitStatus(null);

    // 🌟 สร้าง FormData เพื่อส่งไฟล์และข้อมูล
    const formData = new FormData();

    // 1. เพิ่มข้อมูล Header
    formData.append('userId', 'user_test_001'); // TODO: เปลี่ยนเป็น userId ของคนที่ Login จริง
    formData.append('requesterName', requesterName);
    formData.append('requestType', requestType);

    // 2. เพิ่มข้อมูล Items (ต้องแปลงเป็น JSON string)
    const itemsPayload = cart.map(item => ({
      itemName: item.itemName,
      detail: item.detail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // เราจะส่งไฟล์แยกต่างหาก
    }));
    formData.append('items', JSON.stringify(itemsPayload));

    // 3. เพิ่มไฟล์รูปภาพ
    cart.forEach((item, index) => {
      if (item.image) {
        // 🌟 ส่งไฟล์โดยตั้งชื่อให้ Backend รู้ว่าไฟล์นี้เป็นของ item index ไหน
        formData.append(`image_${index}`, item.image);
      }
    });

    try {
      // 🌟 ส่ง request แบบ FormData
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        // ❌ ไม่ต้องใส่ 'Content-Type', Browser จะตั้งค่า 'multipart/form-data' ให้เอง
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create request.");
      }

      setSubmitStatus({ type: "success", message: "Purchase Request Created!" });
      setCart([]); // ล้างตะกร้า
      setRequesterName(""); // ล้างฟอร์ม
      setRequestType(""); // ล้างฟอร์ม

    } catch (err: any) {
      setSubmitStatus({ type: "error", message: err.message || "An unknown error occurred." });
    } finally {
      setIsSubmitting(false); 
    }
  };
  
  // คำนวณยอดรวม
  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  // เงื่อนไขสำหรับปิดปุ่ม
  const canAddItem = currentItemName !== "" && currentQuantity > 0 && currentPrice >= 0;
  const canSubmit = cart.length > 0 && requesterName !== "" && requestType !== "" && !isSubmitting;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Purchase Request</h1>

      {/* --- 👈 9. ฟอร์มสำหรับ "Request Details" (ปรับปรุงใหม่) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requester">Requester <span className="text-red-500">*</span></Label>
              <Input
                id="requester"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Your name"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-type">Type of Request <span className="text-red-500">*</span></Label>
              <Select 
                value={requestType} 
                onValueChange={setRequestType}
                disabled={isSubmitting}
              >
                <SelectTrigger id="req-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- 👈 10. ฟอร์มสำหรับ "เพิ่ม" สินค้า (ปรับปรุงใหม่) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Add Item</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddItemToCart}> 
          <CardContent className="space-y-4">
            {/*แถว 1: Item Name / Price / Qty */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="item-name">Item Name <span className="text-red-500">*</span></Label>
                <Input
                  id="item-name"
                  value={currentItemName}
                  onChange={(e) => setCurrentItemName(e.target.value)}
                  placeholder="e.g., Laptop, Office Chair"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Unit Price <span className="text-red-500">*</span></Label>
                <Input
                  id="price"
                  type="text"
                  min={0}
                  
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {/* แถว 2: Detail / Image */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-detail">Detail / Description</Label>
                <Textarea
                  id="item-detail"
                  value={currentItemDetail}
                  onChange={(e) => setCurrentItemDetail(e.target.value)}
                  placeholder="Specifics, model, color, etc."
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-image">Image (Optional)</Label>
                <Input
                  id="item-image"
                  type="file"
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setCurrentItemImage(e.target.files ? e.target.files[0] : undefined);
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" disabled={!canAddItem || isSubmitting}>
              Add to Request
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* --- 11. ตาราง "ตะกร้าสินค้า" (รายการที่เพิ่มแล้ว) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Request Items</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Table>
              {/* ... (TableHeader) ... */}
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ... (TableBody mapping) ... */}
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{item.itemName}</div>
                        {/* 👈 (Optional) แสดง detail ย่อๆ */}
                        <div className="text-sm text-muted-foreground truncate w-64">
                          {item.detail || "-"}
                        </div> 
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>฿{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>฿{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          disabled={isSubmitting} 
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            <div className="mt-6 flex justify-between items-center gap-4">
              <h3 className="text-xl font-bold">
                Total: ฿{total.toFixed(2)}
              </h3>
              
              <div className="flex items-center gap-4">
                {submitStatus && (
                  <p className={
                    submitStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }>
                    {submitStatus.message}
                  </p>
                )}
                
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={!canSubmit} // 👈 อัปเดตเงื่อนไข
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Purchase Request'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}