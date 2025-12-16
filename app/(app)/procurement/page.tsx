// app/(app)/procurement/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RequestItem } from "@prisma/client";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Zap,
    FileText,
    FileQuestion,
    Package,
    FileCheck,
    Loader2,
    ArrowRight,
    Search,
    ArrowUpDown
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React from "react";
import Image from "next/image";
import { format } from "date-fns";

type ProcurementItem = RequestItem & {
    isQuotationRequested: boolean;
    request: {
        id: string;
        requesterName: string | null;
        user: {
            name: string;
        } | null;
        createdAt: Date;
    };
    procurementStatus: 'QUEUE' | 'AWAITING_PO';
};

type GroupedItems = {
    [requestId: string]: ProcurementItem[];
};

export default function ProcurementPage() {
    const router = useRouter();
    const [itemsToOrder, setItemsToOrder] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
    const [selectedAwaitingPoIds, setSelectedAwaitingPoIds] = useState<string[]>([]);
    const [itemQuotations, setItemQuotations] = useState<{ [itemId: string]: string }>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = () => {
        setLoading(true);
        fetch("/api/procurement/queue")
            .then((res) => res.json())
            .then((data: ProcurementItem[]) => {
                const initialItems: ProcurementItem[] = data.map(item => ({
                    ...item,
                    procurementStatus: item.isQuotationRequested ? 'AWAITING_PO' : 'QUEUE',
                    request: {
                        ...(item as any).request,
                        createdAt: new Date((item as any).request.createdAt || new Date()),
                    }
                })) as ProcurementItem[];
                setItemsToOrder(initialItems);
            })
            .catch((err) => console.error("Error fetching procurement items:", err))
            .finally(() => {
                setLoading(false);
            });
    };

    const queueItems = useMemo(() => itemsToOrder.filter(item => item.procurementStatus === 'QUEUE'), [itemsToOrder]);
    const awaitingPoItems = useMemo(() => itemsToOrder.filter(item => item.procurementStatus === 'AWAITING_PO'), [itemsToOrder]);

    const groupedQueueItems = useMemo(() => {
        return queueItems.reduce((acc: GroupedItems, item) => {
            const requestId = item.request.id;
            if (!acc[requestId]) acc[requestId] = [];
            acc[requestId].push(item);
            return acc;
        }, {});
    }, [queueItems]);

    const groupedAwaitingPoItems = useMemo(() => {
        return awaitingPoItems.reduce((acc: GroupedItems, item) => {
            const requestId = item.request.id;
            if (!acc[requestId]) acc[requestId] = [];
            acc[requestId].push(item);
            return acc;
        }, {});
    }, [awaitingPoItems]);

    const handleItemSelect = (itemId: string, currentStatus: ProcurementItem['procurementStatus']) => {
        const selector = currentStatus === 'QUEUE' ? setSelectedQueueIds : setSelectedAwaitingPoIds;
        selector((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]);
    };

    const handleSelectAll = (currentStatus: ProcurementItem['procurementStatus']) => {
        const items = currentStatus === 'QUEUE' ? queueItems : awaitingPoItems;
        const selectedIds = currentStatus === 'QUEUE' ? selectedQueueIds : selectedAwaitingPoIds;
        const selector = currentStatus === 'QUEUE' ? setSelectedQueueIds : setSelectedAwaitingPoIds;
        if (selectedIds.length === items.length) selector([]);
        else selector(items.map((item) => item.id));
    };

    const handleGoToRequestQuotation = () => {
        if (selectedQueueIds.length === 0) return;
        const idsParam = selectedQueueIds.join(",");
        router.push(`/procurement/request-quotation?ids=${idsParam}`);
    };

    const handleGoToCreatePO = () => {
        if (selectedAwaitingPoIds.length === 0) return;
        const idsParam = selectedAwaitingPoIds.join(",");
        router.push(`/procurement/create-po?ids=${idsParam}`);
    };

    const handleQuotationChange = (itemId: string, value: string) => {
        setItemQuotations((prev) => ({ ...prev, [itemId]: value }));
    };

    const handleSort = (key: string) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const renderTable = (items: ProcurementItem[], selectedIds: string[], currentStatus: ProcurementItem['procurementStatus'], groupedItems: GroupedItems) => {
        const allSelected = items.length > 0 && selectedIds.length === items.length;
        const someSelected = selectedIds.length > 0 && !allSelected;

        // Sort groups
        const sortedGroups = Object.entries(groupedItems).sort(([, itemsA], [, itemsB]) => {
            if (sortConfig.key === 'date') {
                const dateA = new Date(itemsA[0].request.createdAt).getTime();
                const dateB = new Date(itemsB[0].request.createdAt).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (sortConfig.key === 'itemName') {
                const nameA = itemsA[0].itemName.toLowerCase();
                const nameB = itemsB[0].itemName.toLowerCase();
                if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }
            return 0;
        });

        return (
            <div className="relative w-full overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                            <TableHead className="w-[50px] h-11 px-4">
                                <Checkbox
                                    checked={allSelected}
                                    // @ts-ignore
                                    indeterminate={someSelected}
                                    onCheckedChange={() => handleSelectAll(currentStatus)}
                                    className="border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                />
                            </TableHead>
                            <TableHead
                                className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('itemName')}
                            >
                                <div className="flex items-center gap-1">
                                    Items
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-1">
                                    Request Info
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">Requester</TableHead>
                            <TableHead className="h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">Qty</TableHead>
                            <TableHead className="w-[200px] h-11 text-xs font-semibold text-slate-600 uppercase tracking-wide">Quotation No.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.keys(groupedItems).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Package className="w-8 h-8 text-slate-300" />
                                        <p>No items in this queue.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedGroups.map(([requestId, groupItems]) => {
                                return (
                                    <React.Fragment key={requestId}>
                                        {groupItems.map((item) => {
                                            const isSelected = selectedIds.includes(item.id);
                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    data-state={isSelected ? "selected" : ""}
                                                    className="group hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                                                >
                                                    <TableCell className="py-3 px-4">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleItemSelect(item.id, currentStatus)}
                                                            className="border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-100 bg-white shrink-0 shadow-sm">
                                                                {item.imageUrl ? (
                                                                    <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                                        <Package className="h-5 w-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-foreground text-sm">{item.itemName}</div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{item.detail || "No details"}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-sm font-medium text-slate-600">
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="bg-slate-50 font-mono text-xs w-fit">
                                                                {requestId}
                                                            </Badge>
                                                            <span className="text-xs text-slate-400">
                                                                {format(new Date(groupItems[0].request.createdAt), "dd MMM yyyy")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-sm text-foreground">
                                                        {item.request.user?.name || item.request.requesterName}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-sm font-medium text-foreground">
                                                        {item.quantity - item.quantityOrdered}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Input
                                                            placeholder="QT No."
                                                            value={itemQuotations[item.id] || ""}
                                                            onChange={(e) => handleQuotationChange(item.id, e.target.value)}
                                                            disabled={currentStatus === 'QUEUE'}
                                                            className={cn(
                                                                "h-9 bg-white border-slate-200 text-sm focus-visible:ring-orange-500",
                                                                !isSelected && currentStatus === 'AWAITING_PO' && "opacity-50"
                                                            )}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 font-sans text-slate-900">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Procurement Queue</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage items waiting for quotation and purchase orders.
                    </p>
                </div>
            </div>

            {/* Tabs & Content */}
            <Tabs defaultValue="queue" className="w-full space-y-6">
                <div className="flex items-center">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger
                            value="queue"
                            className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
                        >
                            <Zap className="h-4 w-4" /> New Items
                            <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700 text-[10px] h-5 px-1.5">{queueItems.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="awaiting_po"
                            className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                        >
                            <FileText className="h-4 w-4" /> Ready for PO
                            <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700 text-[10px] h-5 px-1.5">{awaitingPoItems.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="queue" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-500" />
                                Items Queue
                            </CardTitle>
                            <CardDescription>Select items to generate a Request for Quotation (RFQ).</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {renderTable(queueItems, selectedQueueIds, 'QUEUE', groupedQueueItems)}
                        </CardContent>
                        {queueItems.length > 0 && (
                            <CardFooter className="justify-between border-t border-slate-100 bg-slate-50/30 p-4">
                                <div className="text-xs text-muted-foreground">
                                    {selectedQueueIds.length} items selected
                                </div>
                                <Button
                                    onClick={handleGoToRequestQuotation}
                                    disabled={selectedQueueIds.length === 0}
                                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                                >
                                    <FileQuestion className="h-4 w-4 mr-2" />Generate RFQ
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="awaiting_po" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-blue-500" />
                                Ready for Purchase
                            </CardTitle>
                            <CardDescription>Select items that have quotations to create a Purchase Order.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {renderTable(awaitingPoItems, selectedAwaitingPoIds, 'AWAITING_PO', groupedAwaitingPoItems)}
                        </CardContent>
                        {awaitingPoItems.length > 0 && (
                            <CardFooter className="justify-between border-t border-slate-100 bg-slate-50/30 p-4">
                                <div className="text-xs text-muted-foreground">
                                    {selectedAwaitingPoIds.length} items selected
                                </div>
                                <Button
                                    onClick={handleGoToCreatePO}
                                    disabled={selectedAwaitingPoIds.length === 0}
                                    className="text-white shadow-sm"
                                >
                                    <FileCheck className="h-4 w-4 mr-2" /> Create Purchase Order
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}