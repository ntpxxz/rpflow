// app/(app)/purchase-requests/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type PurchaseRequestWithDetails = PurchaseRequest & {
  user: User;
  items: (RequestItem & {
    inventory?: { itemName?: string; description?: string };
  })[];
  approvalSteps: (ApprovalStep & { approver: User })[];
  history: (RequestHistory & { actor: User })[];
};

function getHistoryMetadata(action: string) {
  switch (action.toUpperCase()) {
    case "CREATED & SUBMITTED":
      return {
        icon: FileText,
        color: "text-blue-600",
        bg: "bg-blue-500",
        label: "Request Submitted",
        variant: "default",
      };
    case "APPROVED":
    case "BUDGET_APPROVED":
      return {
        icon: Check,
        color: "text-emerald-600",
        bg: "bg-emerald-500",
        label: action === "APPROVED" ? "Approved" : "Budget Check Passed",
        variant: "success",
      };
    case "REJECTED":
    case "BUDGET_REJECTED":
      return {
        icon: X,
        color: "text-red-600",
        bg: "bg-red-500",
        label: action === "REJECTED" ? "Rejected" : "Budget Check Failed",
        variant: "destructive",
      };
    case "PO_CREATED":
      return {
        icon: ShoppingCart,
        color: "text-orange-600",
        bg: "bg-orange-500",
        label: "Purchase Order Created",
        variant: "default",
      };
    case "RECEIVED":
      return {
        icon: Package,
        color: "text-slate-600",
        bg: "bg-slate-500",
        label: "Received",
        variant: "secondary",
      };
    default:
      return {
        icon: Clock,
        color: "text-gray-600",
        bg: "bg-gray-500",
        label: action,
        variant: "outline",
      };
  }
}

export default function PurchaseRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const [requestDetails, setRequestDetails] =
    useState<PurchaseRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingStep = useMemo(() => {
    return requestDetails?.approvalSteps.find(
      (step) => step.status?.toLowerCase() === "pending"
    );
  }, [requestDetails]);

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
          throw new Error(
            errorData.message || `Failed to fetch request ${requestId}`
          );
        }
        return res.json();
      })
      .then((data: PurchaseRequestWithDetails) => {
        setRequestDetails(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setRequestDetails(null);
      })
      .finally(() => {
        setLoading(false);
        setIsSubmitting(false);
        setComment("");
      });
  };

  const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
    if (!pendingStep) return;

    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "clx....";

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/approval-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStepId: pendingStep.id,
          newStatus: newStatus,
          comment: comment,
          actorId: actorId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update status.");
      }
      fetchRequestDetails();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while updating status.");
      setIsSubmitting(false);
    }
  };

  const getStatusVariant = (
    status: string | null | undefined
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "pending":
        return "outline";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      case "ordered":
        return "default";
      case "received":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const renderHorizontalProcessTracker = () => {
    if (!requestDetails) return null;

    const history = requestDetails.history;

    const processSteps = [
      {
        name: "Submitted",
        date: history.find((h) => h.action === "CREATED & SUBMITTED")
          ?.timestamp,
        icon: FileText,
        colorClass: "bg-blue-500",
      },
      {
        name: "Approved",
        date: history.find(
          (h) => h.action === "APPROVED" || h.action === "BUDGET_APPROVED"
        )?.timestamp,
        icon: Check,
        colorClass: "bg-emerald-500",
      },
      {
        name: "Ordered",
        date: history.find((h) => h.action === "PO_CREATED")?.timestamp,
        icon: ShoppingCart,
        colorClass: "bg-orange-500",
      },
      {
        name: "Received",
        date:
          requestDetails.status.toLowerCase() === "received"
            ? requestDetails.updatedAt
            : null,
        icon: Package,
        colorClass: "bg-slate-500",
      },
    ];

    let currentStepIndex = -1;
    for (let i = processSteps.length - 1; i >= 0; i--) {
      if (processSteps[i].date) {
        currentStepIndex = i;
        break;
      }
    }

    return (
      <div className="flex justify-between items-center w-full relative pt-4 pb-2">
        <div className="absolute top-[35px] left-[5%] right-[5%] h-0.5 bg-slate-200 -translate-y-1/2 z-0">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-in-out",
              currentStepIndex >= 0 ? "bg-blue-500" : "bg-transparent"
            )}
            style={{
              width: `${(currentStepIndex / (processSteps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {processSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const Icon = step.icon;

          let circleClass = isCompleted
            ? step.colorClass
            : "bg-slate-200 text-slate-400";

          const textClass = isCompleted
            ? "text-foreground font-medium"
            : "text-muted-foreground";

          return (
            <div
              key={step.name}
              className="flex flex-col items-center flex-1 z-10 min-w-0"
            >
              <div
                className={cn(
                  "size-10 rounded-full flex items-center justify-center text-white transition-all duration-300 ring-4 ring-white shadow-sm",
                  circleClass
                )}
              >
                <Icon className="size-5" />
              </div>

              <div className="mt-2.5 text-center">
                <p className={cn("text-xs whitespace-nowrap", textClass)}>
                  {step.name}
                </p>
                {step.date && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(step.date), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailedHistory = () => {
    if (!requestDetails || requestDetails.history.length === 0) return null;

    return (
      <div className="w-full p-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-slate-200">
              <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Timestamp
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Action
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Actor
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestDetails.history
              .map((hist) => {
                const { label, variant } = getHistoryMetadata(hist.action);
                let badgeClass = "bg-slate-100 text-slate-700";
                if (variant === "default")
                  badgeClass = "bg-orange-50 text-orange-700";
                if (variant === "success")
                  badgeClass = "bg-emerald-50 text-emerald-700";
                if (variant === "destructive")
                  badgeClass = "bg-red-50 text-red-700";

                return (
                  <TableRow
                    key={hist.id}
                    className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                  >
                    <TableCell className="py-4 text-sm text-foreground font-normal">
                      {format(new Date(hist.timestamp), "MMM dd, yyyy, hh:mm a")}
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge
                        className={cn(
                          "rounded-md font-medium text-xs capitalize px-2.5 py-1 border-0",
                          badgeClass
                        )}
                      >
                        {label}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 text-sm font-normal text-foreground">
                      {hist.actor.name}
                    </TableCell>

                    <TableCell className="py-4 text-sm font-normal text-slate-600">
                      {hist.details || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
              .reverse()}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading && !requestDetails)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (!requestDetails && !loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Request not found.</p>
      </div>
    );

  return (
    <div className="space-y-5 pb-3">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Purchase Request
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Request ID: {requestDetails?.id}
            </p>
          </div>
        </div>
        {requestDetails?.status && (
          <Badge
            variant={getStatusVariant(requestDetails.status)}
            className="rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {requestDetails.status}
          </Badge>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Overview Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Request Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Requester</p>
            <p className="font-medium text-foreground">
              {requestDetails?.user?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {requestDetails?.requesterName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Request Type</p>
            <p className="font-medium text-foreground">{requestDetails?.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
            <p className="font-medium text-foreground">
              ฿
              {requestDetails?.totalAmount
                ? Number(requestDetails.totalAmount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <p className="font-medium text-foreground">
              {requestDetails?.createdAt
                ? format(new Date(requestDetails.createdAt), "dd MMM yyyy, HH:mm")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
            <p className="font-medium text-foreground">
              {requestDetails?.updatedAt
                ? format(new Date(requestDetails.updatedAt), "dd MMM yyyy, HH:mm")
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Items Requested
          </CardTitle>
        </CardHeader>
        <CardContent className="pd-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Item Name
                </TableHead>
                <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Quantity
                </TableHead>
                <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Unit Price
                </TableHead>
                <TableHead className="h-12 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requestDetails || requestDetails.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items
                  </TableCell>
                </TableRow>
              ) : (
                requestDetails.items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                  >
                    <TableCell className="py-4 font-medium text-foreground">
                      {item.itemName || "-"}
                    </TableCell>
                    <TableCell className="py-4 text-foreground font-normal">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="py-4 text-foreground font-normal">
                      ฿{Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-4 text-foreground text-right font-medium">
                      ฿{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Action Card */}
      {pendingStep && requestDetails?.status === "Approving" && (
        <Card className="border-orange-200 bg-orange-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-orange-900">
              Action Required: {pendingStep.stepName}
            </CardTitle>
            <CardDescription className="text-orange-700">
              Approve or Reject this request step. Assigned to:{" "}
              {pendingStep.approver.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Add an optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting || loading}
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500 bg-white"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleApprovalAction("Rejected")}
                  disabled={isSubmitting || loading}
                  className="rounded-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprovalAction("Approved")}
                  disabled={isSubmitting || loading}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Flow Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Request Process Flow
          </CardTitle>
          <CardDescription>
            Track the request through key milestones
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {renderHorizontalProcessTracker()}
        </CardContent>
      </Card>

      {/* Activity Log Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
          <CardDescription>
            Detailed history of all actions taken on this request
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">{renderDetailedHistory()}</CardContent>
      </Card>
    </div>
  );
}