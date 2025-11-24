// app/(app)/purchase-requests/new/page.tsx
"use client";

import { useState, FormEvent, ChangeEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Trash2, Loader2, Search, Plus, ArrowLeft, Package, ShoppingCart } from "lucide-react";

// Types
type InventoryItem = {
  barcode: string;
  name: string;
  description: string | null;
  unit_price: number | string;
};
type CartItem = {
  itemName: string;
  detail: string;
  image?: File;
  quantity: number;
  unitPrice: number;
};
type SubmitStatus = {
  type: "success" | "error";
  message: string;
};

export default function CreateRequestPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Header State
  const [requesterName, setRequesterName] = useState<string>("");
  const [requestType, setRequestType] = useState<string>("");
  const [tempDate, setTempDate] = useState<string>(""); 

  // Item Entry State
  const [itemSearchTerm, setItemSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [currentItemDetail, setCurrentItemDetail] = useState<string>("");
  const [currentItemImage, setCurrentItemImage] = useState<File | undefined>(undefined);
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search Effect
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

  // Click Outside to Close Search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  // Handlers
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setItemSearchTerm(e.target.value);
  };

  const handleItemSelect = (item: InventoryItem) => {
    setItemSearchTerm(item.name);
    setCurrentPrice(Number(item.unit_price) || 0);
    setCurrentItemDetail(item.description || "");
    setSearchResults([]);
    setCurrentQuantity(1);
  };

  const handleAddItemToCart = (e: FormEvent) => {
    e.preventDefault();
    if (!itemSearchTerm || currentQuantity <= 0 || currentPrice < 0) {
      alert("Please provide an Item Name, valid Quantity, and valid Price.");
      return;
    }
    const newItem: CartItem = {
      itemName: itemSearchTerm,
      detail: currentItemDetail,
      image: currentItemImage,
      quantity: currentQuantity,
      unitPrice: currentPrice,
    };
    setCart((prev) => [...prev, newItem]);
    
    // Reset form
    setItemSearchTerm("");
    setCurrentItemDetail("");
    setCurrentItemImage(undefined);
    setCurrentQuantity(1);
    setCurrentPrice(0);
    setSubmitStatus(null);
    
    const fileInput = document.getElementById("item-image") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    setSubmitStatus(null);
  };

  const handleUpdateItemQuantity = (index: number, newQuantityStr: string) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    const validQuantity = Math.max(1, newQuantity || 1);
    setCart((prevCart) =>
      prevCart.map((item, i) => {
        if (i === index) {
          return { ...item, quantity: validQuantity };
        }
        return item;
      })
    );
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const isSpecialRequest = requestType === "URGENT" || requestType === "PROJECT";
      
    if (cart.length === 0 || !requesterName || !requestType) {
      setSubmitStatus({
        type: "error",
        message: "Please fill header details and add at least one item.",
      });
      return;
    }
    
    if (isSpecialRequest && !tempDate) {
      setSubmitStatus({
        type: "error",
        message: "Due Date is required for Urgent or Project requests.",
      });
      return;
    }

    const checkDate = tempDate ? new Date(tempDate) : undefined;
    if (checkDate && checkDate.getTime() < new Date().setHours(0,0,0,0) && isSpecialRequest) {
      setSubmitStatus({
        type: "error",
        message: "Due Date cannot be in the past.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const formData = new FormData();
    formData.append("userId", process.env.NEXT_PUBLIC_TEST_REQUESTER_ID || "user_test_001");
    formData.append("requesterName", requesterName);
    formData.append("requestType", requestType);

    if (tempDate && isSpecialRequest) {
      formData.append("dueDate", new Date(tempDate).toISOString());
    }

    const itemsPayload = cart.map((item) => ({
      itemName: item.itemName,
      detail: item.detail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    formData.append("items", JSON.stringify(itemsPayload));
    
    cart.forEach((item, index) => {
      if (item.image) {
        formData.append(`image_${index}`, item.image);
      }
    });

    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create request.");
      }
      setSubmitStatus({
        type: "success",
        message: "Purchase Request Created Successfully!",
      });
      
      // Optional: Redirect after short delay or show success UI
      setTimeout(() => {
         router.push("/purchase-requests");
      }, 1000);

    } catch (err: any) {
      setSubmitStatus({
        type: "error",
        message: err.message || "An unknown error occurred.",
      });
      setIsSubmitting(false);
    }
  };

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const canAddItem = itemSearchTerm !== "" && currentQuantity > 0 && currentPrice >= 0;
  const canSubmit = cart.length > 0 && requesterName !== "" && requestType !== "" && !isSubmitting;

  return (
    <div className="space-y-6 max-w-8xl mx-auto pb-10 font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create Purchase Request</h1>
            <p className="text-sm text-muted-foreground">Fill in the details below to submit a new requisition.</p>
        </div>
      </div>

      {/* 1. Request Details Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-50/50">
          <CardTitle className="text-base font-semibold text-slate-800">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="requester" className="text-slate-600">
                Requester Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="requester"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="e.g. John Doe"
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-type" className="text-slate-600">
                Request Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={requestType}
                onValueChange={(value) => {
                  setRequestType(value);
                  if (value === 'NORMAL') {
                      setTempDate('');
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="req-type" className="w-full bg-white">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal (Standard Process)</SelectItem>
                  <SelectItem value="URGENT">Urgent (Expedited)</SelectItem>
                  <SelectItem value="PROJECT">Project (Specific Date)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-slate-600">
                Due Date
                {requestType !== "NORMAL" && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="due-date"
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={isSubmitting || requestType === "NORMAL"} 
                className={cn("bg-white", requestType === "NORMAL" && "bg-slate-50 text-slate-400")}
              />
              {requestType === "NORMAL" && (
                  <p className="text-[10px] text-slate-400">Auto-set to 7 days for Normal requests.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 2. Add Item Card */}
      <Card className="border-slate-200 shadow-sm overflow-visible">
        <CardHeader className="pb-4 border-b border-slate-50/50 bg-slate-50/30">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500"/> Add Item
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAddItemToCart}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Item Name (Search) - 6 cols */}
              <div className="md:col-span-6 space-y-2" ref={searchContainerRef}>
                <Label htmlFor="item-name" className="text-slate-600">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="item-name"
                    value={itemSearchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search inventory or type new item..."
                    disabled={isSubmitting}
                    autoComplete="off"
                    className="pl-9 bg-white focus-visible:ring-orange-500"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
                      {searchResults.map((item) => (
                        <div
                          key={item.barcode}
                          className="p-3 cursor-pointer hover:bg-orange-50 hover:text-orange-900 transition-colors border-b border-slate-50 last:border-0"
                          onClick={() => handleItemSelect(item)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <p className="font-medium text-sm">{item.name}</p>
                          <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-slate-500 font-mono">{item.barcode}</p>
                              <p className="text-xs font-bold text-slate-700">฿{Number(item.unit_price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Unit Price - 3 cols */}
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="price" className="text-slate-600">
                  Unit Price <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">฿</span>
                    <Input
                    id="price"
                    type="number"
                    min={0}
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="pl-7 bg-white text-right font-medium"
                    />
                </div>
              </div>

              {/* Quantity - 3 cols */}
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="quantity" className="text-slate-600">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="bg-white text-center font-medium"
                />
              </div>

              {/* Description - 6 cols */}
              <div className="md:col-span-6 space-y-2">
                <Label htmlFor="item-detail" className="text-slate-600">Description (Optional)</Label>
                <Textarea
                  id="item-detail"
                  value={currentItemDetail}
                  onChange={(e) => setCurrentItemDetail(e.target.value)}
                  placeholder="Size, color, model, specifications..."
                  disabled={isSubmitting}
                  className="bg-white resize-none h-[88px]"
                />
              </div>

              {/* Image - 6 cols */}
              <div className="md:col-span-6 space-y-2">
                <Label htmlFor="item-image" className="text-slate-600">Image Reference (Optional)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative h-[88px]">
                    <Input
                        id="item-image"
                        type="file"
                        accept="image/*"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setCurrentItemImage(e.target.files ? e.target.files[0] : undefined);
                        }}
                        disabled={isSubmitting}
                        className="absolute inset-0 opacity-0 cursor-pointer h-full"
                    />
                    {currentItemImage ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                            <Package className="w-4 h-4" />
                            {currentItemImage.name}
                        </div>
                    ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                             <Plus className="w-5 h-5 mb-1" />
                             <span className="text-xs">Click to upload image</span>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={!canAddItem || isSubmitting}
                className="text-white hover:bg-slate-800"
              >
                <Plus className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Request Items Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
             <ShoppingCart className="w-4 h-4 text-slate-400" /> Cart Items
             <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-normal">
                {cart.length}
             </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="pl-6 h-10 text-xs font-bold text-slate-500 uppercase tracking-wide w-[40%]">Item Description</TableHead>
                  <TableHead className="h-10 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Qty</TableHead>
                  <TableHead className="h-10 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Unit Price</TableHead>
                  <TableHead className="h-10 text-xs font-bold text-slate-500 uppercase tracking-wide text-right pr-6">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                       <div className="flex flex-col items-center justify-center gap-2">
                           <ShoppingCart className="w-8 h-8 text-slate-200" />
                           <p>Your cart is empty.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => (
                    <TableRow key={index} className="group hover:bg-slate-50/50 border-b border-slate-50">
                      <TableCell className="pl-6 py-4">
                        <div className="font-medium text-slate-900">{item.itemName}</div>
                        {item.detail && <div className="text-xs text-slate-500 mt-1">{item.detail}</div>}
                        {item.image && (
                             <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                                <Package className="w-3 h-3" /> Image attached
                             </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQuantity(index, e.target.value)}
                          min={1}
                          className="w-16 text-center h-8 mx-auto bg-white border-slate-200"
                          disabled={isSubmitting}
                        />
                      </TableCell>
                      <TableCell className="text-right py-4 text-slate-600">
                        ฿{item.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6 font-bold text-slate-900">
                        ฿{(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          disabled={isSubmitting}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 bg-slate-50/50 p-6 gap-4">
            <div className="flex flex-col items-start">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Estimated Cost</span>
                 <span className="text-3xl font-bold text-orange-600">฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
                {submitStatus && (
                   <span className={cn("text-sm font-medium", submitStatus.type === "success" ? "text-emerald-600" : "text-red-600")}>
                      {submitStatus.message}
                   </span>
                )}
                <Button 
                    type="button" // Changed to button to trigger onClick properly inside form context if needed, but here separate
                    onClick={handleSubmit}
                    size="lg" 
                    disabled={!canSubmit}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md w-full sm:w-auto px-8"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Submit Request"}
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}