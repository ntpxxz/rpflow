// app/(app)/approval/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ApprovalStep, PurchaseRequest, User, RequestItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
  Badge
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
import { StatusBadge } from "@/components/StatusBadge"; // 👈 ใช้ Component กลาง

type PendingApproval = ApprovalStep & {
  request: PurchaseRequest & {
    user: User;
    items: RequestItem[];
  };
  approver: User;
};

const ITEMS_PER_PAGE = 10;

export default function ApprovalPage() {
  const [allSteps, setAllSteps] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("waiting");
  const [comment, setComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); 
  const [currentAction, setCurrentAction] = useState<{ stepId: string; action: "Approved" | "Rejected"; } | null>(null);
  
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

  const pendingSteps = useMemo(() => allSteps.filter(step => step.status.toLowerCase() === 'pending'), [allSteps]);
  const doneSteps = useMemo(() => allSteps.filter(step => step.status.toLowerCase() !== 'pending'), [allSteps]);

  const filterData = (data: PendingApproval[]) => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(step => 
      step.request.user.name.toLowerCase().includes(lowerQuery) ||
      step.request.id.toString().includes(lowerQuery) ||
      step.requestId.toLowerCase().includes(lowerQuery)
    );
  };

  const filteredPending = useMemo(() => filterData(pendingSteps), [pendingSteps, searchQuery]);
  const filteredDone = useMemo(() => filterData(doneSteps), [doneSteps, searchQuery]);

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

  const handleOpenModal = (e: React.MouseEvent, stepId: string, action: "Approved" | "Rejected") => {
    e.stopPropagation();
    setCurrentAction({ stepId, action });
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!currentAction) return;
    
    const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";
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
  
  const handleExport = () => {
    setIsExporting(true);
    const dataToExport = activeTab === "waiting" ? filteredPending : filteredDone;
    const fileName = activeTab === "waiting" ? "pending_approvals.csv" : "approval_history.csv";

    try {
      const headers = ["Request ID", "Requestor", "Total Amount", "Items Count", "Date", "Status", "Comment"];
      const rows = dataToExport.map(step => [
        step.request.id,
        `"${step.request.user.name}"`,
        step.request.totalAmount,
        step.request.items.length,
        format(new Date(step.request.createdAt), "yyyy-MM-dd HH:mm"),
        step.status,
        `"${step.comment || ""}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
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

  const StatsCard = ({ title, value, icon: Icon, className }: any) => (
    <Card className={cn("border-slate-200 shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6 flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-foreground">{value}</h3>
        </div>
        <div className="p-2 bg-slate-50 rounded-full text-slate-500">
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );

  const renderTableHeader = (showActions = true) => (
    <TableHeader className="bg-slate-50/50">
       <TableRow className="border-b border-slate-100 hover:bg-transparent">
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider pl-6 w-[180px]">
           Request ID
         </TableHead>
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider">
           Requestor
         </TableHead>
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider">
           Total Amount
         </TableHead>
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider">
           Items
         </TableHead>
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider">
           Date
         </TableHead>
         <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-6">
           {showActions ? "Actions" : "Status"}
         </TableHead>
       </TableRow>
     </TableHeader>
  );

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-6 pb-10">
        
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Approval Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your approval workflow efficiently.</p>
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export List
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard 
             title="Pending Requests" 
             value={pendingSteps.length} 
             icon={Clock}
             className="border-l-4 border-l-orange-500"
          />
          <StatsCard 
             title="Approved (This Month)" 
             value={doneSteps.filter(s => s.status.toLowerCase() === 'approved').length} 
             icon={CheckCircle2}
          />
          <StatsCard 
             title="Rejected (This Month)" 
             value={doneSteps.filter(s => s.status.toLowerCase() === 'rejected').length} 
             icon={XCircle}
          />
        </div>

        {/* Main Content Area */}
        <Card className="border-slate-200 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            {/* Tabs & Search */}
            <div className="border-b border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="waiting" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
                    In Queue <Badge  className="bg-slate-200 text-slate-700 text-[10px] h-5 px-1.5">{pendingSteps.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="done" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                    History <Badge  className="bg-slate-200 text-slate-700 text-[10px] h-5 px-1.5">{doneSteps.length}</Badge>
                  </TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-orange-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setCurrentHistoryPage(1);
                  }}
                />
              </div>
            </div>

            <CardContent className="p-0">
                {/* Tab: Waiting */}
                <TabsContent value="waiting" className="m-0">
                    <div className="relative w-full overflow-x-auto">
                    <Table>
                      {renderTableHeader(true)}
                      <TableBody>
                        {paginatedPendingSteps.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                               {searchQuery ? "No matching requests found." : "No pending approvals."}
                             </TableCell>
                           </TableRow>
                        ) : (
                          paginatedPendingSteps.map((step) => (
                            <TableRow 
                              key={step.id} 
                              className="cursor-pointer hover:bg-slate-50/80 border-b border-slate-100 transition-colors group"
                              onClick={() => handleRowClick(step.requestId)}
                            >
                              <TableCell className="py-4 pl-6 font-medium text-foreground text-sm">
                                #{step.request.id}
                              </TableCell>
                              <TableCell className="py-4 text-foreground text-sm font-medium">
                                 {step.request.user.name}
                              </TableCell>
                              <TableCell className="py-4 text-foreground text-sm font-semibold">
                                ฿{Number(step.request.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <Package className="w-3.5 h-3.5" /> {step.request.items.length} items
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <Calendar className="w-3.5 h-3.5" /> {format(new Date(step.request.createdAt), "d MMM, yyyy")}
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 text-right pr-6">
                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="outline" onClick={(e) => handleOpenModal(e, step.id, "Rejected")} className="h-8 px-3 text-xs border-slate-200 hover:bg-red-50 hover:text-red-600">Decline</Button>
                                    <Button size="sm" onClick={(e) => handleOpenModal(e, step.id, "Approved")} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    </div>
                    {/* Pagination for Waiting... (Logic similar to previous) */}
                </TabsContent>
                
                {/* Tab: History */}
                <TabsContent value="done" className="m-0">
                     <div className="relative w-full overflow-x-auto">
                        <Table>
                          {renderTableHeader(false)}
                          <TableBody>
                            {paginatedDoneSteps.length === 0 ? (
                               <TableRow>
                                 <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No history found.</TableCell>
                               </TableRow>
                            ) : (
                              paginatedDoneSteps.map((step) => (
                                 <TableRow 
                                  key={step.id} 
                                  className="cursor-pointer hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                                  onClick={() => handleRowClick(step.requestId)}
                                >
                                  {/* ... Similar columns ... */}
                                  <TableCell className="py-4 pl-6 font-medium text-foreground text-sm">#{step.request.id}</TableCell>
                                  <TableCell className="py-4 text-foreground text-sm">{step.request.user.name}</TableCell>
                                  <TableCell className="py-4 text-foreground text-sm">฿{Number(step.request.totalAmount).toLocaleString()}</TableCell>
                                  <TableCell className="py-4 text-xs text-muted-foreground">{step.request.items.length} items</TableCell>
                                  <TableCell className="py-4 text-xs text-muted-foreground">{step.approvedAt ? format(new Date(step.approvedAt), 'd MMM, yyyy') : '-'}</TableCell>
                                  <TableCell className="py-4 text-right pr-6">
                                    <StatusBadge status={step.status} />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                     </div>
                </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Modal (Same as before) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* ... Content similar to dashboard modal ... */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm {currentAction?.action}</DialogTitle>
            <DialogDescription>Add a comment for this action.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} disabled={actionLoading !== null} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleConfirmAction} disabled={actionLoading !== null} variant={isRejection ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}