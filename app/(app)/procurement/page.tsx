// app/(app)/procurement/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; // 👈 useRouter
import { PurchaseRequest, User, RequestItem } from "@prisma/client";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
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
import { Zap, FileText, ArrowRight, FileQuestion, Package, FileCheck } from "lucide-react"; // เพิ่มไอคอน
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
type ProcurementItem = RequestItem & {
  isQuotationRequested: boolean; // รับค่ามาจาก DB
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
  const [itemQuotations, setItemQuotations] = useState<{[itemId: string]: string}>({});

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

  // ... (Logic การแบ่งกลุ่มและ Selection คงเดิม) ...
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
  
  const handleGroupSelect = (requestId: string, groupItems: ProcurementItem[], isCurrentlySelected: boolean, currentStatus: ProcurementItem['procurementStatus']) => {
    const selector = currentStatus === 'QUEUE' ? setSelectedQueueIds : setSelectedAwaitingPoIds;
    const itemIds = groupItems.map(item => item.id);
    if (isCurrentlySelected) selector(prev => prev.filter(id => !itemIds.includes(id)));
    else selector(prev => [...new Set([...prev, ...itemIds])]);
  };

  // 🔻 (แก้ไข) นำทางไปหน้า Request Quotation (New Page)
  const handleGoToRequestQuotation = () => {
    if (selectedQueueIds.length === 0) return;
    const idsParam = selectedQueueIds.join(",");
    router.push(`/procurement/request-quotation?ids=${idsParam}`);
  };

  // 🔻 (แก้ไข) นำทางไปหน้า Create PO (New Page)
  const handleGoToCreatePO = () => {
    if (selectedAwaitingPoIds.length === 0) return;
    const idsParam = selectedAwaitingPoIds.join(",");
    router.push(`/procurement/create-po?ids=${idsParam}`);
  };

  const handleMoveToQueue = () => {
    // ... (Logic ย้ายกลับ Queue เหมือนเดิม ถ้าต้องการ) ...
    // เพื่อความกระชับในตัวอย่างนี้ ผมขอละไว้ ถ้าคุณใช้ Logic เดิมก็ใส่กลับมาได้ครับ
    alert("Move back logic here");
  };
  
  const handleQuotationChange = (itemId: string, value: string) => {
    setItemQuotations((prev) => ({ ...prev, [itemId]: value }));
  };

  const renderTable = (items: ProcurementItem[], selectedIds: string[], currentStatus: ProcurementItem['procurementStatus'], groupedItems: GroupedItems) => {
    const allSelected = items.length > 0 && selectedIds.length === items.length;
    const someSelected = selectedIds.length > 0 && !allSelected;
    
    return (
      <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={() => handleSelectAll(currentStatus)} />
                </TableHead>
                <TableHead>Item</TableHead>
                <TableHead></TableHead>
                <TableHead>PR</TableHead>                
                <TableHead>Requestor</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="w-[200px]">Quotation No.</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Object.keys(groupedItems).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No items.</TableCell></TableRow>
            ) : (
                Object.entries(groupedItems).map(([requestId, groupItems]) => {
                    const allGroupSelected = groupItems.every(item => selectedIds.includes(item.id));
                    const someGroupSelected = groupItems.some(item => selectedIds.includes(item.id)) && !allGroupSelected;
                    return (
                        <React.Fragment key={requestId}>
                            {groupItems.map((item) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <TableRow key={item.id} data-state={isSelected ? "selected" : ""}>
                                        <TableCell><Checkbox checked={isSelected} onCheckedChange={() => handleItemSelect(item.id, currentStatus)} /></TableCell>
                                        <TableCell>
                                    <div className="relative w-28 h-28 rounded-lg overflow-hidden border bg-slate-50 shrink-0 self-center">
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Package className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.itemName}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.detail}</div>
                                        </TableCell>
                                        <TableCell className="text-sm"> {requestId} </TableCell>
                                        <TableCell className="text-sm">{item.request.user?.name || item.request.requesterName}</TableCell>
                                        <TableCell>{item.quantity - item.quantityOrdered}</TableCell>
                                        <TableCell>
                                            <Input
                                                placeholder="QT No."
                                                value={itemQuotations[item.id] || ""}
                                                onChange={(e) => handleQuotationChange(item.id, e.target.value)}
                                                disabled={currentStatus === 'QUEUE'} 
                                                className={cn("h-8", !isSelected && currentStatus === 'AWAITING_PO' && "opacity-50")}
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
    );
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">Procurement Queue</h1>
        <Tabs defaultValue="queue" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="queue" className="gap-2"><Zap className="h-4 w-4"/> 1. New Items ({queueItems.length})</TabsTrigger>
                <TabsTrigger value="awaiting_po" className="gap-2"><FileText className="h-4 w-4"/> 2. Ready for PO ({awaitingPoItems.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="queue">
                <Card>
                    <CardContent className="pt-6">{renderTable(queueItems, selectedQueueIds, 'QUEUE', groupedQueueItems)}</CardContent>
                    {queueItems.length > 0 && (
                        <CardFooter className="justify-end pt-6 gap-2">
                            <Button onClick={handleGoToRequestQuotation} disabled={selectedQueueIds.length === 0}>
                            <FileQuestion className="h-4 w-4"/>Generate RFQ ({selectedQueueIds.length}) 
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </TabsContent>

            <TabsContent value="awaiting_po">
                 <Card>
                    <CardContent className="pt-6">{renderTable(awaitingPoItems, selectedAwaitingPoIds, 'AWAITING_PO', groupedAwaitingPoItems)}</CardContent>
                    {awaitingPoItems.length > 0 && (
                        <CardFooter className="justify-between pt-6">
                            {/*<Button variant="outline" onClick={handleMoveToQueue} disabled={selectedAwaitingPoIds.length === 0}>Back to Queue</Button>*/}
                            {/* 🔻 ปุ่มไปหน้า Create PO */}
                            <Button onClick={handleGoToCreatePO} disabled={selectedAwaitingPoIds.length === 0}>
                            <FileCheck className="h-4 w-4"/> Create PO ({selectedAwaitingPoIds.length}) 
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}