// app/(app)/purchase-requests/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  PurchaseRequest,
  User,
  RequestItem,
  ApprovalStep,
  RequestHistory,
} from "@prisma/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Loader2,
  Check,
  X,
  Clock,
  FileText,
  ShoppingCart,
  Package,
  ArrowLeft,
  User as UserIcon,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
  Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// --- Type Definition ---
type PurchaseRequestWithDetails = PurchaseRequest & {
  user: User;
  items: (RequestItem & {
    inventoryDetails?: { name?: string; description?: string };
  })[];
  approvalSteps: (ApprovalStep & { approver: User })[];
  history: (RequestHistory & { actor: User })[];
};

export default function PurchaseRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const { data: session } = useSession();
  const [requestDetails, setRequestDetails] = useState<PurchaseRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Action States
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && requestDetails) {
      setSelectedItems(new Set(requestDetails.items.map((i) => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const next = new Set(selectedItems);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedItems(next);
  };

  const pendingStep = useMemo(() => {
    return requestDetails?.approvalSteps.find(
      (step) => step.status?.toLowerCase() === "pending"
    );
  }, [requestDetails]);

  // Check if current user is authorized to approve
  const canApprove = useMemo(() => {
    if (!session?.user || !pendingStep) return false;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    // User can approve if they are the assigned approver OR an Admin
    return pendingStep.approverId === userId || userRole === "Admin" || userRole === "Approver";
  }, [session, pendingStep]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const fetchRequestDetails = () => {
    setLoading(true);
    fetch(`/api/purchase-requests/${requestId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch request ${requestId}`);
        }
        return res.json();
      })
      .then((data: PurchaseRequestWithDetails) => {
        setRequestDetails(data);
        setSelectedItems(new Set(data.items.map((item) => item.id)));
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
        setIsSubmitting(false);
        setComment("");
      });
  };

  const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
    if (!pendingStep) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/approval-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStepId: pendingStep.id,
          newStatus: newStatus,
          comment: comment,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).message);
      fetchRequestDetails();
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  // --- Helper Components ---

  const StatusBadge = ({ status }: { status: string }) => {
    let styles = "bg-slate-100 text-slate-600 border-slate-200";
    let icon = null;

    switch (status.toLowerCase()) {
      case "approved":
        styles = "bg-emerald-100 text-emerald-700 border-emerald-200";
        icon = <Check className="w-3 h-3 mr-1" />;
        break;
      case "rejected":
      case "cancelled":
        styles = "bg-red-100 text-red-700 border-red-200";
        icon = <X className="w-3 h-3 mr-1" />;
        break;
      case "ordered":
        styles = "bg-blue-100 text-blue-700 border-blue-200";
        icon = <ShoppingCart className="w-3 h-3 mr-1" />;
        break;
      case "received":
        styles = "bg-purple-100 text-purple-700 border-purple-200";
        icon = <Package className="w-3 h-3 mr-1" />;
        break;
      case "pending":
        styles = "bg-orange-100 text-orange-700 border-orange-200";
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <Badge variant="outline" className={cn("capitalize border px-2.5 py-0.5 rounded-md shadow-sm", styles)}>
        {icon} {status}
      </Badge>
    );
  };

  const ProcessTracker = () => {
    if (!requestDetails) return null;
    const history = requestDetails.history;

    const steps = [
      {
        key: "SUBMITTED",
        label: "Submitted",
        icon: FileText,
        date: requestDetails.createdAt
      }, { key: "APPROVED", label: "Approved", icon: Check, date: history.find(h => h.action.includes("APPROVED"))?.timestamp },
      { key: "PO_CREATED", label: "Ordered", icon: ShoppingCart, date: history.find(h => h.action === "PO_CREATED")?.timestamp },
      { key: "RECEIVED", label: "Received", icon: Package, date: (requestDetails.status as string) === "received" ? requestDetails.updatedAt : null },
    ];

    let activeIndex = -1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].date) {
        activeIndex = i;
        break;
      }
    }

    return (
      <div className="w-full px-4 py-4">
        <div className="relative flex justify-between items-start">
          {/* Background Line */}
          <div className="absolute top-[18px] left-[2rem] right-[2rem] h-[2px] bg-slate-100 -z-10" />

          {/* Active Line */}
          <div
            className="absolute top-[18px] left-[2rem] h-[2px] bg-orange-500 -z-10 transition-all duration-700 ease-out"
            style={{
              width: activeIndex === -1 ? '0%' : `calc((100% - 4rem) * ${activeIndex / (steps.length - 1)})`
            }}
          />

          {steps.map((step, index) => {
            const isCompleted = index <= activeIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-white",
                  isCompleted
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-100 text-slate-300"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className={cn(
                    "text-xs font-semibold transition-colors",
                    isCompleted ? "text-slate-800" : "text-slate-400"
                  )}>
                    {step.label}
                  </span>
                  {step.date && (
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {format(new Date(step.date), "dd/MM")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ActivityLog = () => {
    if (!requestDetails) return null;
    const logs = requestDetails.history;

    return (
      <div className="relative">
        {logs.map((log, index) => {
          const isLast = index === logs.length - 1;
          const actionUpper = log.action.toUpperCase();

          let dotColor = "bg-slate-300 border-slate-300";

          if (
            actionUpper.includes("APPROVED") ||
            actionUpper.includes("PASSED") ||
            actionUpper.includes("COMPLETED") ||
            actionUpper.includes("SUBMITTED") ||
            actionUpper.includes("CREATED")
          ) {
            dotColor = "bg-emerald-500 border-emerald-500";
          } else if (actionUpper.includes("REJECTED") || actionUpper.includes("FAILED")) {
            dotColor = "bg-red-500 border-red-500";
          }

          return (
            <div key={log.id} className="flex gap-4 relative pb-8 last:pb-0">
              <div className="flex flex-col items-center w-8 shrink-0 relative">
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full z-10 mt-1.5 ring-4 ring-white",
                  dotColor
                )} />
                {!isLast && (
                  <div className="absolute top-5 bottom-[-2rem] w-[2px] bg-slate-100 -z-0" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-slate-900">
                    {log.actor.name}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {format(new Date(log.timestamp), "d MMM yyyy, HH:mm")}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm text-slate-600 leading-relaxed shadow-sm">
                  {log.details || log.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!requestDetails) return <div className="text-center py-10 text-muted-foreground">Request not found.</div>;

  return (
    <>
      {/* 
        =======================================================================
        PRINT-ONLY VIEW
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
            <h2 className="text-2xl font-bold text-blue-700 uppercase tracking-wide mb-1">Purchase Request</h2>
            <div className="text-slate-500 text-xs mt-1">
              Document No: <strong className="text-black">#{requestDetails.id}</strong>
            </div>
            <div className="text-slate-500 text-xs">
              Date: <strong className="text-black">{format(new Date(requestDetails.createdAt), "dd MMM yyyy")}</strong>
            </div>
          </div>
        </div>

        <div className="mb-6 border border-slate-200 rounded p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Requester</span>
              <span className="font-bold text-slate-900">{requestDetails.user.name}</span>
              <span className="block text-slate-500">{requestDetails.user.email}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Due Date</span>
              <span className="font-bold text-slate-900">{requestDetails.dueDate ? format(new Date(requestDetails.dueDate), "dd MMM yyyy") : "-"}</span>
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
            {requestDetails.items.filter(item => selectedItems.has(item.id)).map((item, index) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 px-2 text-center text-slate-500">{index + 1}</td>
                <td className="py-2 px-2 text-center">
                  {item.imageUrl ? (
                    <div className="w-10 h-10 relative mx-auto border border-slate-100 bg-white p-0.5 rounded">
                      <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-2 px-2 align-middle">
                  <span className="font-bold block text-slate-900">{item.itemName}</span>
                  <span className="text-[10px] text-slate-500">{item.detail || item.inventoryDetails?.description || ''}</span>
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                <td className="py-2 px-2 text-right text-slate-700">฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">฿{(item.quantity * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200">
              <td colSpan={6} className="py-2"></td>
            </tr>
          </tbody>
        </table>

        <div className="fixed bottom-0 left-0 right-0 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 pb-4">
          System Generated by RPFlow
        </div>
      </div>

      <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans print:hidden">

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full w-8 h-8 border-slate-200 bg-white shadow-sm hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Request #{requestDetails.id}
              </h1>
              <StatusBadge status={requestDetails.status} />
            </div>
            <p className="text-sm text-slate-500">Created on {format(new Date(requestDetails.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>

        {/* 1. Request Progress */}
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="pb-2 border-b border-slate-50/50">
            <CardTitle className="text-base font-semibold text-slate-800">Request Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessTracker />
          </CardContent>
        </Card>

        {/* 2. Information Section */}
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="pb-4 border-b border-slate-50/50">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" /> Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Requester */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Requester</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{requestDetails.user.name}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[150px]">{requestDetails.user.email}</p>
                </div>
              </div>
              {/* Request Type */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Type</p>
                  <Badge variant="secondary" className="mt-1 font-medium bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
                    {requestDetails.type}
                  </Badge>
                </div>
              </div>
              {/* Budget Status */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Budget</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {(requestDetails.status as string) === 'approved' || (requestDetails.status as string) === 'ordered' ? 'Reserved' : 'Pending'}
                  </p>
                </div>
              </div>
              {/* Due Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Due Date</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {requestDetails.dueDate ? format(new Date(requestDetails.dueDate), "d MMM yyyy") : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Action Section (Inline) */}
        {pendingStep && canApprove && (
          <Card className="border-orange-200 bg-orange-50/30 shadow-sm mb-6 ring-1 ring-orange-100">
            <CardHeader className="pb-3 border-orange-100">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" /> Approval Required
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-start justify-between">
                <div className="space-y-4 flex-1">
                  <p className="text-sm text-slate-600">
                    Current Step: <strong className="text-slate-900">{pendingStep.stepName}</strong>
                  </p>
                  <Textarea
                    placeholder="Comment (optional)..."
                    className="bg-white border-slate-200 focus:border-orange-400 min-h-[80px] text-sm max-w-2xl"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex flex-row md:flex-col gap-3 md:w-48 shrink-0">
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm w-full"
                    onClick={() => handleApprovalAction("Approved")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Request"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full"
                    onClick={() => handleApprovalAction("Rejected")}
                    disabled={isSubmitting}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Items List */}
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" /> Items Requested
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-600 font-normal">
                  {requestDetails.items.length} Items
                </Badge>
                <Button variant="default" size="sm" onClick={() => window.print()} className="h-7 text-xs bg-orange-600 border-orange-600 text-white hover:bg-orange-700">
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Print PDF
                </Button>

              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[50px] pl-4">
                    <Checkbox
                      checked={selectedItems.size === requestDetails.items.length && requestDetails.items.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead className="pl-2 w-[100px] text-xs font-semibold uppercase text-slate-500">Image</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">Item Details</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-slate-500">Qty</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-slate-500">Unit Price</TableHead>
                  <TableHead className="text-right pr-6 text-xs font-semibold uppercase text-slate-500">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestDetails.items.map((item) => (
                  <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="pl-4 py-4 align-middle">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="pl-2 py-4 align-middle">
                      {item.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden relative shadow-sm">
                          <Image src={item.imageUrl} alt={item.itemName} fill className="object-contain p-1" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 align-middle">
                      <div className="font-semibold text-slate-900 text-sm">{item.itemName}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-md">
                        {item.detail || item.inventoryDetails?.description || "No additional details"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">ID: {item.id.slice(-6)}</div>
                    </TableCell>
                    <TableCell className="text-center py-4 align-middle font-medium text-slate-700">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right py-4 align-middle text-slate-600 text-sm">
                      ฿{Number(item.unitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right py-4 align-middle pr-6 font-bold text-slate-900 text-sm">
                      ฿{(item.quantity * Number(item.unitPrice)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 bg-slate-50/50 flex justify-end items-center gap-3 border-t border-slate-100 rounded-b-xl">
              <span className="text-sm text-slate-500">Total Amount:</span>
              <span className="text-xl font-bold text-orange-600">
                ฿{Number(requestDetails.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Activity History */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-6 border-b border-slate-50/50">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ActivityLog />
          </CardContent>
        </Card>

      </div>
    </>
  );
}