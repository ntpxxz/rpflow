// app/(app)/purchase-orders/[poNumber]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem, User } from "@prisma/client";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Loader2, Printer, ChevronLeft, Send, FileText, MapPin, Phone, Building2, CheckCircle2, Clock, Truck, XCircle, PackageCheck, History, Package, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Define types
type ExtendedPurchaseOrderItem = PurchaseOrderItem & {
  imageUrl?: string;
  quantityReceived: number;
};

type ExtendedGoodsReceipt = GoodsReceipt & {
  receivedBy: User;
  items: (GoodsReceiptItem & { poItem: PurchaseOrderItem })[];
};

type PODetails = PurchaseOrder & {
  items: ExtendedPurchaseOrderItem[];
  totalAmount: number;
  receipts: ExtendedGoodsReceipt[];
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
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  // Email Form
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");

  // Receive Form
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState("");

  const fetchPO = () => {
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
  };

  useEffect(() => {
    if (poNumber) {
      fetchPO();
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

  const handlePrintOrSavePDF = () => {
    window.print();
  };

  const handleReceiveQuantityChange = (itemId: string, val: string) => {
    const num = parseInt(val) || 0;
    setReceiveQuantities(prev => ({ ...prev, [itemId]: num }));
  };

  const handleSubmitReceipt = async () => {
    setIsSubmittingReceipt(true);
    try {
      const receivedItems = Object.entries(receiveQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => ({
          poItemId: itemId,
          quantity: qty
        }));

      if (receivedItems.length === 0) {
        alert("Please enter quantity for at least one item.");
        setIsSubmittingReceipt(false);
        return;
      }

      const res = await fetch(`/api/purchase-orders/${poNumber}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedItems,
          notes: receiveNotes,
          receivedById: "user_admin_001" // TODO: Get from session
        })
      });

      if (!res.ok) throw new Error("Failed to submit receipt");

      alert("Items received successfully!");
      setIsReceiveModalOpen(false);
      setReceiveQuantities({});
      setReceiveNotes("");
      fetchPO(); // Refresh data
    } catch (error) {
      console.error(error);
      alert("Error receiving items");
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Sent":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            <Truck className="w-4 h-4 mr-2" /> In Progress
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            <FileText className="w-4 h-4 mr-2" /> Draft
          </Badge>
        );
      case "Fulfilled":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Arrived
          </Badge>
        );
      case "Partial":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            <Clock className="w-4 h-4 mr-2" /> Partially Received
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            <XCircle className="w-4 h-4 mr-2" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-200 px-3 py-1 text-sm font-medium rounded-full">
            {status}
          </Badge>
        );
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500 font-medium">Error: {error}</div>;
  if (!poDetails) return <div className="flex justify-center items-center h-screen text-muted-foreground">Purchase Order not found.</div>;

  return (
    <>
      {/* 
        =======================================================================
        PRINT-ONLY VIEW (Matches RFQ Preview Style)
        =======================================================================
      */}
      <div className="hidden print:block bg-white p-8 font-sans text-xs text-slate-800 leading-normal max-w-[210mm] mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-black uppercase mb-1">MinebeaMitsumi (Thailand)</h1>
            <p className="text-slate-600">IOT Section, Spindle Motor Division</p>
            <p className="text-slate-600">1/1 Moo 7 Phaholyothin Rd, Km.51, Ayutthaya 13180</p>
            <p className="text-slate-600">Tel: 2472 | Email: nattapon.m@minebea.co.th</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-blue-700 uppercase tracking-wide mb-1">Purchase Order</h2>
            <div className="text-slate-500 text-xs mt-1">
              Document No: <strong className="text-black">{poDetails.poNumber}</strong>
            </div>
            <div className="text-slate-500 text-xs">
              Date: <strong className="text-black">{format(new Date(poDetails.createdAt), "dd MMM yyyy")}</strong>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse mb-6 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="py-2 px-2 text-center w-10 border-b border-slate-200 font-bold text-slate-700 uppercase">#</th>
              <th className="py-2 px-2 text-left w-16 border-b border-slate-200 font-bold text-slate-700 uppercase">Image</th>
              <th className="py-2 px-2 text-left border-b border-slate-200 font-bold text-slate-700 uppercase">Item Description</th>
              <th className="py-2 px-2 text-center w-16 border-b border-slate-200 font-bold text-slate-700 uppercase">Qty</th>
              <th className="py-2 px-2 text-right w-24 border-b border-slate-200 font-bold text-slate-700 uppercase">Unit Price</th>
              <th className="py-2 px-2 text-right w-24 border-b border-slate-200 font-bold text-slate-700 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {poDetails.items.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 px-2 text-center text-slate-500">{index + 1}</td>
                <td className="py-2 px-2 text-center">
                  {item.imageUrl ? (
                    <div className="w-10 h-10 relative mx-auto border border-slate-100 bg-white p-0.5 rounded">
                      {/* Use standard img tag for print to ensure it loads without Next.js optimization issues in some print contexts, though Image is fine usually */}
                      <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-2 px-2 align-middle">
                  <span className="font-bold block text-slate-900">{item.itemName}</span>
                  <span className="text-[10px] text-slate-500">{item.detail || ''}</span>
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                <td className="py-2 px-2 text-right text-slate-700">฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">฿{(item.quantity * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200">
              <td colSpan={4} className="py-3 px-2 text-right font-bold text-slate-700 uppercase">Subtotal:</td>
              <td colSpan={2} className="py-3 px-2 text-right font-bold text-slate-900">฿{poDetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td colSpan={4} className="py-1 px-2 text-right font-bold text-slate-700 uppercase">VAT (7%):</td>
              <td colSpan={2} className="py-1 px-2 text-right font-bold text-slate-900">฿{(poDetails.totalAmount * 0.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={4} className="py-3 px-2 text-right font-bold text-slate-900 uppercase text-sm">Total Amount:</td>
              <td colSpan={2} className="py-3 px-2 text-right font-bold text-orange-600 text-sm">฿{(poDetails.totalAmount * 1.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 border border-slate-200 rounded p-4 bg-white break-inside-avoid">
          <b className="block text-slate-700 mb-2 uppercase text-[10px]">Note / Remarks:</b>
          <div className="text-slate-600 space-y-1">
            <p>1. Please confirm receipt of this purchase order.</p>
            <p>2. All goods must be delivered to the address specified above within business hours.</p>
            <p>3. Payment terms: 30 days after invoice date.</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 pb-4">
          System Generated by RPFlow
        </div>
      </div>

      {/* 
        =======================================================================
        SCREEN VIEW (Interactive UI)
        =======================================================================
      */}
      <div className="space-y-8 max-w-8xl mx-auto pb-20 px-4 sm:px-6 lg:px-8 print:hidden">

        {/* --- Header & Actions --- */}
        <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Order Details  {renderStatusBadge(poDetails.status)}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{poDetails.poNumber}</span>
                <span>•</span>
                <span>{format(new Date(poDetails.createdAt), "MMMM d, yyyy")}</span>
              </div>

            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">

            <Button onClick={() => setIsReceiveModalOpen(true)} className="flex-1 md:flex-none bg-orange-600 text-white hover:bg-orange-700 shadow-sm transition-all hover:shadow-md">
              <PackageCheck className="h-4 w-4 mr-2" />
              Receive Items
            </Button>
            {/*<Button variant="outline" onClick={handlePrintOrSavePDF} disabled={isGeneratingPdf} className="flex-1 md:flex-none border-slate-200 hover:bg-slate-50 text-slate-700">
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Print / PDF
            </Button>*/}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- Left Column: Document Preview --- */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="printable-area bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 md:p-10">
                {/* Document Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-orange-100 shadow-lg">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">PURCHASE ORDER</h2>
                        <p className="text-sm text-slate-500 font-medium">Official Document</p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-1.5 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">IOT SECTION</span>
                      </div>
                      <div className="pl-6 text-slate-500">NMB, Spindle motor division</div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>Tel: 2472</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 md:mt-0 text-left md:text-right space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PO Number</p>
                    <h3 className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{poDetails.poNumber}</h3>

                    <div className="pt-6 space-y-2">
                      <div className="flex md:justify-end items-center gap-4 text-sm">
                        <span className="text-slate-500">Issue Date:</span>
                        <span className="font-medium text-slate-900">{format(new Date(poDetails.createdAt), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex md:justify-end items-center gap-4 text-sm">
                        <span className="text-slate-500">Sent Date:</span>
                        <span className="font-medium text-slate-900">
                          {poDetails.sentAt ? format(new Date(poDetails.sentAt), "dd MMM yyyy") : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-10 overflow-hidden rounded-lg border border-slate-100">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="w-[80px] h-12 text-xs font-bold text-slate-500 uppercase tracking-wider pl-4">Image</TableHead>
                        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Description</TableHead>
                        <TableHead className="h-12 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ordered</TableHead>
                        <TableHead className="h-12 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Received</TableHead>
                        <TableHead className="h-12 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price</TableHead>
                        <TableHead className="h-12 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-4">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poDetails.items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100 text-sm last:border-0">
                          <TableCell className="py-4 pl-4">
                            {item.imageUrl ? (
                              <div className="w-12 h-12 rounded-lg border border-slate-100 overflow-hidden relative bg-white shadow-sm group">
                                <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover transition-transform group-hover:scale-105" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400 border border-slate-100">
                                <Package className="w-5 h-5 opacity-20" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-semibold text-slate-900">{item.itemName}</div>
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.detail || "No additional details"}</div>
                          </TableCell>
                          <TableCell className="text-right py-4 font-medium text-slate-700">{item.quantity}</TableCell>
                          <TableCell className="text-right py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-semibold",
                              item.quantityReceived >= item.quantity
                                ? "bg-emerald-100 text-emerald-700"
                                : item.quantityReceived > 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-slate-100 text-slate-600"
                            )}>
                              {item.quantityReceived} / {item.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4 text-slate-600">฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right py-4 font-bold text-slate-900 pr-4">
                            ฿{(item.quantity * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer & Totals */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                  <div className="text-sm text-slate-500 max-w-sm bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" /> Notes
                    </p>
                    <p className="leading-relaxed text-xs text-slate-600">Please confirm receipt of this purchase order. All goods must be delivered to the address specified above within business hours.</p>
                  </div>

                  <div className="w-full md:w-80 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-slate-500 font-medium">Subtotal</span>
                      <span className="font-semibold text-slate-900">฿{poDetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span className="text-slate-500 font-medium">VAT (7%)</span>
                      <span className="font-semibold text-slate-900">฿{(poDetails.totalAmount * 0.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="font-bold text-2xl text-orange-600">฿{(poDetails.totalAmount * 1.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* --- Right Column: History & Activity --- */}
          <div className="space-y-6">
            {/* Receipt History Card */}
            <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <History className="h-4 w-4 text-orange-500" />
                  Receipt Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {poDetails.receipts && poDetails.receipts.length > 0 ? (
                  <div className="relative pl-8 pr-6 py-6 space-y-8 before:absolute before:left-[27px] before:top-6 before:bottom-6 before:w-0.5 before:bg-slate-200">
                    {poDetails.receipts.map((receipt) => (
                      <div key={receipt.id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm ring-1 ring-orange-100"></div>

                        <div className="flex flex-col gap-1 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              Received
                            </span>
                            <span className="text-xs text-slate-400">
                              {format(new Date(receipt.receivedAt), "MMM d, HH:mm")}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5 mt-1">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            {receipt.receivedBy?.name || "Unknown User"}
                          </div>
                        </div>

                        {receipt.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg mb-3 border border-slate-100 italic">
                            "{receipt.notes}"
                          </div>
                        )}

                        <div className="space-y-2">
                          {receipt.items.map((ri) => (
                            <div key={ri.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                              <span className="text-slate-600 truncate max-w-[140px]">{ri.poItem.itemName}</span>
                              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">+{ri.quantityReceived}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No receipts yet</p>
                    <p className="text-xs text-slate-500 mt-1">Items received will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* --- Receive Items Modal --- */}
        <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
            <DialogHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-orange-600" />
                Receive Items
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Update inventory by confirming received quantities.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 max-h-[60vh] overflow-y-auto bg-white">
              <div className="space-y-4">
                {poDetails.items.map((item) => {
                  const remaining = item.quantity - item.quantityReceived;
                  const isFullyReceived = remaining <= 0;

                  return (
                    <div key={item.id} className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border transition-all",
                      isFullyReceived ? "bg-slate-50 border-slate-100 opacity-75" : "bg-white border-slate-200 shadow-sm hover:border-orange-200"
                    )}>
                      <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-slate-900 truncate pr-2">{item.itemName}</h4>
                          {isFullyReceived && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded">Ordered: <span className="font-medium text-slate-700">{item.quantity}</span></span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Received: <span className="font-medium">{item.quantityReceived}</span></span>
                        </div>

                        {!isFullyReceived && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="font-medium text-slate-700">Receive Now</span>
                                <span className="text-orange-600 font-medium">Max: {remaining}</span>
                              </div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  placeholder="0"
                                  className="pl-3 pr-12 h-9 border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                                  value={receiveQuantities[item.id] || ''}
                                  onChange={(e) => handleReceiveQuantityChange(item.id, e.target.value)}
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">PCS</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">Receipt Notes</Label>
                <Textarea
                  placeholder="Add any details about this delivery (e.g., condition, tracking #, delivery person)..."
                  className="resize-none min-h-[80px] border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsReceiveModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitReceipt}
                disabled={isSubmittingReceipt}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm px-6"
              >
                {isSubmittingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                Confirm Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Email Send Modal --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          {/* ... (Existing Email Modal Code - keeping it simple for now or can style similarly) ... */}
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
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}