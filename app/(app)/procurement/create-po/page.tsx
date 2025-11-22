// app/(app)/procurement/create-po/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RequestItem, PurchaseRequest, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Send, FileCheck, Package, ChevronLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type ItemWithDetails = RequestItem & {
  request: PurchaseRequest & {
    user: User;
  };
};

export default function CreatePOPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary"/></div>}>
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

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [quotations, setQuotations] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});

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
        
        const initPrices: Record<string, string> = {};
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

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (items.length === 0) return <div className="p-10 text-center text-muted-foreground">No items selected for PO.</div>;

  return (
    <div className="space-y-6 max-w mx-auto pb-10 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create Purchase Order</h1>
            <p className="text-sm text-muted-foreground">Review details and confirm quantities.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Order Items</CardTitle>
            <CardDescription>Adjust quantity and final price before generating PO.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="w-[80px] pl-6 h-11 text-xs font-bold uppercase text-slate-500">Image</TableHead>
                        <TableHead className="h-11 text-xs font-bold uppercase text-slate-500">Item Description</TableHead>
                        <TableHead className="w-[120px] text-center h-11 text-xs font-bold uppercase text-slate-500">Qty</TableHead>
                        <TableHead className="w-[160px] text-right h-11 text-xs font-bold uppercase text-slate-500">Unit Price</TableHead>
                        <TableHead className="w-[180px] h-11 text-xs font-bold uppercase text-slate-500 pl-6">Quotation No.</TableHead>
                        <TableHead className="text-right pr-6 h-11 text-xs font-bold uppercase text-slate-500">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const qty = parseInt(quantities[item.id] || "0", 10);
                        const price = parseFloat(prices[item.id] || "0");
                        const total = qty * price;

                        return (
                            <TableRow key={item.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                                <TableCell className="pl-6 py-4">
                                    {item.imageUrl ? (
                                        <div className="relative w-12 h-12 rounded-lg border border-slate-100 overflow-hidden bg-white shadow-sm">
                                            <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300">
                                            <Package className="h-5 w-5" />
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="font-medium text-sm text-foreground">{item.itemName}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-slate-50 font-mono font-normal">
                                            PR: {item.requestId}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Input 
                                        type="number" 
                                        min="1"
                                        value={quantities[item.id] || ""}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        className="text-center h-9 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500 font-medium"
                                    />
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">฿</span>
                                        <Input 
                                            type="text" 
                                            min="0"
                                            value={prices[item.id] || ""}
                                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                            className="text-right pl-6 h-9 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500 font-medium"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 pl-6">
                                    <Input 
                                        placeholder="QT-XXXX"
                                        value={quotations[item.id] || ""}
                                        onChange={(e) => handleQuoteChange(item.id, e.target.value)}
                                        className="h-9 bg-white border-slate-200 text-xs uppercase"
                                    />
                                </TableCell>
                                <TableCell className="text-right pr-6 py-4 font-bold text-slate-900">
                                    ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t border-slate-100 bg-slate-50/50 p-6">
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Amount</span>
                <span className="text-2xl font-bold text-orange-600">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <Button 
                size="lg" 
                onClick={handleConfirmCreate} 
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-md font-semibold px-8"
            >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <FileCheck className="mr-2 h-5 w-5"/>}
                Create PO
            </Button>
        </CardFooter>
      </Card>

      {/* Email Send Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>PO Created: <span className="font-mono text-orange-600">{newPoNumber}</span></DialogTitle>
            <DialogDescription>
             The Purchase Order has been created successfully. Send it to the vendor now?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient-email" className="text-right text-slate-500">To</Label>
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
              <Label htmlFor="cc-email" className="text-right text-slate-500">CC</Label>
              <Input
                id="cc-email"
                type="email"
                placeholder="manager@company.com"
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
            <Button
              type="button"
              onClick={handleSendPOEmail}
              disabled={isSendingEmail}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
               Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}