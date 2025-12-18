// app/(app)/admin/budget/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Loader2, Save, DollarSign, RotateCcw } from "lucide-react";

export default function AdminBudgetPage() {
    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [amount, setAmount] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<{ budgetAmount: number; totalSpent: number; remaining: number } | null>(null);

    const fetchBudget = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/budget?month=${month}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentBudget(data);
                setAmount(data.budgetAmount);
            }
        } catch (error) {
            console.error("Failed to fetch budget", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudget();
    }, [month]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, amount: Number(amount) }),
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
        if (!confirm("Are you sure you want to reset the budget for this month? This will remove the budget limit.")) {
            return;
        }
        setResetting(true);
        try {
            const res = await fetch(`/api/budget?month=${month}`, {
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Monthly Budget Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Set Budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Select Month</Label>
                            <Input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Budget Amount (THB)</Label>
                            <Input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="Enter amount..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={handleSave} disabled={saving || resetting} className="bg-orange-600 hover:bg-orange-700 text-white flex-1">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Budget
                        </Button>
                        <Button onClick={handleReset} disabled={saving || resetting} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                            {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                            Reset Budget
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {currentBudget && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-blue-600">Total Budget</div>
                            <div className="text-2xl font-bold text-blue-900">฿{currentBudget.budgetAmount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-100">
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-red-600">Used / Reserved</div>
                            <div className="text-2xl font-bold text-red-900">฿{currentBudget.totalSpent.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className={currentBudget.remaining < 0 ? "bg-red-100 border-red-200" : "bg-emerald-50 border-emerald-100"}>
                        <CardContent className="pt-6">
                            <div className={currentBudget.remaining < 0 ? "text-sm font-medium text-red-700" : "text-sm font-medium text-emerald-600"}>Remaining</div>
                            <div className={currentBudget.remaining < 0 ? "text-2xl font-bold text-red-900" : "text-2xl font-bold text-emerald-900"}>
                                ฿{currentBudget.remaining.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
