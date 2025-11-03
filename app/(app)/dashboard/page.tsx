// app/(app)/dashboard/page.tsx
"use client";

// 1. 👈 Import เพิ่ม: useRouter, ApprovalStep, Icons, Dialog
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PurchaseRequest,
  User,
  RequestItem,
  ApprovalStep,
} from "@prisma/client"; // 👈 เพิ่ม ApprovalStep
import { format } from "date-fns";
import { ArrowUp, ArrowDown, Check, X, Loader2 } from "lucide-react"; // 👈 เพิ่ม Icons
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

// 2. 👈 Import Dialog components
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
import { toLowerCase } from "zod";

// 3. 👈 อัปเดต Type ให้มี approvalSteps
type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
  approvalSteps: ApprovalStep[]; // 👈 เพิ่ม
};

// 4. 👈 กำหนด Type สำหรับ Sorting
type SortKey = "id" | "user" | "totalAmount" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State สำหรับ Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "createdAt",
    direction: "desc",
  });

  // State สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 5. 👈 State สำหรับ Modal
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

  const fetchRequests = () => {
    setLoading(true);
    // 6. 👈 API นี้ต้อง include approvalSteps (เราแก้ไข API route.ts แล้ว)
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

  // 8. 👈 ฟังก์ชันสำหรับ "Approve/Reject" (สำหรับ Approver)
  const handleOpenModal = (
    e: React.MouseEvent,
    stepId: string,
    action: "Approved" | "Rejected"
  ) => {
    e.stopPropagation(); // 👈 หยุด Row Click
    setCurrentAction({ stepId, action });
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!currentAction) return;

    // 9. 👈 ตรวจสอบ Comment ถ้า Reject
    if (currentAction.action === "Rejected" && !comment.trim()) {
      alert("Please provide a comment for rejection.");
      return;
    }

    // TODO: 🔴 HARDCODE: ใช้ Test Approver ID
    const actorId =
      process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001"; // 👈 (แก้ไข ID)

    setActionLoading(currentAction.stepId);
    setIsModalOpen(false);

    try {
      const res = await fetch("/api/approval-steps", {
        // 👈 เรียก API approval-steps
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

      fetchRequests(); // 👈 รีเฟรช
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status.");
      setActionLoading(null);
    }
  };

  // 10. 👈 อัปเดต getStatusVariant (ตาม Flow ใหม่)
  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary"; // 👈 (รออนุมัติ)
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

  // 11. 👈 ฟังก์ชันสำหรับกด Sort
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // 12. 👈 ฟังก์ชันสำหรับคลิกที่แถว
  const handleRowClick = (requestId: string) => {
    router.push(`/purchase-requests/${requestId}`);
  };

  // 13. 👈 อัปเดต Stats (ไม่เอา Approving)
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status.toLowerCase() === "pending")
      .length, // 👈 เพิ่ม .toLowerCase()
    approved: requests.filter((r) => r.status.toLowerCase() === "approved")
      .length, // 👈 เพิ่ม .toLowerCase()
  };

  // 14. 👈 Logic สำหรับ Sort (ใช้ useMemo)
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

  // 15. 👈 Logic สำหรับ Paginate (ใช้ useMemo)
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedRequests.slice(startIndex, endIndex);
  }, [sortedRequests, currentPage]);

  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);

  return (
    <>
      {" "}
      {/* 👈 ครอบด้วย Fragment */}
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* --- Stats (อัปเดต) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.approved}</p>
            </CardContent>
          </Card>
        </div>

        {/* --- 16. 👈 ตารางติดตามสถานะ (อัปเดต) --- */}
        <Card>
          <CardHeader>
            <CardTitle>All Purchase Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading requests...</p>
            ) : (
              <>
                <Table>
                  {/* ... (TableHeader ที่มี Sort เหมือนเดิม) ... */}
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

                  {/* 17. 👈 อัปเดต TableBody */}
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
                        // 18. 👈 หา Pending Step
                        // (TODO: ถ้าเปิด Auth ควรเช็คว่า user ที่ login คือ approverId)
                        const pendingStep = req.approvalSteps.find(
                          (s) => s.status.toLowerCase() === "pending"
                        );
                        const isLoading =
                          pendingStep && actionLoading === pendingStep.id; // 👈 (แก้ Loading Key)

                        return (
                          <TableRow key={req.id}
                          className="cursor-pointer"
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

                            {/* 19. 👈 อัปเดต Cell Action (ลบปุ่ม Submit) */}
                            <TableCell className="text-right space-x-1">
                              {isLoading ? (
                                <Button variant="ghost" size="icon" disabled>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </Button>
                              ) : // 20. 👈 (สำคัญ) เปลี่ยนเงื่อนไขเป็น req.status === "Pending"
                              req.status.toLocaleLowerCase() === "pending" &&
                                pendingStep ? (
                                <>
                                 
                                  {/* ปุ่ม Reject (เปิด Modal) */}
                                  <Button
                                    variant="destructive"
                                    onClick={(e) =>
                                      handleOpenModal(
                                        e,
                                        pendingStep.id,
                                        "Rejected"
                                      )
                                    }
                                     className="cursor-pointer"
                                  >
                                    Reject
                                  </Button>
                                  {/* ปุ่ม Approve (เปิด Modal) */}
                                  <Button
                                    onClick={(e) =>
                                      handleOpenModal(
                                        e,
                                        pendingStep.id,
                                        "Approved"
                                      )
                                    }
                                     className="cursor-pointer"
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

                {/* ... (Pagination Controls) ... */}
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
      {/* --- 21. 👈 Dialog (Modal) สำหรับยืนยัน --- */}
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
                onChange={(e) => setComment(e.target.value)}
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
