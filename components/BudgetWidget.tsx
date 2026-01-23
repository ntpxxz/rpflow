// components/BudgetWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, AlertCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetInfo {
    type: string;
    budgetAmount: number;
    totalSpent: number;
    remaining: number;
}

export default function BudgetWidget() {
    const [budgets, setBudgets] = useState<BudgetInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBudgets = async () => {
            try {
                const types = ["NORMAL", "URGENT", "PROJECT"];
                const month = format(new Date(), "yyyy-MM");

                const results = await Promise.all(
                    types.map(async (type) => {
                        const res = await fetch(`/api/budget?month=${month}&type=${type}`);
                        if (res.ok) {
                            const data = await res.json();
                            // We show it if a budget is set OR if there's spending
                            if (data.budgetAmount > 0 || data.totalSpent > 0) {
                                return {
                                    type,
                                    budgetAmount: data.budgetAmount,
                                    totalSpent: data.totalSpent,
                                    remaining: data.remaining
                                };
                            }
                        }
                        return null;
                    })
                );

                const activeBudgets = results.filter((b): b is BudgetInfo => b !== null);
                setBudgets(activeBudgets);
            } catch (err) {
                console.error("Failed to fetch budgets", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBudgets();
    }, []);

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>;

    // If no budgets are set at all, show a placeholder for NORMAL
    const displayBudgets = budgets.length > 0 ? budgets : [{
        type: "NORMAL",
        budgetAmount: 0,
        totalSpent: 0,
        remaining: 0
    }];

    const totalRemaining = displayBudgets.reduce((sum, b) => sum + b.remaining, 0);
    const totalBudget = displayBudgets.reduce((sum, b) => sum + b.budgetAmount, 0);
    const totalSpent = displayBudgets.reduce((sum, b) => sum + b.totalSpent, 0);
    const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="mt-auto p-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-1">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Budget Overview</span>
                    </div>
                    {displayBudgets.length > 1 && (
                        <span className="text-[9px] font-bold text-slate-400">TOTAL: ฿{totalRemaining.toLocaleString()}</span>
                    )}
                </div>

                {displayBudgets.length > 1 && (
                    <div className="bg-slate-900 dark:bg-zinc-800 rounded-xl p-3 shadow-sm border border-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Combined Monthly</span>
                            <span className="text-[9px] text-slate-500 font-medium">{format(new Date(), "MMM yyyy")}</span>
                        </div>
                        <div className="flex items-baseline justify-between mb-1">
                            <span className="text-sm font-bold tracking-tight text-white">
                                ฿{totalRemaining.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">total left</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out",
                                    totalRemaining < 0 ? "bg-red-500" : totalPercent > 80 ? "bg-orange-500" : "bg-blue-500"
                                )}
                                style={{ width: `${Math.min(totalPercent, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {displayBudgets.map((budget) => {
                    const percentUsed = budget.budgetAmount > 0 ? (budget.totalSpent / budget.budgetAmount) * 100 : 0;
                    const isOverBudget = budget.remaining < 0;
                    const isWarning = percentUsed > 80 && !isOverBudget;

                    return (
                        <div key={budget.type} className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={cn(
                                    "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                    budget.type === "NORMAL" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                                        budget.type === "URGENT" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
                                            "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                                )}>
                                    {budget.type}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">{format(new Date(), "MMM yyyy")}</span>
                            </div>

                            <div className="flex items-baseline justify-between mb-1">
                                <span className={cn(
                                    "text-sm font-bold tracking-tight",
                                    isOverBudget ? "text-red-600" : isWarning ? "text-orange-600" : "text-slate-900 dark:text-white"
                                )}>
                                    ฿{budget.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">remaining</span>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1 mb-1.5 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700 ease-out",
                                        isOverBudget ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                />
                            </div>

                            {isOverBudget && (
                                <div className="flex items-center gap-1 text-[8px] text-red-600 font-bold bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/20">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>OVER BUDGET</span>
                                </div>
                            )}

                            {!isOverBudget && isWarning && (
                                <div className="flex items-center gap-1 text-[8px] text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/10 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/20">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>APPROACHING LIMIT</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
