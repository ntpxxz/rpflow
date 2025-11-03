// app/(app)/purchase-requests/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react"; // 👈 Add useMemo if not already there
import { useParams, useRouter } from "next/navigation"; // 👈 Add useRouter
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
  CardFooter,
} from "@/components/ui/card"; // 👈 Add CardFooter
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // 👈 Add Button
import { Textarea } from "@/components/ui/textarea"; // 👈 Add Textarea
import { format } from "date-fns";
import { Loader2 } from "lucide-react"; // 👈 For loading state

// ... (Type PurchaseRequestWithDetails remains the same) ...
type PurchaseRequestWithDetails = PurchaseRequest & {
  user: User;
  items: (RequestItem & {
    inventory?: { itemName?: string; description?: string };
  })[];
  approvalSteps: (ApprovalStep & { approver: User })[];
  history: (RequestHistory & { actor: User })[];
};

export default function PurchaseRequestDetailPage() {
  const params = useParams();
  const router = useRouter(); // 👈 Initialize router
  const requestId = params.id as string;
  const [requestDetails, setRequestDetails] =
    useState<PurchaseRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState(""); // 👈 State for approval comment
  const [isSubmitting, setIsSubmitting] = useState(false); // 👈 State for button loading

  // --- Find the first pending approval step ---
  const pendingStep = useMemo(() => {
    // TODO: When Auth is enabled, filter by approverId === loggedInUserId as well
    return requestDetails?.approvalSteps.find(
      (step) => step.status === "Pending"
    );
  }, [requestDetails]);
  // ---

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails(); // 👈 Call fetch function
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // --- Function to fetch details ---
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
        setIsSubmitting(false); // Reset submit state after refetch
        setComment(""); // Clear comment after refetch
      });
  };
  // ---

  // --- Approval Action Handler ---
  const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
    if (!pendingStep) return;

    // TODO: Replace with actual logged-in user ID when Auth is enabled
    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "clx...."; // Read from env or use fallback

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
          actorId: actorId, // The user performing the action
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update status.");
      }

      // Refresh data to show updated status
      fetchRequestDetails();
      // Optionally show a success message (e.g., using a toast library)
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while updating status.");
      setIsSubmitting(false); // Only stop loading on error, success will stop on refetch
    }
  };
  // ---

  // ... (getStatusVariant, getApprovalStatusVariant functions remain the same) ...
  const getStatusVariant = (
    status: string | null | undefined
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "pending":
        return "outline";
      case "approved":
        return "default"; // หรือสีเขียว
      case "rejected":
        return "destructive";
      case "ordered":
        return "default"; // อาจจะใช้สีอื่น
      case "received":
        return "default"; // อาจจะใช้สีเขียวเข้ม
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };
  const getApprovalStatusVariant = (
    status: string | null | undefined
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
      case "approved":
        return "default"; // หรือสีเขียว
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading && !requestDetails) return <div>Loading request details...</div>; // Show loading only initially
  // Keep showing potentially stale data while refetching after action
  // if (error) return <div className="text-red-600">Error: {error}</div>; // Display error below instead
  if (!requestDetails && !loading) return <div>Request not found.</div>;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => router.back()}
        disabled={isSubmitting}
      >
        &larr; Back to Dashboard
      </Button>

      <h1 className="text-2xl font-bold">Purchase Request Details</h1>

      {/* Display Error if any */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Card: Header Info */}
      <Card>
        {/* ... CardHeader and CardContent remain the same ... */}
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Request ID: {requestDetails?.id}</span>
            {requestDetails?.status && (
              <Badge variant={getStatusVariant(requestDetails.status)}>
                {requestDetails.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Requester:</strong> {requestDetails?.user?.name} (
            {requestDetails?.requesterName})
          </div>
          <div>
            <strong>Request Type:</strong> {requestDetails?.type}
          </div>
          <div>
            <strong>Created At:</strong>{" "}
            {requestDetails?.createdAt
              ? format(new Date(requestDetails.createdAt), "Pp")
              : "-"}
          </div>
          <div>
            <strong>Last Updated:</strong>{" "}
            {requestDetails?.updatedAt
              ? format(new Date(requestDetails.updatedAt), "Pp")
              : "-"}
          </div>
          <div>
            <strong>Total Amount:</strong> ฿
            {requestDetails?.totalAmount
              ? Number(requestDetails.totalAmount).toFixed(2)
              : "N/A"}
          </div>
        </CardContent>
      </Card>

      {/* Card: Items */}
      <Card>
        {/* ... CardHeader and CardContent remain the same ... */}
        <CardHeader>
          <CardTitle>Items Requested</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                {/*<TableHead>Detail</TableHead>
                <TableHead>Image</TableHead>*/}
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requestDetails || requestDetails.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No items
                  </TableCell>
                </TableRow>
              ) : (
                requestDetails.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.itemName || "-"}
                    </TableCell>
                    {/*<TableCell className="text-sm text-muted-foreground">
                      {item.detail || "-"}
                    </TableCell>
                    <TableCell>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.itemName}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>*/}
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>฿{Number(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      ฿{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>{" "}
          </Table>
        </CardContent>
      </Card>

      {/* Card: Approval Steps */}
      <Card>
        {/* ... CardHeader and CardContent remain the same ... */}
        <CardHeader>
          <CardTitle>Approval Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step Name</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requestDetails || requestDetails.approvalSteps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No approval steps defined or submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                requestDetails.approvalSteps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell>{step.stepName}</TableCell>
                    <TableCell>{step.approver.name}</TableCell>
                    <TableCell>
                      <Badge variant={getApprovalStatusVariant(step.status)}>
                        {step.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {step.approvedAt
                        ? format(new Date(step.approvedAt), "P p")
                        : "-"}
                    </TableCell>
                    <TableCell>{step.comment || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Card: Approval Actions (Show only if there's a pending step) --- */}
      {pendingStep && requestDetails?.status === "Approving" && (
        <Card>
          <CardHeader>
            <CardTitle>Action Required: {pendingStep.stepName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Approve or Reject this request step. Assigned to:{" "}
              {pendingStep.approver.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Add an optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting || loading}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => handleApprovalAction("Rejected")}
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprovalAction("Approved")}
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* --- (สิ้นสุด Card: Approval Actions) --- */}

      {/* Card: History */}
      <Card>
        {/* ... CardHeader and CardContent remain the same ... */}
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requestDetails || requestDetails.history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No history yet.
                  </TableCell>
                </TableRow>
              ) : (
                requestDetails.history.map((hist) => (
                  <TableRow key={hist.id}>
                    <TableCell>
                      {format(new Date(hist.timestamp), "Pp")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{hist.action}</Badge>
                    </TableCell>
                    <TableCell>{hist.actor.name}</TableCell>
                    <TableCell>{hist.details || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
