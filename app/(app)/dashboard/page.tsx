// app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PurchaseRequest,
  User,
  RequestItem,
  ApprovalStep,
} from "@prisma/client";
import { format } from "date-fns";
// 1. 👈 Import ไอคอนเพิ่ม: Package, Clock, CheckCircle
import {
  ArrowUp,
  ArrowDown,
  Loader2,
  Package, // 👈 สำหรับ Total
  Clock,     // 👈 สำหรับ Pending
  CheckCircle, // 👈 สำหรับ Approved
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// ... (Imports อื่นๆ เหมือนเดิม) ...
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
import { Textarea } from "@/components/ui/textarea";


type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
  approvalSteps: ApprovalStep[];
};

type SortKey = "id" | "user" | "totalAmount" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export default function Dashboard() {
  // ... (State และ useEffect ทั้งหมดเหมือนเดิม) ...
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "createdAt",
    direction: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [comment, setComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<{
    stepId: string;
    action: "Approved" | "Rejected";
  } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  // ... (Functions ทั้งหมด: fetchRequests, handleOpenModal, handleConfirmAction, getStatusVariant, requestSort, handleRowClick เหมือนเดิม) ...
  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/purchase-requests")
      .then((res) => res.json())
      .then((data: RequestWithDetails[]) => {
        setRequests(data);
      })
      .catch((err) => console.error("Error fetching requests:", err))
      .finally(() => {
        setLoading(false);
        setActionLoading(null);
      });
  };

  const handleOpenModal = (
    e: React.MouseEvent,
    stepId: string,
    action: "Approved" | "Rejected"
  ) => {
    e.stopPropagation(); 
    setCurrentAction({ stepId, action });
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!currentAction) return;

    if (currentAction.action === "Rejected" && !comment.trim()) {
      alert("Please provide a comment for rejection.");
      return;
    }

    const actorId =
      process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001"; 

    setActionLoading(currentAction.stepId);
    setIsModalOpen(false);

    try {
      const res = await fetch("/api/approval-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStepId: currentAction.stepId,
          newStatus: currentAction.action,
          comment: comment,
          actorId: actorId,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      fetchRequests(); 
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status.");
      setActionLoading(null);
    }
  };

  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
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
  
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleRowClick = (requestId: string) => {
    router.push(`/purchase-requests/${requestId}`);
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status.toLowerCase() === "pending")
      .length,
    approved: requests.filter((r) => r.status.toLowerCase() === "approved")
      .length,
  };

  // ... (sortedRequests และ paginatedRequests useMemo เหมือนเดิม) ...
  const sortedRequests = useMemo(() => {
    const sortableRequests = [...requests];
    sortableRequests.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "user") {
        aValue = a.user.name.toLowerCase();
        bValue = b.user.name.toLowerCase();
      } else if (sortConfig.key === "totalAmount") {
        aValue = Number(a.totalAmount) || 0;
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortableRequests;
  }, [requests, sortConfig]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedRequests.slice(startIndex, endIndex);
  }, [sortedRequests, currentPage]);

  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* --- (แก้ไข) Stats Cards (เพิ่มไอคอน) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <Card>
            {/* 2. 👈 ใช้ flex เพื่อจัดวางไอคอน */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Requests
                </CardTitle>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              {/* 3. 👈 ไอคอน */}
              <Package className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </CardTitle>
                <p className="text-3xl font-bold mt-2">{stats.pending}</p>
              </div>
              <Clock className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
                <p className="text-3xl font-bold mt-2">{stats.approved}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </div>

        {/* --- ตาราง (ลบ CardHeader และเพิ่ม hover) --- */}
        <Card>
          {/* 4. 👈 ลบ CardHeader ส่วนนี้ออกเพื่อให้ดูคลีนขึ้น */}
          {/*
          <CardHeader>
            <CardTitle>All Purchase Requests</CardTitle>
          </CardHeader>
          */}

          <CardContent>
            {loading ? (
              // 5. 👈 (ปรับปรุง) ทำให้ Loading ดูดีขึ้น
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  {/* ... (TableHeader เหมือนเดิม) ... */}
                  <TableHeader>
                    <TableRow>
                    <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort("id")}
                          className="px-0 hover:bg-transparent"
                        >
                          Request No.
                          {sortConfig.key === "id" &&
                            (sortConfig.direction === "asc" ? (
                              <ArrowUp className="inline h-4 w-4 ml-1" />
                            ) : (
                              <ArrowDown className="inline h-4 w-4 ml-1" />
                            ))}
                        </Button>
                      </TableHead>

                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort("user")}
                          className="px-0 hover:bg-transparent"
                        >
                          Requestor
                          {sortConfig.key === "user" &&
                            (sortConfig.direction === "asc" ? (
                              <ArrowUp className="inline h-4 w-4 ml-1" />
                            ) : (
                              <ArrowDown className="inline h-4 w-4 ml-1" />
                            ))}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort("createdAt")}
                          className="px-0 hover:bg-transparent"
                        >
                          Date Created
                          {sortConfig.key === "createdAt" &&
                            (sortConfig.direction === "asc" ? (
                              <ArrowUp className="inline h-4 w-4 ml-1" />
                            ) : (
                              <ArrowDown className="inline h-4 w-4 ml-1" />
                            ))}
                        </Button>
                      </TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort("totalAmount")}
                          className="px-0 hover:bg-transparent"
                        >
                          Total
                          {sortConfig.key === "totalAmount" &&
                            (sortConfig.direction === "asc" ? (
                              <ArrowUp className="inline h-4 w-4 ml-1" />
                            ) : (
                              <ArrowDown className="inline h-4 w-4 ml-1" />
                            ))}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort("status")}
                          className="px-0 hover:bg-transparent"
                        >
                          Status
                          {sortConfig.key === "status" &&
                            (sortConfig.direction === "asc" ? (
                              <ArrowUp className="inline h-4 w-4 ml-1" />
                            ) : (
                              <ArrowDown className="inline h-4 w-4 ml-1" />
                            ))}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {paginatedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground h-24"
                        >
                          No requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRequests.map((req) => {
                        const pendingStep = req.approvalSteps.find(
                          (s) => s.status.toLowerCase() === "pending"
                        );
                        const isLoading =
                          pendingStep && actionLoading === pendingStep.id;

                        return (
                          <TableRow
                            key={req.id}
                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"                            
                            onClick={(e) => handleRowClick(req.id)}
                          >
                            <TableCell>{req.id}</TableCell>
                            <TableCell>{req.user.name}</TableCell>
                            <TableCell>
                              {format(new Date(req.createdAt), "yyyy-MM-dd")}
                            </TableCell>
                            <TableCell>{req.items.length}</TableCell>
                            <TableCell>
                              ฿{Number(req.totalAmount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(req.status)}>
                                {req.status}
                              </Badge>
                            </TableCell>

                            {/* ... (Cell Action เหมือนเดิม) ... */}
                            <TableCell className="text-right space-x-1">
                              {isLoading ? (
                                <Button variant="ghost" size="icon" disabled>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </Button>
                              ) : 
                              req.status.toLocaleLowerCase() === "pending" &&
                                pendingStep ? (
                                <>
                                 
                                  <Button
                                    variant="destructive"
                                    onClick={(e) =>
                                      handleOpenModal(
                                        e,
                                        pendingStep.id,
                                        "Rejected"
                                      )
                                    }
                                     
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={(e) =>
                                      handleOpenModal(
                                        e,
                                        pendingStep.id,
                                        "Approved"
                                      )
                                    }
                                     
                                  >
                                    Approve
                                  </Button>
                                </>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* ... (Pagination Controls เหมือนเดิม) ... */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} (Total {requests.length}{" "}
                    requests)
                  </span>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ... (Dialog (Modal) คงเดิม) ... */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action: {currentAction?.action}</DialogTitle>
            <DialogDescription>
              {currentAction?.action === "Rejected"
                ? "Please provide a reason for rejection (Required)."
                : "You are about to approve this request. (Comment optional)"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comment-dash" className="text-right">
                Comment
              </Label>
              <Textarea
                id="comment-dash"
                value={comment}
                onChange={(e) => setComment(e.targe.value)}
                className="col-span-3"
                placeholder={
                  currentAction?.action === "Rejected"
                    ? "Reason for rejection..."
                    : "Optional comment..."
                }
                disabled={actionLoading !== null}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmAction}
              disabled={
                actionLoading !== null ||
                (currentAction?.action === "Rejected" && !comment.trim())
              }
              variant={
                currentAction?.action === "Rejected" ? "destructive" : "default"
              }
            >
              {actionLoading !== null && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm {currentAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}