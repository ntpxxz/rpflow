// app/(app)/procurement/request-quotation/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RequestItem, PurchaseRequest, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Loader2, Printer, ChevronLeft, Send, Package, X, FileText, UserRound } from "lucide-react";import Image from "next/image";

type ItemWithDetails = RequestItem & {
  request: PurchaseRequest & {
    user: User;
  };
};

export default function RequestQuotationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>}>
      <RequestQuotationContent />
    </Suspense>
  );
}

function RequestQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  
  const rfqNumber = `RFQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`;

  useEffect(() => {
    if (!idsParam) return;

    fetch("/api/procurement/queue")
      .then((res) => res.json())
      .then((data: ItemWithDetails[]) => {
        const selectedIds = idsParam.split(",");
        const filteredItems = data.filter((item) => selectedIds.includes(item.id));
        setItems(filteredItems);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [idsParam]);

  const handlePrintOrSavePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await fetch("/api/request-quotation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: items.map(i => i.id), rfqNumber })
      });

      if (!res.ok) throw new Error((await res.json()).message);
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      window.open(url);
    } catch (err: any) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email address.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/request-quotation/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: items.map(i => i.id),
          recipientEmail,
          ccEmail,
          rfqNumber
        }),
      });

      if (!res.ok) throw new Error((await res.json()).message);
      alert("RFQ sent successfully!");
      setIsModalOpen(false);
      router.push("/procurement"); 
    } catch (err: any) {
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
};

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity - item.quantityOrdered), 0);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (items.length === 0) return <div className="p-8 text-center text-muted-foreground">No items found.</div>;

  return (
    <div className="max-w mx-auto pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Request for Quotation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Item List */}
        <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            Items List 
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{items.length}</span>
                        </h2>
                        <span className="text-sm text-muted-foreground">Ref: {rfqNumber}</span>
                    </div>

                    <div className="space-y-4">
                        {items.map((item) => {
                            const qty = item.quantity - item.quantityOrdered;
                            return (
                                <div key={item.id} className="group relative flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    {/* 1. Image: ทำให้ดูดีขึ้นด้วย bg และ border */}
                                    <div className="relative w-28 h-28 rounded-lg overflow-hidden border bg-slate-50 shrink-0 self-center">
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Package className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Content: จัด layout ใหม่ */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="pr-8">
                                                <h3 className="font-bold text-lg text-foreground line-clamp-1" title={item.itemName}>
                                                    {item.itemName}
                                                </h3>
                                            </div>
                                            
                                            {/* ปุ่มลบ (X) */}
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {/* Metadata Section: ใส่พื้นหลังจางๆ ให้ดูเป็นสัดส่วน */}
                                        <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap gap-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                    <UserRound className="h-3.5 w-3.5 text-blue-500" />
                                                    <span>{item.request.user?.name || "Unknown"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                                                    <span className="font-mono">{item.requestId}</span>
                                                </div>
                                            </div>

                                            {/* Quantity Badge ใหญ่ขึ้น */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Qty</span>
                                                <div className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-lg font-bold text-lg shadow-sm min-w-[3rem] text-center">
                                                    {qty}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-1">
            <Card className="sticky top-6 shadow-lg border-0 bg-white dark:bg-zinc-900">
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-xl">Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Unique Items</span>
                        <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Quantity</span>
                        <span className="font-medium">{totalQuantity}</span>
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold">Action</span>
                            <span className="text-xs text-muted-foreground">Ready to send</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                    <Button 
                        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={() => setIsModalOpen(true)}
                        disabled={isSendingEmail}
                    >
                        {isSendingEmail ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                        Send RFQ Email
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="w-full border-slate-300 hover:bg-slate-50"
                        onClick={handlePrintOrSavePDF}
                        disabled={isGeneratingPdf}
                    >
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Print PDF
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>

      {/* --- Email Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Request Quotation</DialogTitle>
            <DialogDescription>
              Enter vendor email address. The RFQ PDF will be attached.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">To:</Label>
              <Input
                id="email"
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
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}