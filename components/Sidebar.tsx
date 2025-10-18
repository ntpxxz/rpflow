// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { name: "Dashboard", href: "/" },
  { name: "Purchase", href: "/purchase" },
  { name: "Approval", href: "/approval" },
  { name: "Reports", href: "/reports" },
  { name: "Settings", href: "/settings" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

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
          "fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto"
        )}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-4 border-b">
            <div className="text-lg font-semibold text-blue-600">Purchase flow</div>
          </div>

          <nav className="p-4 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                  pathname === l.href ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {l.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-4 border-t">
            <div className="text-sm text-gray-500">Version 0.1</div>
          </div>
        </div>
      </aside>
    </>
  );
}
