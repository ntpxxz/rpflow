// app/(app)/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // 👈 2. เปลี่ยนสีพื้นหลังหลักเป็น bg-slate-50
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* 👈 3. เพิ่ม Header ที่นี่ */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 ">
          {children}
        </main>
      </div>
    </div>
  );
}