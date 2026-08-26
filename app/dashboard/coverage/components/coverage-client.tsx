"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, PlusCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatJakartaDate } from "@/lib/time";
import type { BmsPreventiveCoverageResult } from "../../preventive/actions";

export function CoverageClient({ coverage }: { coverage: BmsPreventiveCoverageResult }) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStores = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];
        
        const allStores = [
            ...coverage.pending.map(s => ({ ...s, status: 'belum' })),
            ...coverage.completed.map(s => ({ ...s, status: 'sudah' }))
        ];
        
        return allStores.filter(store => 
            [store.storeCode, store.storeName].join(" ").toLowerCase().includes(query)
        );
    }, [searchQuery, coverage]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Cari kode atau nama toko..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 rounded-xl bg-muted/70 pl-11 pr-11 font-medium"
                />
                {searchQuery && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setSearchQuery("")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {searchQuery ? (
                <div className="space-y-3 mt-4">
                    {filteredStores.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            Tidak ada toko yang cocok dengan pencarian.
                        </div>
                    ) : (
                        filteredStores.map((store) => (
                            <Card key={store.storeCode} className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                        {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                    </div>
                                    {store.status === 'belum' ? (
                                        <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none shrink-0">
                                            Belum Preventif
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0">
                                            Sudah Preventif
                                        </Badge>
                                    )}
                                </div>
                                {store.status === 'belum' ? (
                                    <Button asChild size="sm" variant="outline" className="w-full mt-1 border-primary/50 text-primary hover:bg-primary/5">
                                        <Link href={`/reports/create?storeCode=${store.storeCode}`}>
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Buat Laporan Preventif
                                        </Link>
                                    </Button>
                                ) : (
                                    <div className="text-xs text-muted-foreground flex flex-col mt-1">
                                        <span>No: {store.reportNumber}</span>
                                        <span>Selesai: {store.doneAt ? formatJakartaDate(store.doneAt) : '-'}</span>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">
                            Belum ({coverage.pending.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            Sudah ({coverage.completed.length})
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pending" className="space-y-3 mt-4">
                        {coverage.pending.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Luar biasa! Semua toko sudah dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.pending.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none shrink-0">
                                            Belum Preventif
                                        </Badge>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="w-full mt-1 border-primary/50 text-primary hover:bg-primary/5">
                                        <Link href={`/reports/create?storeCode=${store.storeCode}`}>
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Buat Laporan Preventif
                                        </Link>
                                    </Button>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-3 mt-4">
                        {coverage.completed.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Belum ada toko yang selesai dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.completed.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0">
                                            Sudah Preventif
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex flex-col mt-1">
                                        <span>No: {store.reportNumber}</span>
                                        <span>Selesai: {store.doneAt ? formatJakartaDate(store.doneAt) : '-'}</span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
