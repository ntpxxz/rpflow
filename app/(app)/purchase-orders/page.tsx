// app/(app)/purchase-orders/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PurchaseOrder, PurchaseOrderItem } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileText,
  Box,
  MoreHorizontal,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2
} from "lucide-react";
import { format, isSameMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Use Card component

// Type Definition
type POWithSummary = PurchaseOrder & {
  items: PurchaseOrderItem[];
  itemCount: number;
  totalAmount: number;
};

// Type สำหรับการ Sort
type SortConfig = {
  key: keyof POWithSummary | 'itemCount';
  direction: 'asc' | 'desc';
} | null;

export default function PurchaseOrderList() {
  const [purchaseOrders, setPurchaseOrders] = useState<POWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>("All Orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  
  // State สำหรับ Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [isExporting, setIsExporting] = useState(false);
  
  const router = useRouter();

  const getProgressStep = (status: string) => {
    switch (status) {
      case 'Pending': return 1; 
      case 'Sent': return 2;   
      case 'Fulfilled': return 3;
      case 'Cancelled': return 0;
      default: return 0;
    }
  };

  useEffect(() => {
    fetch("/api/purchase-orders/list")
      .then((res) => res.json())
      .then((data: POWithSummary[]) => {
        setPurchaseOrders(data);
      })
      .catch((err) => console.error("Error fetching POs:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleRowClick = (poNumber: string) => {
    router.push(`/purchase-orders/${poNumber}`);
  };

  const handleSort = (key: keyof POWithSummary | 'itemCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ฟังก์ชัน Export (Mockup)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. เรียก API
      const response = await fetch('/api/purchase-orders/export');
      
      if (!response.ok) throw new Error('Export failed');

      // 2. แปลง Response เป็น Blob (ไฟล์)
      const blob = await response.blob();
      
      // 3. สร้าง Link ชั่วคราวเพื่อกดดาวน์โหลด
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`; // ตั้งชื่อไฟล์
      document.body.appendChild(a);
      a.click();
      
      // 4. ล้างค่า
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error(error);
      alert("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Filter & Sort Logic ---
  const processedOrders = useMemo(() => {
    let filtered = [...purchaseOrders];

    if (activeTab !== "All Orders") {
      const statusMap: Record<string, string> = {
        "Pending": "Pending",
        "Arrived": "Fulfilled", 
        "In Progress": "Sent"
      };
      const targetStatus = statusMap[activeTab];
      if (targetStatus) {
          filtered = filtered.filter((po) => po.status === targetStatus);
      }
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((po) => 
        po.poNumber.toLowerCase().includes(lowerQuery)
      );
    }

    const now = new Date();
    if (dateFilter === 'this_month') {
        filtered = filtered.filter(po => isSameMonth(new Date(po.createdAt), now));
    } else if (dateFilter === 'last_month') {
        const lastMonth = subMonths(now, 1);
        filtered = filtered.filter(po => isSameMonth(new Date(po.createdAt), lastMonth));
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        
        if (sortConfig.key === 'createdAt') {
            return sortConfig.direction === 'asc' 
                ? new Date(aValue as Date).getTime() - new Date(bValue as Date).getTime()
                : new Date(bValue as Date).getTime() - new Date(aValue as Date).getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
        
        return sortConfig.direction === 'asc'
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
      });
    }

    return filtered;
  }, [purchaseOrders, activeTab, searchQuery, dateFilter, sortConfig]);

  const getItemsSummary = (items: PurchaseOrderItem[]) => {
      if (!items || items.length === 0) return "-";
      const firstItemName = items[0].itemName;
      const remainingCount = items.length - 1;
      
      if (remainingCount > 0) {
          return (
              <div className="flex flex-col">
                  <span className="font-medium text-foreground truncate max-w-[150px]" title={firstItemName}>{firstItemName}</span>
                  <span className="text-xs text-muted-foreground">+ {remainingCount} more items</span>
              </div>
          );
      }
      return <span className="font-medium text-foreground truncate max-w-[150px]" title={firstItemName}>{firstItemName}</span>;
  };

  const renderStatusBadge = (status: string) => {
    // Using styles matching Dashboard page
    switch (status) {
      case "Sent":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
             <Truck className="w-3 h-3 mr-1.5" /> In Progress
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
             <FileText className="w-3 h-3 mr-1.5" /> Draft
          </Badge>
        );
      case "Fulfilled":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
             <CheckCircle2 className="w-3 h-3 mr-1.5" /> Arrived
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-md px-2.5 py-1 text-xs font-medium">
             <XCircle className="w-3 h-3 mr-1.5" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-200">
             {status}
          </Badge>
        );
    }
  };

  const renderTimeline = (status: string) => {
    const currentStep = getProgressStep(status);
    // Matching colors to badges roughly
    return (
      <div className="flex items-center gap-1">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors", currentStep >= 1 ? "bg-slate-700 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-300")}>
            <Box className="w-3 h-3" />
        </div>
        <div className={cn("w-4 h-0.5 rounded-full", currentStep >= 2 ? "bg-slate-700" : "bg-slate-200")} />
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors", currentStep >= 2 ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-300")}>
            <Truck className="w-3 h-3" />
        </div>
        <div className={cn("w-4 h-0.5 rounded-full", currentStep >= 3 ? "bg-emerald-500" : "bg-slate-200")} />
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors", currentStep >= 3 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300")}>
            <CheckCircle2 className="w-3 h-3" />
        </div>
      </div>
    );
  };

  const SortableHead = ({ label, sortKey, className = "", align = "left" }: { label: string, sortKey: keyof POWithSummary | 'itemCount', className?: string, align?: "left"|"right"|"center" }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <TableHead className={className}>
            <button 
                onClick={() => handleSort(sortKey)}
                className={cn(
                    "flex items-center gap-1 hover:text-slate-700 transition-colors font-semibold text-xs uppercase tracking-wide text-slate-600", // Updated style
                    align === "right" && "ml-auto",
                    align === "center" && "mx-auto"
                )}
            >
                {label}
                {isSorted ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
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
    <div className="space-y-6 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Shipment Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
               Manage and track all your purchase orders.
            </p>
        </div>

        <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm" 
            onClick={handleExport}
            disabled={isExporting} 
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Download className="h-4 w-4 mr-2" />
            )}
            Export Data
        </Button>

      </div>

      {/* Main Content */}
      <Card className="border-slate-200 shadow-sm">
        {/* 1. Tabs & Search Row */}
        <div className="px-6 pt-5 pb-0 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-4">
            <div className="flex items-center gap-8 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {[
                    { name: 'All Orders', count: purchaseOrders.length },
                    { name: 'Pending', count: purchaseOrders.filter(p => p.status === 'Pending').length }, 
                    { name: 'In Progress', count: purchaseOrders.filter(p => p.status === 'Sent').length }, 
                    { name: 'Arrived', count: purchaseOrders.filter(p => p.status === 'Fulfilled').length }, 
                ].map((tab) => {
                    const isActive = activeTab === tab.name;
                    return (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={cn(
                                "pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
                                isActive 
                                    ? "border-orange-600 text-orange-700" 
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {tab.name}
                            <Badge variant="secondary" className={cn("ml-1 px-1.5 py-0 h-5 min-w-[1.5rem] text-[10px] rounded-full", isActive ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>
                                {tab.count}
                            </Badge>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* 2. Filters Toolbar */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between items-center bg-white">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search PO Number..." 
                    className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-orange-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 border-slate-200 bg-white text-sm">
                        <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" />
                        <SelectValue placeholder="Filter by Date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* 3. Table */}
        <CardContent className="p-0">
        <div className="relative w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <SortableHead label="Shipment ID" sortKey="poNumber" className="pl-6 h-11" />
                <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">Shipment Event</TableHead>
                <SortableHead label="Status" sortKey="status" className="h-11" />
                <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">Items Summary</TableHead>
                <SortableHead label="Date" sortKey="createdAt" className="h-11" />
                <SortableHead label="Total" sortKey="totalAmount" className="h-11 pr-6" align="right" />
                <TableHead className="w-[50px] h-11"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <p>No orders found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processedOrders.map((po) => (
                  <TableRow 
                    key={po.id} 
                    onClick={() => handleRowClick(po.poNumber)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors group border-b border-slate-100"
                  >
                    <TableCell className="pl-6 py-4 font-medium text-foreground text-sm">
                        {po.poNumber}
                    </TableCell>
                    <TableCell className="py-4">
                        {renderTimeline(po.status)}
                    </TableCell>
                    <TableCell className="py-4">
                        {renderStatusBadge(po.status)}
                    </TableCell>
                    <TableCell className="py-4 text-sm">
                        {getItemsSummary(po.items)}
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground text-sm">
                        {format(new Date(po.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4 font-medium text-foreground text-sm">
                      ฿{Number(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Footer / Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
            <div className="text-xs text-muted-foreground font-medium">
                Showing {processedOrders.length} of {purchaseOrders.length} orders
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200" disabled>Next</Button>
            </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}