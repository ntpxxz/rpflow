// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "next-auth/react";

// 1. 👈 Import ไอคอนจาก lucide-react
import {
  LayoutDashboard,
  FilePlus,
  CheckSquare,
  ShoppingCart,
  PieChart,
  Settings,
  ClipboardList,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

// 2. 👈 เพิ่ม 'icon' property ให้กับ links
const baseLinks = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
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

  // ... (ส่วน Logic for build ไม่ต้องแก้ไข) ...

  return (
    <>
      {/* ... (Overlay for mobile คงเดิม) ... */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity no-print",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-slate-900 text-white border-r border-slate-700 z-50 transform transition-transform no-print",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto"
        )}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          {/* ... (Logo คงเดิม) ... */}
          <div className="px-4 py-4 border-b border-slate-700">
            <div className="text-lg font-semibold text-white">Purchase flow</div>
          </div>

          <nav className="p-4 space-y-1">
            {links.map((l) => {
              // 3. 👈 ดึง Icon component ออกมาจาก link
              const Icon = l.icon; 
              
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                    }),
                    "w-full justify-start text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-700",
                    pathname === l.href && "bg-slate-700 text-white"
                  )}
                >
                  {/* 4. 👈 เพิ่มไอคอนที่นี่ */}
                  <Icon className="mr-3 h-5 w-5" /> 
                  {l.name}
                </Link>
              );
            })}
          </nav>

          {/* ... (Footer คงเดิม) ... */}
          <div className="mt-auto p-4 border-t border-slate-700">
            <div className="text-sm text-slate-400">Version 0.1</div>
          </div>
        </div>
      </aside>
    </>
  );
}