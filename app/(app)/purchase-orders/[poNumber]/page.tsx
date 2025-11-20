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
import { format } from "date-fns";
import { Loader2, Printer, ChevronLeft, Send, FileText, MapPin, Phone, Building2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// Define types
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

  // Modal & Action States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Email Form
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");

  useEffect(() => {
    if (poNumber) {
      setLoading(true);
      fetch(`/api/purchase-orders/${poNumber}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to fetch PO details");
          }
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

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email address.");
      return;
    }    
    setIsSendingEmail(true);    
    try {    
      const res = await fetch(`/api/purchase-orders/${poNumber}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          ccEmails: ccEmail ? ccEmail.split(',').map(e => e.trim()) : undefined,
        }),
      });
  
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send email");
      }
  
      alert("Email sent successfully!");
      setIsModalOpen(false);
      setRecipientEmail("");
      setCcEmail("");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }       
  }

  const handlePrintOrSavePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poNumber}/preview`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to generate PDF");
      }

      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      window.open(url);
      
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="flex justify-center items-center h-64 text-red-500">Error: {error}</div>;
  if (!poDetails) return <div className="flex justify-center items-center h-64 text-muted-foreground">Purchase Order not found.</div>;

  return (
    <div className="space-y-6 max-w mx-auto pb-10">
      
      {/* --- Header & Actions --- */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Order Details</h1>
            <Badge variant="outline" className="ml-2 bg-slate-50">{poDetails.status}</Badge>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
        {/*<Button variant="outline" onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none">
            <Send className="h-4 w-4 mr-2" />
            Email Vendor
          </Button>*/}
          <Button onClick={handlePrintOrSavePDF} disabled={isGeneratingPdf} className="flex-1 sm:flex-none bg-slate-900 text-white hover:bg-slate-800">
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print / PDF
          </Button>
        </div>
      </div>

      {/* --- Document Preview Area --- */}
      <Card className="printable-area bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-slate-100 pb-8">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">PURCHASE ORDER</h2>
                    <p className="text-sm text-slate-500">Official Document</p>
                </div>
             </div>
             
             <div className="pt-4 space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-900">IOT SECTION</span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                    <span>NMB, Spindle motor division</span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>Tel: 2472</span>
                </div>
             </div>
          </div>

          <div className="mt-6 md:mt-0 text-left md:text-right space-y-1">
            <p className="text-sm text-slate-500">PO Number</p>
            <h3 className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{poDetails.poNumber}</h3>
            
            <div className="pt-4 space-y-1">
                <div className="flex md:justify-end items-center gap-4 text-sm">
                    <span className="text-slate-500">Issue Date:</span>
                    <span className="font-medium">{format(new Date(poDetails.createdAt), "dd MMM yyyy")}</span>
                </div>
                <div className="flex md:justify-end items-center gap-4 text-sm">
                    <span className="text-slate-500">Sent Date:</span>
                    <span className="font-medium">
                        {poDetails.sentAt ? format(new Date(poDetails.sentAt), "dd MMM yyyy") : "-"}
                    </span>
                </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-12">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-slate-500">Image</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Item Description</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Qty</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Unit Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poDetails.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                  <TableCell className="py-4">
                    {item.imageUrl ? (
                      <div className="w-12 h-12 rounded-lg border border-slate-100 overflow-hidden relative bg-white">
                          <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">No Img</div>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-semibold text-slate-900">{item.itemName}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.detail || "No additional details"}</div>
                  </TableCell>
                  <TableCell className="text-right py-4 font-medium">{item.quantity}</TableCell>
                  <TableCell className="text-right py-4 text-slate-600">฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right py-4 font-bold text-slate-900">
                    ฿{(item.quantity * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer & Totals */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="text-sm text-slate-500 max-w-sm">
                <p className="font-semibold text-slate-900 mb-1">Notes:</p>
                <p>Please confirm receipt of this purchase order. All goods must be delivered to the address specified above.</p>
            </div>

            <div className="w-full md:w-72 bg-slate-50 p-6 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-3 text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-900">฿{poDetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-slate-500">VAT (7%)</span>
                    <span className="font-medium text-slate-900">฿{(poDetails.totalAmount * 0.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-xl text-blue-600">฿{(poDetails.totalAmount * 1.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
      </Card>

      {/* --- Email Send Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send PO Email</DialogTitle>
            <DialogDescription>
              Send this purchase order to the vendor. A PDF copy will be attached.
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}