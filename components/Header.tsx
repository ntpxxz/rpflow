// components/Header.tsx
"use client";

import { Menu, Search, Bell, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSession, signOut } from "next-auth/react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = (user as any)?.role || "User";

  // ดึงตัวอักษรแรกของชื่อมาแสดงใน Avatar
  const userInitial = user?.name?.[0]?.toUpperCase() || "U";

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

      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="w-full max-w-sm pl-9 bg-slate-50 border-slate-200 focus-visible:ring-orange-500"
        />
      </div>

      {/* Right-side Icons & User Menu */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />

        {/* User Dropdown */}
        <Popover>
           <PopoverTrigger asChild>
              <Button variant="ghost" className="h-auto p-1 md:px-2 hover:bg-slate-100 rounded-full md:rounded-lg">
                 <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-orange-100 border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-orange-700 font-bold shadow-sm">
                        {userInitial}
                    </div>
                    
                    {/* User Info (Desktop only) */}
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name}</p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-1">{userRole}</p>
                    </div>
                    
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                 </div>
              </Button>
           </PopoverTrigger>
           
           <PopoverContent className="w-56 p-1 mr-4" align="end">
               <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  My Account
               </div>
               
               <div className="space-y-0.5">
                   <button className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-100 transition-colors text-left">
                      <UserIcon className="w-4 h-4 text-slate-400" /> 
                      Profile Settings
                   </button>
                   
                   <div className="h-[1px] bg-slate-100 my-1" />
                   
                   <button 
                     onClick={() => signOut({ callbackUrl: "/login" })}
                     className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition-colors text-left"
                   >
                      <LogOut className="w-4 h-4" /> 
                      Sign Out
                   </button>
               </div>
           </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}