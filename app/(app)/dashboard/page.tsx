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
import {
  Loader2,
  MoreHorizontal,
  FileText,
  Clock,
  ShoppingCart,
  Coins,
  CheckCircle2,
  XCircle
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
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart, 
  Line, 
  PieChart, 
  Pie,
} from 'recharts';
import { cn } from "@/lib/utils"; 

type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
  approvalSteps: ApprovalStep[];
};

type SortKey = "id" | "user" | "totalAmount" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

const CustomLabel = ({ viewBox, total, label }: any) => {
    const { cx, cy } = viewBox;
    return (
      <g>
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold text-foreground">
            {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 24} textAnchor="middle" dominantBaseline="middle" className="text-sm text-muted-foreground">
          {label}
        </text>
      </g>
    );
};

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; 

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

  // --- Updated Stats Logic ---
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    
    // 1. Pending Approval (รออนุมัติ)
    const pendingCount = requests.filter(r => r.status.toLowerCase() === 'pending').length;
    
    // 2. Processing (Approved + Ordered) - งานที่ฝ่ายจัดซื้อกำลังทำ
    const processingCount = requests.filter(r => ['approved', 'ordered'].includes(r.status.toLowerCase())).length;
    
    // 3. Completed (Received)
    const completedCount = requests.filter(r => r.status.toLowerCase() === 'received').length;

    // 4. Total Spend (คิดเฉพาะสถานะที่ไม่ใช่ Rejected/Cancelled)
    const validRequests = requests.filter(r => !['rejected', 'cancelled'].includes(r.status.toLowerCase()));
    const totalAmount = validRequests.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    
    return {
      totalRequests,
      pendingCount,
      processingCount,
      completedCount,
      totalAmount,
    };
  }, [requests]);

  const monthlyRequestData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = monthNames.reduce((acc: Record<string, number>, month) => ({ ...acc, [month]: 0 }), {});

    requests.forEach(r => {
      const monthName = format(new Date(r.createdAt), "MMM"); 
      dataMap[monthName] = (dataMap[monthName] || 0) + 1;
    });
    
    const chartData = monthNames.map(month => ({
        name: month,
        Orders: dataMap[month] 
    }));

    return chartData;
  }, [requests]);

  const statusData = useMemo(() => {
      const pendingCount = requests.filter(r => r.status.toLowerCase() === 'pending').length;
      const orderedCount = requests.filter(r => r.status.toLowerCase() === 'ordered').length;
      const approvedCount = requests.filter(r => r.status.toLowerCase() === 'approved').length;
      const receivedCount = requests.filter(r => r.status.toLowerCase() === 'received').length;
      const rejectedCount = requests.filter(r => r.status.toLowerCase() === 'rejected').length;
      const cancelledCount = requests.filter(r => r.status.toLowerCase() === 'cancelled').length;
      
      const totalCount = requests.length;

      return {
          totalCount,
          data: [
              { name: 'Received', value: receivedCount, fill: '#10b981', label: `${receivedCount}` }, 
              { name: 'Ordered', value: orderedCount, fill: '#3b82f6', label: `${orderedCount}` }, 
              { name: 'Approved', value: approvedCount, fill: '#6366f1', label: `${approvedCount}` }, 
              { name: 'Pending', value: pendingCount, fill: '#f97316', label: `${pendingCount}` }, 
              { name: 'Rejected', value: rejectedCount + cancelledCount, fill: '#ef4444', label: `${rejectedCount + cancelledCount}` }, 
          ].filter(d => d.value > 0),
      };
  }, [requests]);

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
        bValue = Number(b.totalAmount) || 0;
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sortableRequests;
  }, [requests, sortConfig]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedRequests.slice(startIndex, endIndex);
  }, [sortedRequests, currentPage]);

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
        alert("Failed to update status: " + (err.message || 'Unknown error'));
        setActionLoading(null);
    }
  };

  // --- Updated StatsCard Component ---
  const StatsCard = ({ title, value, icon: Icon, className }: {
    title: string,
    value: string,
    icon: any,
    className?: string
  }) => (
    <Card className={cn("border-slate-200 shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="p-2 bg-slate-50 rounded-full text-slate-500">
                <Icon className="h-4 w-4" />
            </div>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>       
      </CardContent>
    </Card>
  );

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
         <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of procurement activities</p>
         </div>
      </div>

      {/* Stats Cards (Updated) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Requisitions */}
        <StatsCard 
          title="Total Requisitions"
          value={stats.totalRequests.toLocaleString()}
          icon={FileText}
        />

        {/* 2. Pending Approval - Important! */}
        <StatsCard 
          title="Pending Approval"
          value={stats.pendingCount.toLocaleString()}
          icon={Clock}
          className="border-l-4 border-l-orange-500" // เน้นสีส้ม
        />

        {/* 3. Processing (Active Orders) */}
        <StatsCard 
          title="In Processing"
          value={stats.processingCount.toLocaleString()}
          icon={ShoppingCart}
        />

        {/* 4. Total Spend */}
        <StatsCard 
          title="Total Spend"
          value={`฿${stats.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={Coins}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Orders Analytics (Line Chart) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Request Trends</CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRequestData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <RechartsTooltip 
                     contentStyle={{ 
                       borderRadius: '8px', 
                       border: '1px solid #e2e8f0', 
                       backgroundColor: 'white',
                       boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                       padding: '8px 12px' 
                     }}
                     labelStyle={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                     formatter={(value: any) => [value.toLocaleString(), 'Requests']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Orders" 
                    stroke="#f97316" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#f97316', stroke: 'white', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status (Donut Chart) */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm">
           <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Status Breakdown</CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
           </CardHeader>
           <CardContent className="flex flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData.data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65} 
                            outerRadius={90} 
                            paddingAngle={2}
                            startAngle={90}
                            endAngle={450}
                        >
                            {statusData.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <CustomLabel total={statusData.totalCount} label="Requests" viewBox={{ cx: 235, cy: 100 }} />
                    </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="w-full space-y-3 mt-6">
                {statusData.data.map(entry => (
                    <div key={entry.name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }}/>
                            <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{entry.value.toLocaleString()}</span>
                    </div>
                ))}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold">Recent Requests</CardTitle>
            <Button 
              variant="ghost" 
              className="text-sm font-medium text-primary hover:text-primary/80 hover:bg-transparent"
              onClick={() => router.push("/purchase-requests")}
            >
              View all
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide pl-6">
                          Request #
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Requester
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Date
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Status
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide pr-6 text-right">
                          Total Amount
                        </TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                              No recent requests found.
                            </TableCell>
                          </TableRow>
                      ) : (
                      paginatedRequests.map((req) => {
                          return (
                          <TableRow 
                            key={req.id} 
                            className="cursor-pointer hover:bg-slate-50/80 border-b border-slate-100 transition-colors" 
                            onClick={() => router.push(`/purchase-requests/${req.id}`)}
                          >
                              <TableCell className="py-4 pl-6">
                                <span className="text-sm font-medium text-foreground">#{req.id}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm text-foreground">{req.user.name}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(req.createdAt), "MMM d, yyyy")}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                  {req.status.toLowerCase() === 'ordered' || req.status.toLowerCase() === 'received' ? (
                                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <ShoppingCart className="mr-1.5 h-3 w-3" /> Ordered
                                      </Badge>
                                  ) : req.status.toLowerCase() === 'approved' ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <CheckCircle2 className="mr-1.5 h-3 w-3" /> Approved
                                      </Badge>
                                  ) : req.status.toLowerCase() === 'rejected' || req.status.toLowerCase() === 'cancelled' ? (
                                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <XCircle className="mr-1.5 h-3 w-3" /> Rejected
                                      </Badge>
                                  ) : (
                                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <Clock className="mr-1.5 h-3 w-3" /> Pending
                                      </Badge>
                                  )}
                              </TableCell>
                              <TableCell className="py-4 pr-6 text-right">
                                  <span className="text-sm font-medium text-foreground">
                                    ฿{Number(req.totalAmount).toLocaleString()}
                                  </span>
                              </TableCell>
                          </TableRow>
                          );
                      })
                      )}
                  </TableBody>
              </Table>
            </div>
        </CardContent>
        </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action: {currentAction?.action}</DialogTitle>
            <DialogDescription>
              {currentAction?.action === "Rejected"
                ? "Please provide a reason for rejection (Required)."
                : "You are about to approve this request. (Comment optional)"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment-dash">Comment</Label>
              <Textarea
                id="comment-dash"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={currentAction?.action === "Rejected" ? "Reason for rejection..." : "Optional comment..."}
                disabled={actionLoading !== null}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleConfirmAction} 
              disabled={actionLoading !== null || (currentAction?.action === 'Rejected' && !comment.trim())}
              variant={currentAction?.action === 'Rejected' ? 'destructive' : 'default'}
              className="rounded-lg"
            >
              {actionLoading !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {currentAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}