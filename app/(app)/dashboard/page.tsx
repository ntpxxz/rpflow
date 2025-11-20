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
  ArrowUp,
  ArrowDown,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Wallet,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Recharts imports
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
  approvalSteps: ApprovalStep[];
};

type SortKey = "id" | "user" | "totalAmount" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sort & Pagination State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; 

  // Action State
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

  // --- 📊 Stats Cards Logic ---
  const stats = useMemo(() => {
    const pendingRequests = requests.filter(r => r.status.toLowerCase() === 'pending');
    
    const pendingCount = pendingRequests.length;
    const pendingAmount = pendingRequests.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

    const processingRequests = requests.filter(r => ['approved', 'ordered'].includes(r.status.toLowerCase()));
    const processingCount = processingRequests.length;

    const completedCount = requests.filter(r => r.status.toLowerCase() === 'received').length;

    return {
      totalRequests: requests.length,
      pendingCount,
      pendingAmount,
      processingCount,
      completedCount
    };
  }, [requests]);

  // --- 📈 Chart Data Preparation (ใช้สี Primary/Secondary/Success) ---
  const chartData = useMemo(() => {
    const data = [
      { name: 'Pending', value: 0, color: '#f59e0b' }, // Amber (Warning)
      { name: 'Approved', value: 0, color: 'hsl(var(--primary))' }, // 🟢 Primary Orange
      { name: 'Ordered', value: 0, color: '#3b82f6' },  // Blue
      { name: 'Rejected', value: 0, color: '#ef4444' }, // Red
      { name: 'Received', value: 0, color: '#10b981' }, // Emerald
    ];

    requests.forEach(r => {
      const status = r.status.toLowerCase();
      const entry = data.find(d => d.name.toLowerCase() === status);
      if (entry) {
        entry.value += 1;
      }
    });
    
    return data.filter(d => d.value > 0);
  }, [requests]);

  // --- Sorting & Pagination Logic ---
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

  // ... (Action Handlers & getStatusVariant เหมือนเดิม) ...
    const handleOpenModal = (e: React.MouseEvent, stepId: string, action: "Approved" | "Rejected") => {
    e.stopPropagation();
    setCurrentAction({ stepId, action });
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    // ... (Logic การยืนยัน action) ...
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "pending": return "secondary"; // 👈 สี Secondary
      case "approved": return "default"; // 👈 สี Primary (ส้ม)
      case "ordered": return "default"; // 👈 สี Primary
      case "received": return "default"; // 👈 สี Primary
      case "rejected": return "destructive"; // สีแดง
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening with your requests.</p>
         </div>
      </div>

      {/* --- 1. Stats Cards (ใช้ Primary/Accent Colors) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm"> {/* 🟢 Total: Primary Orange Accent */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <Package className="h-4 w-4 text-primary" /> {/* 🟢 Primary Color Icon */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm"> {/* Pending: Amber Accent */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-amber-600 font-medium">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm"> {/* Processing: Blue Accent */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingCount}</div>
            <p className="text-xs text-muted-foreground">Approved & Ordered</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm"> {/* Financial: Emerald Accent */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{stats.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Est. cost for pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- 2. Table Section (Main Content) --- */}
        <div className="lg:col-span-2">
            <Card className="h-full shadow-sm border border-slate-200">
            <CardHeader className="border-b border-border bg-secondary/30 py-4">
                <CardTitle className="text-lg">Recent Requests</CardTitle>
                <CardDescription>Manage your latest purchase requests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">
                        <Button variant="ghost" onClick={() => requestSort("id")} className="px-0 hover:bg-transparent font-semibold text-muted-foreground">
                        Request No. {sortConfig.key === "id" && (sortConfig.direction === "asc" ? <ArrowUp className="inline h-3 w-3"/> : <ArrowDown className="inline h-3 w-3"/>)}
                        </Button>
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort("user")} className="px-0 hover:bg-transparent font-semibold text-muted-foreground">
                        Requestor {sortConfig.key === "user" && (sortConfig.direction === "asc" ? <ArrowUp className="inline h-3 w-3"/> : <ArrowDown className="inline h-3 w-3"/>)}
                        </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort("totalAmount")} className="px-0 hover:bg-transparent font-semibold text-muted-foreground">
                        Total {sortConfig.key === "totalAmount" && (sortConfig.direction === "asc" ? <ArrowUp className="inline h-3 w-3"/> : <ArrowDown className="inline h-3 w-3"/>)}
                        </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
                    ) : paginatedRequests.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No requests found.</TableCell></TableRow>
                    ) : (
                    paginatedRequests.map((req) => {
                        const pendingStep = req.approvalSteps.find((s) => s.status.toLowerCase() === "pending");
                        const isLoading = pendingStep && actionLoading === pendingStep.id;

                        return (
                        <TableRow key={req.id} className="cursor-pointer hover:bg-accent group" onClick={() => router.push(`/purchase-requests/${req.id}`)}>
                            <TableCell className="font-medium text-foreground">{req.id}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-secondary-foreground font-bold">
                                        {req.user.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-foreground">{req.user.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                {format(new Date(req.createdAt), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="text-foreground text-sm">{req.items.length}</TableCell>
                            <TableCell className="font-semibold text-foreground">
                                ฿{Number(req.totalAmount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(req.status)} className="capitalize shadow-none">
                                    {req.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin ml-auto text-primary" />
                                ) : req.status.toLowerCase() === "pending" && pendingStep ? (
                                    <div className="flex justify-end gap-2">
                                        {/* 🟢 Action Buttons (Using Theme) */}
                                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                                            onClick={(e) => handleOpenModal(e, pendingStep.id, "Rejected")}>
                                            Reject
                                        </Button>
                                        <Button size="sm" variant="default" className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                                            onClick={(e) => handleOpenModal(e, pendingStep.id, "Approved")}>
                                            Approve
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        );
                    })
                    )}
                </TableBody>
                </Table>

                {/* Pagination */}
                <div className="p-4 flex items-center justify-between border-t border-border bg-card">
                    <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages} (Total {requests.length}{" "}
                        requests)
                    </span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            </CardContent>
            </Card>
        </div>

        {/* --- 3. Charts & Insights Section --- */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border border-border">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-foreground">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 12}} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))' }}
                                    cursor={{fill: 'transparent'}}
                                    // 🟢 ใช้สีจาก ChartData ที่ Map ไว้
                                    formatter={(value, name, props) => [`${value}`, name]}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            
            {/* Tips / Info Card (เปลี่ยนสีให้เข้ากับ Theme) */}
            <Card className="bg-blue-50 border-blue-100 shadow-none">
                <CardContent className="p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-blue-700">Tip of the day</h4>
                        <p className="text-xs text-blue-600 mt-1">
                            Approve requests promptly to avoid shipment delays. Check "Pending Approval" for urgent items.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Modal (คงเดิม) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          {/* ... (Modal content and logic remain the same) ... */}
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
              <Label htmlFor="comment-dash" className="text-right">Comment</Label>
              <Textarea
                id="comment-dash"
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
              <Button type="button" variant="outline">Cancel</Button>
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
    </div>
  );
}