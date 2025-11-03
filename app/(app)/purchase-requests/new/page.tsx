// app/(app)/purchase/page.tsx
"use client";

import { useState, FormEvent, ChangeEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // 👈 นำ Textarea กลับมา
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, Loader2, Search } from "lucide-react";

// 1. 👈 Type สำหรับ Item Master
type InventoryItem = {
  barcode: string;
  name: string;
  description: string | null;
  unit_price: number | string;
};

// 2. 👈 Type ของ CartItem (กลับไปเหมือนต้นฉบับ + itemMasterId)
type CartItem = {
  itemName: string;          // 👈 Required Name
  detail: string;
  image?: File;
  quantity: number;
  unitPrice: number;
};

type SubmitStatus = {
  type: "success" | "error";
  message: string;
};

export default function Purchase() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // State ฟอร์ม Header
  const [requesterName, setRequesterName] = useState<string>("");
  const [requestType, setRequestType] = useState<string>("");

  // 3. 👈 State สำหรับฟอร์ม "Add Item" (แบบ Hybrid)
  const [itemSearchTerm, setItemSearchTerm] = useState<string>(""); // 👈 สิ่งที่พิมพ์ค้นหา
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // State สำหรับ Free Text (เหมือนเดิม)
  const [currentItemDetail, setCurrentItemDetail] = useState<string>("");
  const [currentItemImage, setCurrentItemImage] = useState<File | undefined>(undefined);
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // State สำหรับ UX
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 4. 👈 Effect สำหรับค้นหา (Autocomplete)
  useEffect(() => {
    if (itemSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/item-master?query=${itemSearchTerm}`)
        .then((res) => res.json())
        .then((data: InventoryItem[]) => setSearchResults(data))
        .catch((err) => console.error("Failed to fetch items:", err))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [itemSearchTerm]);

  // (Effect สำหรับคลิกข้างนอก เหมือนเดิม)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  // 5. 👈 Handler เมื่อพิมพ์ในช่องค้นหา
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setItemSearchTerm(e.target.value);
  };

  // 6. 👈 Handler เมื่อคลิกเลือก Item
  const handleItemSelect = (item: InventoryItem) => {
    setItemSearchTerm(item.name); // 👈 ตั้งชื่อในช่องค้นหา
    setCurrentPrice(Number(item.unit_price) || 0); // 👈 ตั้งราคา
    setCurrentItemDetail(item.description || ""); // 👈 (Optional) ใส่ Detail ให้
    setSearchResults([]); // ซ่อนผลลัพธ์
    setCurrentQuantity(1);
  };
  
  // 7. 👈 Handler "เพิ่มลงตะกร้า" (แบบ Hybrid)
  const handleAddItemToCart = (e: FormEvent) => {
    e.preventDefault(); 
    
    // 👈 ต้องมีชื่อสินค้า (ไม่ว่าจะพิมพ์เองหรือเลือก)
    if (!itemSearchTerm || currentQuantity <= 0 || currentPrice < 0) {
        alert("Please provide an Item Name, valid Quantity, and valid Price.");
        return;
    }

    const newItem: CartItem = {
      itemName: itemSearchTerm,         // 👈 (ชื่อที่พิมพ์/ที่เลือก)
      detail: currentItemDetail,
      image: currentItemImage,
      quantity: currentQuantity,
      unitPrice: currentPrice,
    };
    
    setCart((prev) => [...prev, newItem]);

    // 👈 Reset form
    setItemSearchTerm("");
    setCurrentItemDetail("");
    setCurrentItemImage(undefined);
    setCurrentQuantity(1);
    setCurrentPrice(0);
    setSubmitStatus(null); 
    const fileInput = document.getElementById('item-image') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };
  
  // 8. 👈 Handler "ลบออกจากตะกร้า" (ไม่เปลี่ยนแปลง)
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    setSubmitStatus(null); 
  };
  
  // 9. 👈 Handler "ส่งใบขอซื้อ" (กลับไปใช้ FormData)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return
    if (cart.length === 0 || !requesterName || !requestType) {
        setSubmitStatus({ type: "error", message: "Please fill header details and add at least one item." });
        return;
    };

    setIsSubmitting(true); 
    setSubmitStatus(null);

    const formData = new FormData();

    // 1. เพิ่มข้อมูล Header
    formData.append('userId', process.env.NEXT_PUBLIC_TEST_REQUESTER_ID || "user_test_001"); 
    formData.append('requesterName', requesterName);
    formData.append('requestType', requestType);

    // 2. เพิ่มข้อมูล Items (Hybrid)
    const itemsPayload = cart.map(item => ({
      itemName: item.itemName,         // 👈 Name (ที่พิมพ์/เลือก)
      detail: item.detail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // เราจะส่งไฟล์แยก
    }));
    formData.append('items', JSON.stringify(itemsPayload));

    // 3. เพิ่มไฟล์รูปภาพ
    cart.forEach((item, index) => {
      if (item.image) {
        formData.append(`image_${index}`, item.image);
      }
    });

    try {
      // 🌟 ส่ง request แบบ FormData
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        body: formData, // 👈 กลับมาใช้ FormData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create request.");
      }

      setSubmitStatus({ type: "success", message: "Purchase Request Created!" });
      setCart([]);
      setRequesterName("");
      setRequestType("");

    } catch (err: any) {
      setSubmitStatus({ type: "error", message: err.message || "An unknown error occurred." });
    } finally {
      setIsSubmitting(false); 
    }
  };
  
  // (คำนวณยอดรวม)
  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  // 👈 อัปเดตเงื่อนไข Can Add (แค่ชื่อ, Qty, Price)
  const canAddItem = itemSearchTerm !== "" && currentQuantity > 0 && currentPrice >= 0;
  const canSubmit = cart.length > 0 && requesterName !== "" && requestType !== "" && !isSubmitting;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Purchase Request</h1>

      {/* --- ฟอร์ม "Request Details" (เหมือนเดิม) --- */}
      <Card>
        <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <SelectTrigger id="req-type" className="w-full">
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

      {/* --- 10. 👈 ฟอร์มสำหรับ "เพิ่ม" สินค้า (Hybrid) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Add Item</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddItemToCart}> 
          <CardContent className="space-y-4">
            {/*แถว 1: Item Name / Price / Qty */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* --- ช่องค้นหา (กิน 2 ส่วน) --- */}
              <div className="md:col-span-2 space-y-2" ref={searchContainerRef}>
                <Label htmlFor="item-name">Item Name (Search or Type) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="item-name"
                    value={itemSearchTerm}
                    onChange={handleSearchChange}
                    placeholder="Type name or search..."
                    disabled={isSubmitting}
                    autoComplete="off"
                    className="pl-8"
                  />
                  <span className="absolute left-2.5 top-[11px] text-muted-foreground">
                    {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </span>
                  
                  {/* --- UI ผลการค้นหา --- */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg">
                      {searchResults.map(item => (
                        <div
                          key={item.barcode}
                          className="p-3 cursor-pointer hover:bg-accent"
                          onClick={() => handleItemSelect(item)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <p className="font-medium">{item.name} ({item.barcode})</p>
                          <p className="text-sm text-muted-foreground truncate">฿{Number(item.unit_price).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- ราคา (กิน 1 ส่วน) --- */}
              <div className="space-y-2">
                <Label htmlFor="price">Unit Price <span className="text-red-500">*</span></Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  disabled={isSubmitting}
                  placeholder="0.00"
                />
              </div>

              {/* --- จำนวน (กิน 1 ส่วน) --- */}
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
            
            {/* 11. 👈 แถว 2: Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-detail">Detail / Description (Optional)</Label>
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

            <Button type="submit" disabled={!canAddItem || isSubmitting} className="mt-4">
              Add to Request
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* --- ตาราง "ตะกร้าสินค้า" (เหมือนเดิม) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Request Items</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Table>
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
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="text-sm text-muted-foreground truncate w-48">
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
            
            {/* --- ส่วน Submit (เหมือนเดิม) --- */}
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
                  disabled={!canSubmit}
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