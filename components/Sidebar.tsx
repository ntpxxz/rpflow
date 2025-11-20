// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  CheckSquare,
  ShoppingCart,
  PieChart,
  Settings,
  ClipboardList,
  Box,
  LogOut
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const baseLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Reports", href: "/reports", icon: PieChart },
];

const requesterLinks = [
  { name: "Request", href: "/purchase-requests/new", icon: FilePlus },
];

const approverLinks = [
  { name: "Approval", href: "/approval", icon: CheckSquare },
];

const procurementLinks = [
  { name: "Procurement", href: "/procurement", icon: ShoppingCart },
  { name: "PO List", href: "/purchase-orders", icon: ClipboardList },
];

const adminLinks = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  let links = [
    ...baseLinks,
    ...requesterLinks,
    ...approverLinks,
    ...procurementLinks,
    ...adminLinks,
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity no-print backdrop-blur-sm",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 transform transition-transform duration-300 ease-in-out no-print flex flex-col",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto"
        )}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
               <Box className="w-5 h-5" />
             </div>
             <span className="text-lg font-bold text-slate-900 tracking-tight">RPFlow</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
           <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Main Menu
           </div>
           
           {links.map((l) => {
              const Icon = l.icon;
              const isActive = pathname === l.href || pathname.startsWith(`${l.href}/`);
              
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-orange-50 text-[#FF6B00]" // Active State (Orange)
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900" // Inactive
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-[#FF6B00]" : "text-slate-400 group-hover:text-slate-600")} />
                  {l.name}
                </Link>
              );
            })}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-sidebar-border/50">
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
                Sign Out
            </button>
            <div className="mt-4 px-3 text-xs text-slate-400 text-center">
               v1.0.0 • © 2025 RPFlow
            </div>
        </div>
      </aside>
    </>
  );
}