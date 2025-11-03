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
import { Loader2, Check, X } from "lucide-react";

// 1. 👈 Import Tabs และ Dialog
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

// 2. 👈 Type รวมข้อมูล (เหมือนเดิม)
type PendingApproval = ApprovalStep & {
  request: PurchaseRequest & {
    user: User;
    items: RequestItem[]; // 👈 (ใช้ Type ที่ถูกต้อง)
  };
  approver: User;
};

export default function Approval() {
  const [allSteps, setAllSteps] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 3. 👈 State สำหรับ Modal
  const [comment, setComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<{ stepId: string; action: "Approved" | "Rejected"; } | null>(null);

  // 4. 👈 Fetch ข้อมูล (API ที่แก้ไขแล้ว)
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/approval-steps") // 👈 (ลบ ?status=Pending ออก)
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

  // 5. 👈 แยกข้อมูลสำหรับ Tabs (Waiting vs Done)
  const pendingSteps = useMemo(() => 
    allSteps.filter(step => step.status.toLowerCase() === 'pending')
  , [allSteps]);

  const doneSteps = useMemo(() => 
    allSteps.filter(step => step.status.toLowerCase() !== 'pending')
  , [allSteps]);

  // 6. 👈 ฟังก์ชันสำหรับ "เปิด" Modal
  const handleOpenModal = (
    stepId: string,
    action: "Approved" | "Rejected"
  ) => {
    setCurrentAction({ stepId, action });
    setComment("");
    setIsModalOpen(true);
  };

  // 7. 👈 ฟังก์ชัน "ยืนยัน" (ใน Modal)
  const handleConfirmAction = async () => {
    if (!currentAction) return;
    if (currentAction.action === "Rejected" && !comment.trim()) {
      alert("Please provide a comment for rejection.");
      return;
    }

    // TODO: 🔴 HARDCODE: ใช้ Test Approver ID
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
      fetchRequests(); // 👈 รีเฟรช

    } catch (err: any) {
      console.error(err);
      alert("Failed to update status.");
      setActionLoading(null);
    }
  };

  // 8. 👈 ฟังก์ชันสำหรับ Badge (รองรับตัวเล็ก/ใหญ่)
  const getApprovalStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };
  
  // 9. 👈 (Optional) ฟังก์ชันสำหรับคลิกดูรายละเอียด PR
  const handleRowClick = (requestId: string) => {
    router.push(`/purchase-requests/${requestId}`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <> {/* 👈 ครอบด้วย Fragment */}
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Approval Requests</h1>

        {/* --- 10. 👈 เพิ่ม Tabs UI --- */}
        <Tabs defaultValue="waiting" className="w-full">
          <TabsList>
            <TabsTrigger value="waiting">
              Waiting for Approval ({pendingSteps.length})
            </TabsTrigger>
            <TabsTrigger value="done">
              History ({doneSteps.length})
            </TabsTrigger>
          </TabsList>
          
          {/* --- Tab: Waiting --- */}
          <TabsContent value="waiting">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requestor</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSteps.length === 0 ? (
                       <TableRow><TableCell colSpan={5} className="text-center h-24">No pending approvals.</TableCell></TableRow>
                    ) : (
                      pendingSteps.map((step) => (
                        <TableRow 
                          key={step.id} 
                          className="cursor-pointer" 
                          onClick={() => handleRowClick(step.requestId)}
                        >
                          <TableCell>{step.request.user.name}</TableCell>
                          <TableCell>{step.request.id}</TableCell>
                          <TableCell>
                            ฿{Number(step.request.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell>{step.request.items.length}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {actionLoading === step.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Button
                                  variant="destructive"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(step.id, "Rejected");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(step.id, "Approved");
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* --- Tab: Done (History) --- */}
          <TabsContent value="done">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Final Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doneSteps.length === 0 ? (
                       <TableRow><TableCell colSpan={4} className="text-center h-24">No approval history.</TableCell></TableRow>
                    ) : (
                      doneSteps.map((step) => (
                         <TableRow 
                          key={step.id} 
                          className="cursor-pointer"
                          onClick={() => handleRowClick(step.requestId)}
                        >
                          <TableCell>{step.request.id}</TableCell>
                          <TableCell>
                            <Badge variant={getApprovalStatusVariant(step.status)}>
                              {step.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {step.approvedAt ? format(new Date(step.approvedAt), 'P') : '-'}
                          </TableCell>
                          <TableCell>{step.comment || '-'}</TableCell>
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

      {/* --- 11. 👈 Dialog (Modal) สำหรับยืนยัน --- */}
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