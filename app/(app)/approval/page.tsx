// app/(app)/approval/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ApprovalStep, PurchaseRequest, User, RequestItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea"; 
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Check, X, FileClock, History, Ban, ChevronLeft, ChevronRight } from "lucide-react"; 

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils"; // 👈 เพิ่ม cn

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

  const [comment, setComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<{ stepId: string; action: "Approved" | "Rejected"; } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

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

  const pendingSteps = useMemo(() => 
    allSteps.filter(step => step.status.toLowerCase() === 'pending')
  , [allSteps]);

  const doneSteps = useMemo(() => 
    allSteps.filter(step => step.status.toLowerCase() !== 'pending')
  , [allSteps]);

  const paginatedPendingSteps = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return pendingSteps.slice(startIndex, endIndex);
  }, [pendingSteps, currentPage]);

  const totalPages = Math.ceil(pendingSteps.length / ITEMS_PER_PAGE);

  const handleOpenModal = (
    stepId: string,
    action: "Approved" | "Rejected"
  ) => {
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

    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";
    
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

  // 🟢 ปรับปรุง Status Variant ให้ใช้สี Theme (Primary, Destructive, Secondary)
  const getApprovalStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "pending": return "secondary"; // สีเทา/เหลืองอ่อน
      case "approved": return "default"; // สี Primary (ส้ม)
      case "rejected": return "destructive"; // สีแดง
      default: return "outline";
    }
  };
  
  const handleRowClick = (requestId: string) => {
    router.push(`/purchase-requests/${requestId}`);
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Approval Requests</h1>
      
        <Tabs defaultValue="waiting" className="w-full">
          {/* 🟢 TabsList: ใช้ Primary Color เป็นตัว Active */}
          <TabsList className="h-auto w-full justify-start p-0 mb-4 bg-transparent border-b border-border">
            <TabsTrigger 
              value="waiting" 
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 text-sm font-medium transition-all text-muted-foreground 
                         data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none 
                         rounded-none hover:text-foreground"
            >
              <FileClock className="mr-2 h-4 w-4" />
              Waiting for Approval ({pendingSteps.length})
            </TabsTrigger>
            <TabsTrigger 
              value="done"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 text-sm font-medium transition-all text-muted-foreground
                         data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none 
                         rounded-none hover:text-foreground"
            >
              <History className="mr-2 h-4 w-4" />
              History ({doneSteps.length})
            </TabsTrigger>
          </TabsList>
          
          {/* --- Tab: Waiting --- */}
          <TabsContent value="waiting">
            <Card className="mt-4 border-none shadow-sm">
              <CardHeader className="bg-secondary/30 border-b border-border py-3 px-6">
                <CardTitle className="text-base font-semibold">Requests Awaiting My Action</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead className="pl-6 text-xs font-bold text-muted-foreground uppercase">Request ID</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase">Requestor</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase">Total Amount</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase">Items</TableHead>
                      <TableHead className="text-right pr-6 text-xs font-bold text-muted-foreground uppercase">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPendingSteps.length === 0 ? (
                       <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No pending approvals on this page.</TableCell></TableRow>
                    ) : (
                      paginatedPendingSteps.map((step) => (
                        <TableRow 
                          key={step.id} 
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => handleRowClick(step.requestId)}
                        >
                          <TableCell className="pl-6 font-medium">{step.request.id}</TableCell>
                          <TableCell>{step.request.user.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            ฿{Number(step.request.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{step.request.items.length}</TableCell>
                          
                          <TableCell className="text-right space-x-2 pr-6">
                            {actionLoading === step.id ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-auto text-primary" />
                            ) : (
                              <>
                                {/* Reject Button: Destructive Color */}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(step.id, "Rejected");
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Reject
                                </Button>
                                {/* Approve Button: Primary Color (Theme Orange) */}
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(step.id, "Approved");
                                  }}
                                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" 
                                >
                                  Approve
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between space-x-2 py-4 px-6 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages} (Total {pendingSteps.length}{" "}
                    pending requests)
                  </span>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* --- Tab: History (Done) --- */}
          <TabsContent value="done">
             <Card className="mt-4 border-none shadow-sm">
                <CardHeader className="bg-secondary/30 border-b border-border py-3 px-6">
                    <CardTitle className="text-base font-semibold">Approval History</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                          <TableHead className="text-xs font-bold text-muted-foreground uppercase">Request ID</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground uppercase">Final Status</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground uppercase">Date</TableHead>
                          <TableHead className="text-xs font-bold text-muted-foreground uppercase">Comment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doneSteps.length === 0 ? (
                           <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No approval history.</TableCell></TableRow>
                        ) : (
                          doneSteps.map((step) => (
                             <TableRow 
                              key={step.id} 
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => handleRowClick(step.requestId)}
                            >
                              <TableCell className="font-medium">{step.request.id}</TableCell>
                              <TableCell>
                                <Badge variant={getApprovalStatusVariant(step.status)} className="capitalize shadow-none">
                                  {step.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {step.approvedAt ? format(new Date(step.approvedAt), 'dd MMM yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{step.comment || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- Dialog (Modal) --- */}
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
              <Label htmlFor="comment-approval" className="text-right">
                Comment
              </Label>
              <Textarea
                id="comment-approval"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="col-span-3"
                placeholder={currentAction?.action === "Rejected" ? "Reason for rejection..." : "Optional comment..."}
                disabled={actionLoading !== null}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={actionLoading !== null}>
                Cancel
              </Button>
            </DialogClose>
            {/* 🟢 Approve/Reject Button (ใช้ Primary/Destructive) */}
            <Button 
              type="button" 
              onClick={handleConfirmAction} 
              disabled={actionLoading !== null || (currentAction?.action === 'Rejected' && !comment.trim())}
              variant={currentAction?.action === 'Rejected' ? 'destructive' : 'default'}
            >
              {actionLoading !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {currentAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}