// components/StatusBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Check, 
  X, 
  Clock, 
  ShoppingCart, 
  Package, 
  AlertCircle, 
  FileText 
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  const normalizedStatus = status.toLowerCase();

  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = <FileText className="w-3 h-3 mr-1.5" />;
  let label = status;

  switch (normalizedStatus) {
    // --- Positive / Completed ---
    case "approved":
    case "fulfilled":
      styles = "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      icon = <Check className="w-3 h-3 mr-1.5" />;
      label = "Approved";
      if (normalizedStatus === "fulfilled") label = "Fulfilled";
      break;

    // --- Negative / Cancelled ---
    case "rejected":
    case "cancelled":
      styles = "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
      icon = <X className="w-3 h-3 mr-1.5" />;
      label = normalizedStatus === "cancelled" ? "Cancelled" : "Rejected";
      break;

    // --- In Progress / Active ---
    case "ordered":
    case "sent": // สำหรับ PO
      styles = "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
      icon = <ShoppingCart className="w-3 h-3 mr-1.5" />;
      label = normalizedStatus === "sent" ? "In Progress" : "Ordered";
      break;

    case "received":
    case "arrived":
      styles = "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100";
      icon = <Package className="w-3 h-3 mr-1.5" />;
      label = "Received";
      break;

    // --- Pending / Waiting ---
    case "pending":
    case "approving":
      styles = "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50";
      icon = <Clock className="w-3 h-3 mr-1.5" />;
      label = "Pending";
      break;
      
    default:
      // Fallback
      styles = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
      label = status;
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("capitalize border px-2.5 py-0.5 rounded-md shadow-sm font-medium", styles, className)}
    >
      {icon}
      {label}
    </Badge>
  );
}