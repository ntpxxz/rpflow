// app/(app)/procurement/review-quotation/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  Save,
  Package,
  FileText,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";

type ReviewItem = {
  id: string;
  itemName: string;
  detail: string | null;
  imageUrl: string | null;
  quantity: number;
  quantityOrdered: number;
  quotationNumber: string | null;
  quotedUnitPrice: string | number | null;
  rfq: { id: string; rfqNumber: string; createdAt: string } | null;
  request: {
    id: string;
    requesterName: string;
    user: { name: string | null } | null;
  };
};

export default function ReviewQuotationPage() {
  const router = useRouter();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // per-item editable fields
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/procurement/review-quotation")
      .then((res) => res.json())
      .then((data: ReviewItem[]) => {
        setItems(data);
        const initQuotes: Record<string, string> = {};
        const initPrices: Record<string, string> = {};
        data.forEach((item) => {
          initQuotes[item.id] = item.quotationNumber ?? "";
          initPrices[item.id] =
            item.quotedUnitPrice != null ? String(item.quotedUnitPrice) : "";
        });
        setQuotes(initQuotes);
        setPrices(initPrices);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Group items by quotation (rfqNumber)
  const groups = useMemo(() => {
    const map = new Map<string, { rfqNumber: string; createdAt: string | null; items: ReviewItem[] }>();
    for (const item of items) {
      const key = item.rfq?.rfqNumber ?? "No Quotation No.";
      if (!map.has(key)) {
        map.set(key, {
          rfqNumber: key,
          createdAt: item.rfq?.createdAt ?? null,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const handleSave = async () => {
    const payload = items.map((item) => ({
      id: item.id,
      quotationNumber: quotes[item.id] || null,
      quotedUnitPrice: prices[item.id] !== "" ? parseFloat(prices[item.id]) : null,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/procurement/review-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to save");
      alert("Quotation details saved successfully!");
      // reflect saved values locally
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          quotationNumber: quotes[item.id] || null,
          quotedUnitPrice: prices[item.id] !== "" ? parseFloat(prices[item.id]) : null,
        }))
      );
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isReviewed = (item: ReviewItem) =>
    (prices[item.id] ?? "") !== "" && (quotes[item.id] ?? "") !== "";

  const reviewedCount = items.filter(isReviewed).length;

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6 max-w mx-auto pb-24 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/procurement")}
          className="rounded-full hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Review Quotation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the quotation number and quoted unit price returned by the vendor for each item.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          No items awaiting quotation review.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.rfqNumber} className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 font-mono font-normal"
                >
                  {group.rfqNumber}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} item{group.items.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {group.items.map((item) => {
                  const qty = item.quantity - item.quantityOrdered;
                  return (
                    <Card
                      key={item.id}
                      className="group relative overflow-hidden border-slate-200 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row p-4 gap-5">
                        {/* Image */}
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.itemName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="h-7 w-7" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className="font-bold text-base text-foreground line-clamp-1"
                              title={item.itemName}
                            >
                              {item.itemName}
                            </h3>
                            {isReviewed(item) && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.detail || "No description"}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              <UserIcon className="h-3 w-3" />
                              {item.request.user?.name ?? item.request.requesterName}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              Qty: <span className="font-semibold text-slate-700">{qty}</span>
                            </span>
                          </div>
                        </div>

                        {/* Inputs */}
                        <div className="flex flex-col sm:flex-row gap-3 md:w-[360px] shrink-0">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-slate-500">Quotation No.</Label>
                            <Input
                              value={quotes[item.id] ?? ""}
                              placeholder="e.g. QT-2026-001"
                              onChange={(e) =>
                                setQuotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-slate-500">Quoted Unit Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={prices[item.id] ?? ""}
                              placeholder="0.00"
                              onChange={(e) =>
                                setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky action bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 backdrop-blur px-6 py-4">
          <div className="max-w mx-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {reviewedCount} of {items.length} items reviewed
            </span>
            <Button onClick={handleSave} disabled={saving} className="h-11 px-6">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Quotation Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
