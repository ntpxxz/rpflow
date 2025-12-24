// app/(app)/purchase-requests/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PurchaseRequest, User, RequestItem } from "@prisma/client";
import { format } from "date-fns";
import {
  Loader2,
  Plus,
  Search,
  FileText,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Trash2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

// Type Definitions
type RequestWithDetails = PurchaseRequest & {
  user: User;
  items: RequestItem[];
};

type SortKey = "id" | "createdAt" | "totalAmount" | "status" | "itemsCount";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function MyRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Sorting & Pagination State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

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
      .finally(() => setLoading(false));
  };

  // 2. Sorting Handler
  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1); // Reset to page 1 when sorting changes
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this request?")) return;

    try {
      const res = await fetch(`/api/purchase-requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      // Update local state immediately
      setRequests(prev => prev.filter(r => r.id !== id));

      // Show explicit confirmation as requested
      alert("Request deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to delete request");
    }
  };

  // 3. Process Data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    // A. Filter
    let data = requests.filter((req) => {
      const lowerQuery = searchQuery.toLowerCase();
      return (
        req.requesterName.toLowerCase().includes(lowerQuery) ||
        req.id.toLowerCase().includes(lowerQuery) ||
        req.status.toLowerCase().includes(lowerQuery)
      );
    });

    // B. Sort
    data.sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue: any = a[key as keyof PurchaseRequest];
      let bValue: any = b[key as keyof PurchaseRequest];

      // Handle special keys
      if (key === "itemsCount") {
        aValue = a.items.length;
        bValue = b.items.length;
      } else if (key === "totalAmount") {
        aValue = Number(a.totalAmount) || 0;
        bValue = Number(b.totalAmount) || 0;
      } else if (key === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [requests, searchQuery, sortConfig]);

  // C. Paginate
  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedData, currentPage]);

  // Helper: Badge Color
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      case 'ordered': return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
      case 'received': return 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200';
      default: return 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-200';
    }
  };

  // Helper: Render Sortable Header
  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <TableHead className={className}>
        <button
          onClick={() => handleSort(sortKey)}
          className="flex items-center gap-1 hover:text-slate-700 transition-colors font-semibold uppercase tracking-wider text-xs"
        >
          {label}
          {isActive ? (
            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </button>
      </TableHead>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-8xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your purchase requisitions.
          </p>
        </div>
        <Button onClick={() => router.push("/purchase-requests/new")} className="shadow-sm bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID, status..."
              className="pl-9 max-w-md bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset Page on search
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <SortableHeader label="Request ID" sortKey="id" className="pl-6 h-11" />
                  <SortableHeader label="Date" sortKey="createdAt" className="h-11" />
                  <SortableHeader label="Items" sortKey="itemsCount" className="h-11" />
                  <SortableHeader label="Total Amount" sortKey="totalAmount" className="h-11" />
                  <SortableHeader label="Status" sortKey="status" className="h-11" />
                  <TableHead className="h-11 w-[50px]">
                    {(session?.user as any)?.role === 'Admin' && "Action"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequests.map((req) => (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 group"
                      onClick={() => router.push(`/purchase-requests/${req.id}`)}
                    >
                      <TableCell className="py-4 pl-6 font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-orange-600 transition-colors">
                            <FileText className="h-4 w-4" />
                          </div>
                          {req.id}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-slate-600 text-sm">
                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="py-4 text-slate-600 text-sm">
                        {req.items.length} items
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-slate-900 text-sm">
                        ฿{Number(req.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(session?.user as any)?.role === 'Admin' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(e, req.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, processedData.length)} of {processedData.length} requests
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-md border-slate-200"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-md border-slate-200"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}