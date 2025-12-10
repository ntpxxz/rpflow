// app/(app)/procurement/request-quotation/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RequestItem, PurchaseRequest, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
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
import { Loader2, Printer, ChevronLeft, Send, Package, X, FileText, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

type ItemWithDetails = RequestItem & {
  request: PurchaseRequest & {
    user: User;
  };
};

export default function RequestQuotationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>}>
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

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (items.length === 0) return <div className="p-10 text-center text-muted-foreground">No items selected.</div>;

  return (
    <div className="space-y-6 max-w mx-auto pb-10 font-sans">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100 text-slate-500">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Request for Quotation</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 font-mono font-normal">
              {rfqNumber}
            </Badge>
            <span className="text-sm text-muted-foreground">Draft</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Item List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Items List
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full px-2">{items.length}</Badge>
            </h2>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const qty = item.quantity - item.quantityOrdered;
              return (
                <Card key={item.id} className="group relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex p-4 gap-5">
                    {/* Image */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-bold text-base text-foreground line-clamp-1" title={item.itemName}>
                            {item.itemName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.detail || "No description"}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <UserIcon className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{item.request.user?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <FileText className="h-3 w-3" />
                            <span className="font-mono">{item.requestId}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 tracking-wider">Quantity</span>
                          <span className="font-bold text-lg text-foreground">{qty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-slate-200 shadow-md">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold">Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Unique Items</span>
                <span className="font-semibold text-slate-900">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Quantity</span>
                <span className="font-semibold text-slate-900">{totalQuantity}</span>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mt-4">
                <div className="flex items-center gap-2 text-blue-800 font-medium text-xs">
                  <Send className="h-3.5 w-3.5" />
                  <span>Ready to request</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6 px-6">
              <Button
                className="w-full  text-white font-medium h-11"
                onClick={() => setIsModalOpen(true)}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send via Email
              </Button>

              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 h-11"
                onClick={handlePrintOrSavePDF}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Preview PDF
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
              Enter the vendor's email address. The RFQ document will be attached as a PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-slate-500">To</Label>
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
              <Button type="button" variant="outline" disabled={isSendingEmail}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}