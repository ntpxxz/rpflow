// app/(app)/admin/budget/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import {
    Loader2, Save, DollarSign, RotateCcw, History,
    ListFilter, ArrowUpRight, TrendingUp, Calendar,
    Layers, ChevronRight, AlertCircle, CheckCircle2,
    PieChart, ArrowRightLeft, LayoutGrid, Settings2,
    Activity, Wallet, Target, BarChart3, Plus, Search
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis
} from 'recharts';

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
    const [activeType, setActiveType] = useState("NORMAL");
    const [amount, setAmount] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<BudgetData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchBudget = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/budget?month=${month}&type=${activeType}`);
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
    }, [month, activeType]);

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
                body: JSON.stringify({ month, amount: Number(amount), type: activeType }),
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
        if (!confirm(`Are you sure you want to reset the ${activeType} budget for this month?`)) {
            return;
        }
        setResetting(true);
        try {
            const res = await fetch(`/api/budget?month=${month}&type=${activeType}`, {
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

    const filteredRequests = useMemo(() => {
        if (!currentBudget?.requests) return [];
        return currentBudget.requests.filter(req =>
            req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.requesterName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [currentBudget?.requests, searchQuery]);

    const chartData = useMemo(() => {
        if (!currentBudget?.history) return [];
        return [...currentBudget.history].reverse().map(h => ({
            name: format(parseISO(h.month + "-01"), "MMM"),
            amount: h.amount
        }));
    }, [currentBudget?.history]);

    const totalAllocated = currentBudget?.summary.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const currentSpent = currentBudget?.totalSpent || 0;
    const currentLimit = currentBudget?.budgetAmount || 0;
    const percentUsed = currentLimit > 0 ? (currentSpent / currentLimit) * 100 : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4 animate-in fade-in duration-500">

            {/* --- COMPACT HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-xl shadow-md">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Treasury
                        </h1>
                        <p className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            Budget Oversight & Control
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700">
                        <Calendar className="w-3.5 h-3.5 text-orange-600" />
                        <Input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-32 bg-transparent border-none shadow-none focus-visible:ring-0 font-bold text-xs text-slate-700 dark:text-slate-200 p-0 h-auto"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />

                    <div className="flex gap-1 p-0.5 bg-slate-50 dark:bg-zinc-800 rounded-xl">
                        {["NORMAL", "URGENT", "PROJECT"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveType(t)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider",
                                    activeType === t
                                        ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- COMPACT GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Allocated */}
                        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                        <Target className="w-4 h-4" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Allocated</span>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        ฿{currentLimit.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-500 mt-1">Monthly Limit</div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Spent */}
                        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Spent</span>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        ฿{currentSpent.toLocaleString()}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-700",
                                                    percentUsed > 90 ? "bg-red-500" : percentUsed > 70 ? "bg-orange-500" : "bg-emerald-500"
                                                )}
                                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{Math.round(percentUsed)}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Remaining */}
                        <Card className={cn(
                            "border-none shadow-sm rounded-2xl overflow-hidden transition-colors",
                            currentBudget?.remaining && currentBudget.remaining < 0
                                ? "bg-red-600 text-white"
                                : "bg-slate-900 text-white dark:bg-zinc-800"
                        )}>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Remaining</span>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold tracking-tight">
                                        ฿{currentBudget?.remaining.toLocaleString() || "0"}
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        {currentBudget?.remaining && currentBudget.remaining < 0 ? (
                                            <div className="flex items-center gap-1 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                                                <AlertCircle className="w-3 h-3" />
                                                EXCEEDED
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                                                <CheckCircle2 className="w-3 h-3" />
                                                WITHIN LIMIT
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold">Financial Trends</CardTitle>
                                <CardDescription className="text-[10px]">Historical allocation for {activeType}</CardDescription>
                            </div>
                            <BarChart3 className="w-4 h-4 text-slate-300" />
                        </CardHeader>
                        <CardContent className="p-5 pt-2">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                                            tickFormatter={(value) => `฿${value / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                fontSize: '10px',
                                                fontWeight: 700
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#ea580c"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorAmount)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Adjustment */}
                    <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-orange-600" />
                                Adjust Limit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Amount (THB)</Label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-300">฿</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="pl-6 bg-transparent border-none shadow-none focus-visible:ring-0 text-xl font-bold tracking-tight h-10"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || resetting}
                                    className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Update Budget
                                </Button>
                                <Button
                                    onClick={handleReset}
                                    disabled={saving || resetting || !currentBudget?.budgetAmount}
                                    variant="ghost"
                                    className="h-9 text-slate-400 hover:text-red-600 font-bold text-xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Reset to Zero
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                Month Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="px-3 pb-5 space-y-1">
                                {["NORMAL", "URGENT", "PROJECT"].map((t) => {
                                    const s = currentBudget?.summary.find(item => item.type === t);
                                    const isActive = activeType === t;
                                    return (
                                        <div
                                            key={t}
                                            onClick={() => setActiveType(t)}
                                            className={cn(
                                                "p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group",
                                                isActive
                                                    ? "bg-slate-900 text-white dark:bg-zinc-800 shadow-md"
                                                    : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]",
                                                    isActive ? "bg-white/10" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                                                )}>
                                                    {t.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-tight", isActive ? "text-white" : "text-slate-900 dark:text-slate-200")}>{t}</div>
                                                    <div className="text-[8px] font-medium text-slate-400">Category</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("text-xs font-bold", isActive ? "text-orange-400" : "text-slate-700 dark:text-slate-300")}>
                                                    ฿{s?.amount.toLocaleString() || "0"}
                                                </div>
                                                <ChevronRight className={cn("w-3 h-3 ml-auto transition-all", isActive ? "text-orange-400 translate-x-1" : "text-slate-300 opacity-0 group-hover:opacity-100")} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- Transaction Log --- */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ListFilter className="w-5 h-5 text-orange-600" />
                        Transactions
                    </h2>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm text-xs font-medium"
                        />
                    </div>
                </div>

                <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 dark:bg-zinc-800/50 border-none">
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-slate-400 py-4 pl-6">ID</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-slate-400 py-4">Requester</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-slate-400 py-4">Date</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-slate-400 py-4">Status</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-slate-400 py-4 text-right pr-6">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.length > 0 ? (
                                        filteredRequests.map((req) => (
                                            <TableRow key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/80 transition-colors border-b border-slate-50 dark:border-zinc-800 last:border-0 group">
                                                <TableCell className="py-4 pl-6">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-orange-600 transition-colors">
                                                        {req.id}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                                            {req.requesterName.charAt(0)}
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{req.requesterName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-slate-400 text-[10px] font-bold">
                                                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <StatusBadge status={req.status} />
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-6">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">฿{req.totalAmount.toLocaleString()}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <Search className="w-10 h-10 text-slate-400" />
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">No Results</p>
                                                        <p className="text-[10px] font-medium text-slate-500">Try adjusting your filters</p>
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
            </div>
        </div>
    );
}
