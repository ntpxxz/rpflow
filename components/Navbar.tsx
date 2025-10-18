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
    <nav className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="text-xl font-bold text-blue-600">Purchase flow</div>

      <ul className="flex space-x-6">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "text-gray-600 hover:text-blue-600 font-medium",
                pathname === link.href && "text-blue-600 border-b-2 border-blue-600 pb-1"
              )}
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">Hello, Admin</span>
      </div>
    </nav>
  );
}
