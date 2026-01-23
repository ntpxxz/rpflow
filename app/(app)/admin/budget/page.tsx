// app/(app)/admin/budget/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Loader2, Save, DollarSign, RotateCcw, History,
    ListFilter, ArrowUpRight, TrendingUp, Calendar,
    Layers, ChevronRight, AlertCircle, CheckCircle2,
    PieChart, ArrowRightLeft, LayoutGrid
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetData {
    month: string;
    type: string;
    budgetAmount: number;
    totalSpent: number;
    remaining: number;
    requests: Array<{
        id: string;
        requesterName: string;
        totalAmount: number;
        status: string;
        createdAt: string;
        type: string;
    }>;
    history: Array<{
        month: string;
        amount: number;
    }>;
    summary: Array<{
        type: string;
        amount: number;
    }>;
}

export default function AdminBudgetPage() {
    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [type, setType] = useState("NORMAL");
    const [amount, setAmount] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<BudgetData | null>(null);

    const fetchBudget = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/budget?month=${month}&type=${type}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentBudget(data);
                setAmount(data.budgetAmount || "");
            }
        } catch (error) {
            console.error("Failed to fetch budget", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudget();
    }, [month, type]);

    const handleSave = async () => {
        if (amount === "" || Number(amount) < 0) {
            alert("Please enter a valid budget amount");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, amount: Number(amount), type }),
            });

            if (res.ok) {
                alert("Budget updated successfully!");
                fetchBudget();
            } else {
                throw new Error("Failed to update");
            }
        } catch (error) {
            alert("Error updating budget");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm(`Are you sure you want to reset the ${type} budget for this month?`)) {
            return;
        }
        setResetting(true);
        try {
            const res = await fetch(`/api/budget?month=${month}&type=${type}`, {
                method: "DELETE",
            });

            if (res.ok) {
                alert("Budget reset successfully!");
                setAmount("");
                fetchBudget();
            } else {
                throw new Error("Failed to reset");
            }
        } catch (error) {
            alert("Error resetting budget");
        } finally {
            setResetting(false);
        }
    };

    const totalAllocated = currentBudget?.summary.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded-lg" />
                        Budget Control Center
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage and monitor organization spending limits</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                    <div className="flex flex-col px-3 border-r border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Month</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{format(new Date(month + "-01"), "MMMM yyyy")}</span>
                    </div>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-40 bg-white dark:bg-zinc-900 border-none shadow-none focus-visible:ring-0 font-bold text-orange-600 cursor-pointer"
                    />
                </div>
            </div>

            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Sidebar: Configuration & Summary */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Quick Configuration */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl">
                        <CardHeader className="bg-slate-900 dark:bg-zinc-800 text-white pb-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-orange-400" />
                                Configuration
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-xs">Set limits for specific request types</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 -mt-4 bg-white dark:bg-zinc-900 rounded-t-2xl space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request Category</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-800 rounded-xl focus:ring-orange-500 font-bold">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NORMAL" className="font-bold">Normal Operations</SelectItem>
                                            <SelectItem value="URGENT" className="font-bold">Urgent / Emergency</SelectItem>
                                            <SelectItem value="PROJECT" className="font-bold">Project Based</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Limit (THB)</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg group-focus-within:text-orange-600 transition-colors">฿</div>
                                        <Input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                            placeholder="0.00"
                                            className="h-12 pl-10 bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-800 rounded-xl focus-visible:ring-orange-500 font-black text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || resetting}
                                    className="h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-200 dark:shadow-none transition-all active:scale-95"
                                >
                                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                    Update {type} Budget
                                </Button>
                                <Button
                                    onClick={handleReset}
                                    disabled={saving || resetting || !currentBudget?.budgetAmount}
                                    variant="ghost"
                                    className="h-10 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold rounded-xl transition-all"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reset to Zero
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Types Summary */}
                    <Card className="border border-slate-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                Monthly Summary
                                <Badge variant="secondary" className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 font-bold">฿{totalAllocated.toLocaleString()}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50 dark:divide-zinc-800">
                                {["NORMAL", "URGENT", "PROJECT"].map((t) => {
                                    const s = currentBudget?.summary.find(item => item.type === t);
                                    const isActive = type === t;
                                    return (
                                        <div
                                            key={t}
                                            className={cn(
                                                "px-6 py-4 flex items-center justify-between cursor-pointer transition-all group",
                                                isActive ? "bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-600" : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                                            )}
                                            onClick={() => setType(t)}
                                        >
                                            <div className="flex flex-col">
                                                <span className={cn("text-xs font-black tracking-tight uppercase", isActive ? "text-orange-700 dark:text-orange-400" : "text-slate-500")}>{t}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Category</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("text-sm font-black", isActive ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-slate-300")}>
                                                    ฿{s?.amount.toLocaleString() || "0"}
                                                </div>
                                                <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", isActive ? "text-orange-600 translate-x-1" : "text-slate-300 opacity-0 group-hover:opacity-100")} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content: Stats & Logs */}
                <div className="xl:col-span-3 space-y-8">

                    {/* High Impact Stats */}
                    {currentBudget && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <DollarSign className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Limit Allocated</span>
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                            <LayoutGrid className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black tracking-tighter">฿{currentBudget.budgetAmount.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-wider">For {type} Requests</div>
                                    </div>
                                    <div className="pt-2 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-full opacity-40" />
                                        </div>
                                        <span className="text-[10px] font-black">100%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <ArrowRightLeft className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Spent / Reserved</span>
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black tracking-tighter">฿{currentBudget.totalSpent.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-wider">{currentBudget.requests.length} Active Transactions</div>
                                    </div>
                                    <div className="pt-2 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-400 transition-all duration-1000"
                                                style={{ width: `${Math.min((currentBudget.totalSpent / (currentBudget.budgetAmount || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black">{Math.round((currentBudget.totalSpent / (currentBudget.budgetAmount || 1)) * 100)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn(
                                "rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group transition-colors duration-500",
                                currentBudget.remaining < 0
                                    ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-200 dark:shadow-none"
                                    : "bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-200 dark:shadow-none"
                            )}>
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    {currentBudget.remaining < 0 ? <AlertCircle className="w-32 h-32" /> : <CheckCircle2 className="w-32 h-32" />}
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Remaining Balance</span>
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                            <PieChart className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black tracking-tighter">฿{currentBudget.remaining.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-wider">Available to spend</div>
                                    </div>
                                    <div className="pt-2">
                                        {currentBudget.remaining < 0 ? (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg w-fit">
                                                <AlertCircle className="w-3 h-3" />
                                                BUDGET EXCEEDED
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg w-fit">
                                                <CheckCircle2 className="w-3 h-3" />
                                                WITHIN LIMITS
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs for Detailed Views */}
                    <Tabs defaultValue="usage" className="space-y-6">
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                            <TabsList className="bg-transparent gap-2">
                                <TabsTrigger value="usage" className="rounded-xl px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-800 transition-all">
                                    <ListFilter className="w-4 h-4 mr-2" />
                                    Usage Log
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-xl px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-800 transition-all">
                                    <History className="w-4 h-4 mr-2" />
                                    Trends
                                </TabsTrigger>
                            </TabsList>
                            <div className="hidden md:flex items-center gap-2 px-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Data</span>
                            </div>
                        </div>

                        <TabsContent value="usage" className="mt-0 outline-none">
                            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50 dark:bg-zinc-800/50 border-none">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-5 pl-8">Request ID</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-5">Requester</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-5">Date</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-5">Status</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-5 text-right pr-8">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {currentBudget?.requests && currentBudget.requests.length > 0 ? (
                                                    currentBudget.requests.map((req) => (
                                                        <TableRow key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/80 transition-colors border-b border-slate-50 dark:border-zinc-800 last:border-0 group">
                                                            <TableCell className="py-5 pl-8 font-black text-slate-900 dark:text-slate-200 group-hover:text-orange-600 transition-colors">
                                                                {req.id}
                                                            </TableCell>
                                                            <TableCell className="py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                                        {req.requesterName.charAt(0)}
                                                                    </div>
                                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{req.requesterName}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-5 text-slate-400 text-xs font-bold">
                                                                {format(new Date(req.createdAt), "MMM d, yyyy")}
                                                            </TableCell>
                                                            <TableCell className="py-5">
                                                                <StatusBadge status={req.status} />
                                                            </TableCell>
                                                            <TableCell className="py-5 text-right pr-8">
                                                                <span className="text-sm font-black text-slate-900 dark:text-white">฿{req.totalAmount.toLocaleString()}</span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="py-24 text-center">
                                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                                <div className="p-6 bg-slate-100 dark:bg-zinc-800 rounded-full">
                                                                    <ListFilter className="w-12 h-12 text-slate-400" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">No Activity Found</p>
                                                                    <p className="text-sm font-bold text-slate-500">No {type} requests recorded for this month</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentBudget?.history && currentBudget.history.length > 0 ? (
                                    currentBudget.history.map((h) => (
                                        <Card key={h.month} className="border-none shadow-lg bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all">
                                            <div className="h-2 bg-slate-100 dark:bg-zinc-800 group-hover:bg-orange-500 transition-colors" />
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Month</p>
                                                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                                                        {format(new Date(h.month + "-01"), "MMMM yyyy")}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit Set</p>
                                                    <p className="text-xl font-black text-orange-600">฿{h.amount.toLocaleString()}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                                        <p className="text-slate-400 font-bold italic">No historical data available for this category</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// Missing icon from lucide-react in previous import
function Settings2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 7h-9" />
            <path d="M14 17H5" />
            <circle cx="17" cy="17" r="3" />
            <circle cx="7" cy="7" r="3" />
        </svg>
    )
}
