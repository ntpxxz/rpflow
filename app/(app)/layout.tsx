// app/(app)/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-zinc-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* You can add a mobile header here if needed */}
        {/* <header className="md:hidden p-4">
          <button onClick={() => setSidebarOpen(true)}>Menu</button>
        </header> */}
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}