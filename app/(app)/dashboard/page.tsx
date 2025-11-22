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
  TrendingUp,
  TrendingDown,
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

  const stats = useMemo(() => {
    const pendingRequests = requests.filter(r => r.status.toLowerCase() === 'pending');
    const processingRequests = requests.filter(r => ['approved', 'ordered'].includes(r.status.toLowerCase()));
    
    const totalRequests = requests.length;
    const pendingCount = pendingRequests.length;
    const totalAmount = requests.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const processingCount = processingRequests.length;
    const rejectedCount = requests.filter(r => r.status.toLowerCase() === 'rejected').length;
    
    return {
      totalRequests,
      pendingCount,
      totalAmount,
      processingCount,
      rejectedCount,
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
      
      const totalCount = requests.length;

      return {
          totalCount,
          data: [
              { name: 'Shipped orders', value: orderedCount + receivedCount, fill: '#ff6b35', label: `${orderedCount + receivedCount}` }, 
              { name: 'Pending', value: pendingCount, fill: '#ffa500', label: `${pendingCount}` }, 
              { name: 'Approved', value: approvedCount, fill: '#4ecdc4', label: `${approvedCount}` }, 
              { name: 'Total orders', value: totalCount - (orderedCount + receivedCount + pendingCount + approvedCount), fill: '#ffcdb2', label: `${totalCount}` }, 
          ].filter(d => d.value > 0),
      };
  }, [requests]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

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

  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);

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

  const StatsCard = ({ title, value, pending}: {
    title: string,
    value: string,
    pending?: number,
  }) => (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {pending !== undefined && pending > 0 && (
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 font-medium border-0 rounded-md px-2 py-0.5">
             Pending · {pending}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>       
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
            <h1 className="text-2xl font-bold text-foreground"> Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your dashboard details for today</p>
         </div>
         <div className="flex items-center gap-3">
         </div>
      </div>

      {/* Stats Cards */}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total orders */}
        <StatsCard 
          title="Total Requests"
          value={stats.totalRequests.toLocaleString()}
          pending={stats.pendingCount}     
        
        />
        {/* Card 2: Total products (Total Amount) */}
        <StatsCard 
          title="Total Cost"
          value={`฿${stats.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          pending={stats.pendingCount}      />
        {/* Card 3: Total returns (Processing Requests) */}
        <StatsCard 
          title="Ordered"
          value={stats.processingCount.toLocaleString()}
          pending={stats.rejectedCount} 

        />
        {/* Card 4: ASN's (Approvals Pending) */}
        <StatsCard 
          title="ASN's"
          value={stats.pendingCount.toLocaleString()} 
          pending={stats.pendingCount}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Orders Analytics (Line Chart) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Orders Analytics</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-slate-300" />
                    <span className="text-muted-foreground">Returns</span>
                  </div>
                  <select className="bg-transparent text-foreground text-sm font-medium border-0 focus:ring-0 cursor-pointer">
                    <option>This year</option>
                  </select>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </div>
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
                     formatter={(value: any) => [value.toLocaleString(), 'Orders']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Orders" 
                    stroke="#ff6b35" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#ff6b35', stroke: 'white', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status (Donut Chart) */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm">
           <CardHeader className="flex flex-row justify-between items-center pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Orders by status</CardTitle>
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
                        <CustomLabel total={statusData.totalCount} label="Orders" viewBox={{ cx: 235, cy: 100 }} />
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
            <CardTitle className="text-lg font-semibold">Recent orders</CardTitle>
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
                          Order #
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Requester
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Request date
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Order date
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Status
                        </TableHead>
                        <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide pr-6">
                          Total amount
                        </TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                              No recent requests found.
                            </TableCell>
                          </TableRow>
                      ) : (
                      paginatedRequests.map((req) => {
                          const pendingStep = req.approvalSteps.find((s) => s.status.toLowerCase() === "pending");
                          const isLoading = pendingStep && actionLoading === pendingStep.id;
                          
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
                                <div className="text-sm">
                                  <div className="text-foreground">{format(new Date(req.createdAt), "MMM d, yyyy")}</div>
                                  <div className="text-xs text-muted-foreground">{format(new Date(req.createdAt), "hh:mm a")}</div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-sm text-muted-foreground">
                                  {req.status.toLowerCase() === 'ordered' || req.status.toLowerCase() === 'received' 
                                    ? format(new Date(req.updatedAt), "MMM d, yyyy")
                                    : '-'
                                  }
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                  {req.status.toLowerCase() === 'ordered' || req.status.toLowerCase() === 'received' ? (
                                      <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <span className="mr-1.5">●</span> Shipped
                                      </Badge>
                                  ) : req.status.toLowerCase() === 'approved' ? (
                                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <span className="mr-1.5">●</span> Pending
                                      </Badge>
                                  ) : req.status.toLowerCase() === 'rejected' || req.status.toLowerCase() === 'cancelled' ? (
                                      <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <span className="mr-1.5">⚠</span> Cancelled
                                      </Badge>
                                  ) : (
                                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
                                        <span className="mr-1.5">●</span> Pending
                                      </Badge>
                                  )}
                              </TableCell>
                              <TableCell className="py-4 pr-6">
                                  <span className="text-sm font-medium text-foreground">
                                    ฿{Number(req.totalAmount).toFixed(2)}
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