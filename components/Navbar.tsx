"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Dashboard", href: "/" },
  { name: "Purchase", href: "/purchase" },
  { name: "Approval", href: "/approval" },
  { name: "Reports", href: "/reports" },
  { name: "Settings", href: "/settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between bg-card border-b border-border px-6 py-3 shadow-sm">
      <div className="text-xl font-bold text-primary flex items-center gap-2">
        <span>🎄</span> Purchase flow
      </div>

      <ul className="flex space-x-6">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "text-muted-foreground hover:text-primary font-medium transition-colors",
                pathname === link.href && "text-primary border-b-2 border-primary pb-1"
              )}
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">Hello, Admin 🎅</span>
      </div>
    </nav>
  );
}
