// components/Header.tsx
"use client";

import { Menu, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// นี่คือ Avatar ตัวอย่าง
const UserAvatar = () => (
  <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
    A
  </div>
);

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 no-print">
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Placeholder Search (เหมือนใน Mockup) */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="w-full max-w-sm pl-9 bg-slate-50 border-slate-200"
        />
      </div>

      {/* Right-side Icons & User */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserAvatar />
      </div>
    </header>
  );
}