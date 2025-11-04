// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "next-auth/react";

const links = [
  { name: "Dashboard", href: "/" },
  { name: "Request", href: "/purchase-requests/new" },
  { name: "Approval", href: "/approval" },
  { name: "Procurement", href: "/procurement" },
  { name: "Reports", href: "/reports" },
  { name: "Settings", href: "/settings" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}
const baseLinks = [
  { name: "Dashboard", href: "/" },
  { name: "Reports", href: "/reports" },
];

// 2. สร้าง Links ตาม Role
const requesterLinks = [
  { name: "Request", href: "/purchase-requests/new" },
  
];

const approverLinks = [
  { name: "Approval", href: "/approval" },
];

const procurementLinks = [
  { name: "Procurement", href: "/procurement" },
];


const adminLinks = [
  { name: "Settings", href: "/settings" },
];
export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession(); // 👈 3. ดึง Session

  // 4. รวม Links ทั้งหมดตามสิทธิ์
  let links = [
    ...baseLinks,
    ...requesterLinks,
    ...approverLinks,   
    ...procurementLinks,
    ...adminLinks      // (จากที่เราเคยเพิ่ม)
  ];

  {/*For Build*/}
  {/*let links = [...baseLinks];
  if (session?.user.role === "REQUESTER") {
    links = [...links, ...requesterLinks];
  }
  if (session?.user.role === "APPROVER") {
    links = [...links, ...approverLinks];
  }
  if (session?.user.role === "ADMIN") {
    links = [...links, ...requesterLinks, ...approverLinks, ...adminLinks];
  }*/}

  return (
    <>
      {/* Overlay for mobile when sidebar open */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 z-50 transform transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto"
        )}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-4 border-b dark:border-zinc-800">
            <div className="text-lg font-semibold text-blue-600">Purchase flow</div>
          </div>

          <nav className="p-4 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className={cn(
                  buttonVariants({ 
                    variant: pathname === l.href ? "secondary" : "ghost" 
                  }),
                  "w-full justify-start text-sm font-medium"
                )}
              >
                {l.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-4 border-t dark:border-zinc-800">
            <div className="text-sm text-gray-500">Version 0.1</div>
          </div>
        </div>
      </aside>
    </>
  );
}