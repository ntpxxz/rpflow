// components/BudgetWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BudgetWidget() {
    const [budget, setBudget] = useState<{ budgetAmount: number; totalSpent: number; remaining: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/budget?month=${format(new Date(), "yyyy-MM")}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch budget");
                return res.json();
            })
            .then((data) => {
                if (data && typeof data.remaining === 'number') {
                    setBudget(data);
                } else {
                    setBudget(null);
                }
            })
            .catch((err) => {
                console.error(err);
                setBudget(null);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>;
    if (!budget || typeof budget.remaining !== 'number' || budget.budgetAmount === 0) return null;

    const percentUsed = budget.budgetAmount > 0 ? (budget.totalSpent / budget.budgetAmount) * 100 : 0;
    const isOverBudget = budget.remaining < 0;

    return (
        <div className="mt-auto p-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Budget</span>
                    <span className="text-[10px] text-slate-400">{format(new Date(), "MMM yyyy")}</span>
                </div>

                <div className="flex items-end justify-between mb-1">
                    <span className={cn("text-lg font-bold", isOverBudget ? "text-red-600" : "text-slate-900 dark:text-white")}>
                        ฿{budget.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">left</span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                        className={cn("h-1.5 rounded-full transition-all duration-500", isOverBudget ? "bg-red-500" : "bg-emerald-500")}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                </div>

                {isOverBudget && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3" />
                        <span>Budget Exceeded</span>
                    </div>
                )}
            </div>
        </div>
    );
}
