// app/(app)/procurement/create-po/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RequestItem, PurchaseRequest, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Send, FileCheck } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ItemWithDetails = RequestItem & {
  request: PurchaseRequest & {
    user: User;
  };
};

export default function CreatePOPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePOContent />
    </Suspense>
  );
}

function CreatePOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State สำหรับข้อมูลที่แก้ไขได้
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [quotations, setQuotations] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  // States สำหรับ Email Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [newPoNumber, setNewPoNumber] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');


  useEffect(() => {
    if (!idsParam) return;

    fetch("/api/procurement/queue")
      .then((res) => res.json())
      .then((data: ItemWithDetails[]) => {
        const selectedIds = idsParam.split(",");
        const filteredItems = data.filter((item) => selectedIds.includes(item.id));
        
        setItems(filteredItems);
        
        // Initialize state values
        const initPrices: Record<string, string> = {};
        const initQuotes: Record<string, string> = {};
        const initQuantities: Record<string, string> = {};
        
        filteredItems.forEach(item => {
            const qtyToOrder = item.quantity - item.quantityOrdered;
            
            initPrices[item.id] = item.unitPrice.toString();
            initQuantities[item.id] = qtyToOrder.toString(); 
        });
        
        setPrices(initPrices);
        setQuantities(initQuantities);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [idsParam]);

  

  const handlePriceChange = (id: string, val: string) => {
    setPrices(prev => ({ ...prev, [id]: val }));
  };

  const handleQuoteChange = (id: string, val: string) => {
    setQuotations(prev => ({ ...prev, [id]: val }));
  };
  const handleIncrementDecrement = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const maxAvailableQty = item.quantity - item.quantityOrdered;
    const currentQty = parseInt(quantities[id] || "1", 10);
    
    let newQty = currentQty + delta;
    
    // จำกัดให้อยู่ในช่วง [1, maxAvailableQty]
    newQty = Math.max(1, newQty);
    newQty = Math.min(maxAvailableQty, newQty);

    setQuantities(prev => ({ ...prev, [id]: newQty.toString() }));
  };
  
  const handleQuantityChange = (id: string, val: string) => {
    const numericVal = parseInt(val, 10);
    const validatedVal = (numericVal < 1 || isNaN(numericVal)) ? '1' : val;
    setQuantities(prev => ({ ...prev, [id]: validatedVal }));
  };


  const totalAmount = items.reduce((sum, item) => {
    const qty = parseInt(quantities[item.id] || "0", 10);
    const price = parseFloat(prices[item.id] || "0");
    return sum + (qty * price);
  }, 0);

  const handleConfirmCreate = async () => {
    if (!confirm("Confirm creating Purchase Order for these items?")) return;
    
    setIsSubmitting(true);
    try {
        const payload = items.map(item => ({
            id: item.id,
            quotationNumber: quotations[item.id] || null,
            unitPrice: parseFloat(prices[item.id] || "0"),
            quantity: parseInt(quantities[item.id] || "0", 10) 
        }));

        const res = await fetch("/api/purchase-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: payload })
        });

        if (!res.ok) throw new Error((await res.json()).message);
        
        const poData = await res.json();
        
        setNewPoNumber(poData.poNumber);
        setIsSendModalOpen(true); 
        
    } catch (error: any) {
        alert("Error creating PO: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSendPOEmail = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email address.");
      return;
    }
    setIsSendingEmail(true);

    try {
        const res = await fetch(`/api/purchase-orders/${newPoNumber}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: recipientEmail,
            ccEmails: ccEmail ? ccEmail.split(',').map(s => s.trim()).filter(s => s) : undefined, 
          }),
        });
        
        if (!res.ok) throw new Error((await res.json()).message);
        
        alert(`PO ${newPoNumber} sent successfully!`);
        setIsSendModalOpen(false);
        router.push("/purchase-orders"); 
        
    } catch (error: any) {
        console.error(error);
        alert(`Failed to send email: ${error.message}`);
    } finally {
        setIsSendingEmail(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (items.length === 0) return <div className="p-8">No items found.</div>;

  return (
    <div className="space-y-6 max-w mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Create Purchase Order</h1>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Review & Edit Items</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Item</TableHead>
                        <TableHead></TableHead>
                        <TableHead className="w-[100px] text-center">Qty</TableHead>
                        <TableHead className="w-[150px]">Unit Price</TableHead>
                        <TableHead className="w-[180px]">Quotation No.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const qty = parseInt(quantities[item.id] || "0", 10);
                        const price = parseFloat(prices[item.id] || "0");
                        const total = qty * price;

                        return (
                            <TableRow key={item.id}>
                                <TableCell>
                                    {item.imageUrl ? (
                                        <div className="relative w-12 h-12 rounded border overflow-hidden bg-white">
                                            <Image 
                                                src={item.imageUrl} 
                                                alt={item.itemName} 
                                                fill 
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-muted-foreground">
                                            No Img
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{item.itemName}</div>
                                    <div className="text-xs text-blue-600 mt-1">PR: {item.requestId}</div>
                                </TableCell>
                                <TableCell className="text-center font-bold text-lg">
                                    <Input 
                                        type="number" 
                                        min="1"
                                        value={quantities[item.id] || ""}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        className="text-center h-8"
                                        style={{ maxWidth: '80px', margin: '0 auto' }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="text" 
                                        min="0"
                                        value={prices[item.id] || ""}
                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                        className="text-right"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        placeholder="QT-XXXX"
                                        value={quotations[item.id] || ""}
                                        onChange={(e) => handleQuoteChange(item.id, e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6 bg-slate-50">
            <div className="text-lg font-medium">
                Total Amount: <span className="text-2xl font-bold ml-2 text-primary">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <Button size="lg" onClick={handleConfirmCreate} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck className="h-4 w-4"/>}
                Create PO
            </Button>
        </CardFooter>
      </Card>

      {/* Email Send Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle><strong>{newPoNumber}</strong></DialogTitle>
            <DialogDescription>
             Enter vendor email to send the document confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient-email" className="text-right">Recipient:</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="vendor@example.com"
                className="col-span-3"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cc-email" className="text-right">CC:</Label>
              <Input
                id="cc-email"
                type="email"
                placeholder="(Optional) Comma-separated emails"
                className="col-span-3"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
          <DialogClose asChild>
              <Button variant="outline" disabled={isSendingEmail}>Cancel</Button>
            </DialogClose>

            {/*<DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSendingEmail}>
                Skip & View PO
              </Button>
            </DialogClose>*/}
            <Button
              type="button"
              onClick={handleSendPOEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
               Confim & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}