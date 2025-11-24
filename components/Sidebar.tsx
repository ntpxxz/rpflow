// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  CheckSquare,
  ShoppingCart,
  ClipboardList,
  PieChart,
  Settings,
  Box,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

type MenuItem = {
  name: string;
  href: string;
  icon: any;
};

type MenuGroup = {
  label?: string;
  items: MenuItem[];
};

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const userRole = (session?.user as any)?.role?.toLowerCase() || "requester"; 

  const dashboardMenu: MenuItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const requesterMenu: MenuItem[] = [
    // เปลี่ยนชื่อให้ชัดเจนว่าเป็น Action การสร้าง
    { name: "Create Request", href: "/purchase-requests/new", icon: FilePlus },
    // เปลี่ยนชื่อให้สื่อถึงการติดตามสถานะ
    { name: "Track Requests", href: "/purchase-requests", icon: FileText },
  ];

  const approverMenu: MenuItem[] = [
    // เปลี่ยนชื่อให้รู้ว่าเป็นรายการที่ "รอ" เราอยู่
    { name: "Pending Approvals", href: "/approval", icon: CheckSquare },
  ];

  const procurementMenu: MenuItem[] = [
    // ใช้คำว่า Process เพื่อสื่อถึงงานที่ต้องทำ (Queue ฟังดู Passive ไป)
    { name: "Process Requisitions", href: "/procurement", icon: ShoppingCart },
    // เพิ่ม (PO) เพื่อความชัดเจน
    { name: "Purchase Orders (PO)", href: "/purchase-orders", icon: ClipboardList },
  ];

  const reportMenu: MenuItem[] = [
    { name: "Reports & Analytics", href: "/reports", icon: PieChart },
  ];

  const adminMenu: MenuItem[] = [
    { name: "System Settings", href: "/settings", icon: Settings },
  ];

  let menuGroups: MenuGroup[] = [];

  menuGroups.push({ items: dashboardMenu });

  const operationItems: MenuItem[] = [];
  operationItems.push(...requesterMenu);
  
  if (userRole === "admin" || userRole === "approver") {
    operationItems.push(...approverMenu);
  }

  if (userRole === "admin" || userRole === "purchaser") {
    operationItems.push(...procurementMenu);
  }

  if (operationItems.length > 0) {
    menuGroups.push({ label: "Operations", items: operationItems });
  }

  if (["admin", "purchaser", "approver"].includes(userRole)) {
    menuGroups.push({ label: "Insights", items: reportMenu });
  }

  if (userRole === "admin") {
    menuGroups.push({ label: "Administration", items: adminMenu });
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-zinc-950/50 z-40 md:hidden transition-opacity no-print backdrop-blur-sm",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out no-print flex flex-col shadow-lg md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-orange-200 shadow-md">
               <Box className="w-5 h-5" />
             </div>
             <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block leading-none">KHOBUY</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider">PROCUREMENT</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
           {menuGroups.map((group, groupIndex) => (
             <div key={groupIndex}>
                {group.label && (
                  <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                
                <div className="space-y-1">
                  {group.items.map((l) => {
                      const Icon = l.icon;
                      const isActive = 
                        pathname === l.href || 
                        (l.href !== '/' && 
                         pathname.startsWith(`${l.href}/`) && 
                         !(l.href === '/purchase-requests' && pathname === '/purchase-requests/new')
                        );
                      
                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                            isActive
                              ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-orange-500 rounded-r-full" />
                          )}

                          <Icon className={cn(
                            "w-5 h-5 transition-colors", 
                            isActive ? "text-orange-600 dark:text-orange-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                          )} />
                          <span className={cn(isActive && "font-semibold")}>{l.name}</span>
                        </Link>
                      );
                    })}
                </div>
             </div>
           ))}
        </div>
      </aside>
    </>
  );
}