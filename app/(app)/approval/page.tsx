// app/(app)/approval/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalStep,
  PurchaseRequest,
  User,
  RequestItem,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  AlertCircle,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

type PendingApproval = ApprovalStep & {
  request: PurchaseRequest & {
    user: User;
    items: RequestItem[];
  };
  approver: User;
};

const ITEMS_PER_PAGE = 10;

export default function Approval() {
  const [allSteps, setAllSteps] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State for Tabs
  const [activeTab, setActiveTab] = useState("waiting"); // 🟢 เพิ่ม State เพื่อเช็คว่าอยู่ Tab ไหนตอน Export

  // State for Modal & Actions
  const [comment, setComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<{
    stepId: string;
    action: "Approved" | "Rejected";
  } | null>(null);

  // State for Pagination & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/approval-steps")
      .then((res) => res.json())
      .then((data) => {
        setAllSteps(data);
      })
      .catch((err) => console.error("Error fetching steps:", err))
      .finally(() => {
        setLoading(false);
        setActionLoading(null);
      });
  };

  // --- Logic ---

  const pendingSteps = useMemo(
    () => allSteps.filter((step) => step.status.toLowerCase() === "pending"),
    [allSteps]
  );

  const doneSteps = useMemo(
    () => allSteps.filter((step) => step.status.toLowerCase() !== "pending"),
    [allSteps]
  );

  // Filter Logic (Search)
  const filterData = (data: PendingApproval[]) => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(
      (step) =>
        step.request.user.name.toLowerCase().includes(lowerQuery) ||
        step.request.id.toString().includes(lowerQuery) ||
        step.requestId.toLowerCase().includes(lowerQuery)
    );
  };

  const filteredPending = useMemo(
    () => filterData(pendingSteps),
    [pendingSteps, searchQuery]
  );
  const filteredDone = useMemo(
    () => filterData(doneSteps),
    [doneSteps, searchQuery]
  );

  // Pagination Logic
  const paginatedPendingSteps = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPending.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPending, currentPage]);

  const paginatedDoneSteps = useMemo(() => {
    const startIndex = (currentHistoryPage - 1) * ITEMS_PER_PAGE;
    return filteredDone.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDone, currentHistoryPage]);

  const totalPages = Math.ceil(filteredPending.length / ITEMS_PER_PAGE);
  const totalHistoryPages = Math.ceil(filteredDone.length / ITEMS_PER_PAGE);

  // --- Handlers ---

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

    const actorId =
      process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";
    setActionLoading(currentAction.stepId);

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

      setIsModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status.");
      setActionLoading(null);
    }
  };

  // 🟢 Updated: Real Export Function (CSV)
  const handleExport = () => {
    setIsExporting(true);

    // 1. Determine which data to export based on active tab
    const dataToExport =
      activeTab === "waiting" ? filteredPending : filteredDone;
    const fileName =
      activeTab === "waiting"
        ? "pending_approvals.csv"
        : "approval_history.csv";

    try {
      // 2. Define CSV Headers
      const headers = [
        "Request ID",
        "Requestor",
        "Total Amount",
        "Items Count",
        "Date",
        "Status",
        "Comment",
      ];

      // 3. Map Data to CSV Rows
      const rows = dataToExport.map((step) => [
        step.request.id,
        `"${step.request.user.name}"`, // Quote to handle special chars
        step.request.totalAmount,
        step.request.items.length,
        format(new Date(step.request.createdAt), "yyyy-MM-dd HH:mm"),
        step.status,
        `"${step.comment || ""}"`,
      ]);

      // 4. Combine Header and Rows
      const csvContent = [
        headers.join(","),
        ...rows.map((e) => e.join(",")),
      ].join("\n");

      // 5. Create Blob and Download Link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);

      // 6. Trigger Download
      link.click();

      // 7. Cleanup
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = (requestId: string) => {
    router.push(`/purchase-requests/${requestId}`);
  };

  const isRejection = currentAction?.action === "Rejected";

  // --- Sub-components ---

  const StatsCard = ({
    title,
    value,
    trend,
    trendLabel,
    trendColorClass,
    icon: Icon,
    iconBgClass,
  }: any) => (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6 flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-foreground mb-2">{value}</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-1",
                trendColorClass
              )}
            >
              {trend}
            </span>
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          </div>
        </div>
        <div
          className={cn(
            "p-3 rounded-xl flex items-center justify-center",
            iconBgClass
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              trendColorClass.split(" ")[1] || "text-primary"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderTableHeader = (showActions = true) => (
    <TableHeader className="bg-slate-50/50">
      <TableRow className="border-b border-slate-200 hover:bg-slate-50/50">
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider pl-6 w-[180px]">
          Request ID
        </TableHead>
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Requestor
        </TableHead>
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Total Amount
        </TableHead>
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Items
        </TableHead>
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Date
        </TableHead>
        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-6">
          {showActions ? "Actions" : "Status"}
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-10 bg-transparent">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Approval Requests
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Manage your approval workflow efficiently.
            </p>
          </div>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg h-10 px-6 shadow-sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export List
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Pending Requests"
            value={pendingSteps.length}
            trend="↘ -4"
            trendLabel="in this month"
            trendColorClass="text-red-600"
            icon={Clock}
            iconBgClass="bg-blue-50 text-blue-600"
          />
          <StatsCard
            title="Approved Total"
            value={
              doneSteps.filter((s) => s.status.toLowerCase() === "approved")
                .length
            }
            trend="↗ +16"
            trendLabel="in this month"
            trendColorClass="text-emerald-600"
            icon={CheckCircle2}
            iconBgClass="bg-emerald-50 text-emerald-600"
          />
          <StatsCard
            title="Rejected Total"
            value={
              doneSteps.filter((s) => s.status.toLowerCase() === "rejected")
                .length
            }
            trend="↗ +2"
            trendLabel="in this month"
            trendColorClass="text-emerald-600"
            icon={XCircle}
            iconBgClass="bg-red-50 text-red-600"
          />
        </div>

        {/* Main Content Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* 🟢 Update: Controlled Tabs to track activeTab */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Top Control Bar */}
            <div className="border-b border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="justify-start p-0 bg-transparent h-auto space-x-6">
                <TabsTrigger
                  value="waiting"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none bg-transparent px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-all focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none data-[state=active]:bg-transparent"
                >
                  In Queue ({pendingSteps.length})
                </TabsTrigger>

                <TabsTrigger
                  value="done"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none bg-transparent px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-all focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none data-[state=active]:bg-transparent"
                >
                  History / Archive ({doneSteps.length})
                </TabsTrigger>
              </TabsList>
              {/* Search Input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by request ID or requestor..."
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-orange-500 focus-visible:ring-1 focus-visible:ring-offset-0"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setCurrentHistoryPage(1);
                  }}
                />
              </div>
            </div>

            {/* Tab: Waiting */}
            <TabsContent value="waiting" className="m-0">
              <Table>
                {renderTableHeader(true)}
                <TableBody>
                  {paginatedPendingSteps.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center h-32 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No matching requests found."
                          : "No pending approvals in queue."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPendingSteps.map((step) => (
                      <TableRow
                        key={step.id}
                        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors group"
                        onClick={() => handleRowClick(step.requestId)}
                      >
                        <TableCell className="py-4 pl-6 font-medium text-slate-700">
                          #{step.request.id}
                        </TableCell>
                        <TableCell className="py-4 text-slate-600 font-medium">
                          {step.request.user.name}
                        </TableCell>
                        <TableCell className="py-4 text-slate-900 font-semibold">
                          ฿
                          {Number(step.request.totalAmount).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 }
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <Package className="w-4 h-4" />
                            {step.request.items.length} items
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            {format(
                              new Date(step.request.createdAt),
                              "d MMM, yyyy"
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) =>
                                handleOpenModal(e, step.id, "Rejected")
                              }
                              className="h-8 px-3 text-xs font-medium border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-md"
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) =>
                                handleOpenModal(e, step.id, "Approved")
                              }
                              className="h-8 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
                            >
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredPending.length
                    )}{" "}
                    of {filteredPending.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: History */}
            <TabsContent value="done" className="m-0">
              <Table>
                {renderTableHeader(false)}
                <TableBody>
                  {paginatedDoneSteps.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center h-32 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No matching history found."
                          : "No approval history."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDoneSteps.map((step) => (
                      <TableRow
                        key={step.id}
                        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors"
                        onClick={() => handleRowClick(step.requestId)}
                      >
                        <TableCell className="py-4 pl-6 font-medium text-slate-700">
                          #{step.request.id}
                        </TableCell>
                        <TableCell className="py-4 text-slate-600 font-medium">
                          {step.request.user.name}
                        </TableCell>
                        <TableCell className="py-4 text-slate-900 font-semibold">
                          ฿
                          {Number(step.request.totalAmount).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 }
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <Package className="w-4 h-4" />
                            {step.request.items.length} items
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            {step.approvedAt
                              ? format(new Date(step.approvedAt), "d MMM, yyyy")
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex justify-end">
                            <StatusBadge status={step.status} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentHistoryPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                    {Math.min(
                      currentHistoryPage * ITEMS_PER_PAGE,
                      filteredDone.length
                    )}{" "}
                    of {filteredDone.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200"
                      onClick={() =>
                        setCurrentHistoryPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentHistoryPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200"
                      onClick={() =>
                        setCurrentHistoryPage((prev) =>
                          Math.min(prev + 1, totalHistoryPages)
                        )
                      }
                      disabled={currentHistoryPage === totalHistoryPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {isRejection ? (
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <div>
                <DialogTitle>
                  {isRejection ? "Decline Request" : "Approve Request"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {isRejection
                    ? "Please provide a reason for declining this request."
                    : "You are about to approve this request."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment-approval">
                Comment {isRejection && <span className="text-red-600">*</span>}
              </Label>
              <Textarea
                id="comment-approval"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isRejection
                    ? "Please explain why this request is being declined..."
                    : "Add an optional comment..."
                }
                disabled={actionLoading !== null}
                rows={4}
                className="resize-none focus-visible:ring-primary"
              />
              {isRejection && (
                <p className="text-xs text-muted-foreground">
                  A comment is required when declining a request.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading !== null}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmAction}
              disabled={
                actionLoading !== null || (isRejection && !comment.trim())
              }
              variant={isRejection ? "destructive" : "default"}
              className={`rounded-lg ${!isRejection ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              {actionLoading !== null && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isRejection ? "Decline Request" : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
