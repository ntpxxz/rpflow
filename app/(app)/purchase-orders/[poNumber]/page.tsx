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
import { Loader2, Printer, ChevronLeft, Send } from "lucide-react";
import Image from "next/image";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Define the types for your PO data
type ExtendedPurchaseOrderItem = PurchaseOrderItem & {
  imageUrl?: string; // Make sure imageUrl is part of the type
};

type PODetails = PurchaseOrder & {
  items: ExtendedPurchaseOrderItem[];
  totalAmount: number; // This is added by your API
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poNumber = params.poNumber as string;

  const [poDetails, setPoDetails] = useState<PODetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the email modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

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

  // Function to generate PDF and send email
  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email address.");
      return;
    }

    // Find the printable area
    const printableElement = document.querySelector(
      ".printable-area"
    ) as HTMLElement;
    if (!printableElement) {
      alert("Error: Could not find printable area.");
      return;
    }

    setIsSendingEmail(true);

    try {
      // 1. Use html2canvas to capture the element
      const canvas = await html2canvas(printableElement, { scale: 2 });

      // 2. Use jspdf to create a PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // 3. Get the PDF as a base64 string (strip the data prefix)
      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      // 4. Send to our API
      const res = await fetch(`/api/purchase-orders/${poNumber}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          pdfBase64: pdfBase64,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send email");
      }

      alert("Email sent successfully!");
      setIsModalOpen(false);
      setRecipientEmail("");
    } catch (err) {
      console.error(err);
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }
  if (!poDetails) {
    return <div>Purchase Order not found.</div>;
  }

  // (Optional) You can keep your getStatusVariant function if you use it
  // const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => { ... };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* --- Button Controls (Non-Printable) --- */}
      <div className="no-print flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to PO List
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send via Email
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* --- Printable PO Area --- */}
      <div className="printable-area bg-white p-8 rounded-lg shadow-lg">
        {/* PO Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                PURCHASE ORDER
              </h1>
              <h2 className="text-2xl font-bold text-gray-700">
                {poDetails.poNumber}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold mb-2">IOT SECTION</div>
              <p className="text-sm text-gray-600">
                NMB, Spindle motor division
              </p>
              <p className="text-sm text-gray-600">Tel: 2472</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">
                PO Details
              </h3>
              <p className="text-sm text-gray-600">
                <strong>PO Date:</strong>{" "}
                {format(new Date(poDetails.createdAt), "dd MMM yyyy")}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sent Date:</strong>{" "}
                {poDetails.sentAt
                  ? format(new Date(poDetails.sentAt), "dd MMM yyyy")
                  : "N/A"}
              </p>
            </div>
          </div>
        </header>

        {/* PO Items Table */}
        <main className="mb-8">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poDetails.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-gray-800">
                    {item.itemName}
                  </TableCell>
                  <TableCell>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.itemName}
                        width={64}
                        height={64}
                        className="rounded object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground">No Image</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-gray-800">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-gray-800">
                    ฿{Number(item.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-800">
                    ฿{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </main>

        {/* PO Footer (Totals) */}
        <footer className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ฿{poDetails.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
              <span className="text-lg font-bold">Total Amount:</span>
              <span className="text-lg font-bold">
                ฿{poDetails.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </footer>

        <div className="mt-12 text-center text-xs text-gray-500">
          Thank you for your business!
        </div>
      </div>

      {/* --- Email Send Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send PO via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address. The PO will be attached as a
              PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="vendor@example.com"
                className="col-span-3"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
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
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}