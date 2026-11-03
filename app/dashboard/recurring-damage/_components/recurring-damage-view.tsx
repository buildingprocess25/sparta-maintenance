"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ChevronLeft, ListChecks, Loader2, Store, X } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { MetricColumn } from "@/components/dashboard/metric-column";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REPORT_CHECKLIST_ITEMS } from "@/lib/checklist-data";
import {
    formatRecurringDamagePeriod,
    type DamagedItemSummary,
    type RecurringDamageViewMode,
    type RecurringDamageBranchSummary,
    type RecurringDamagePeriod,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { cn } from "@/lib/utils";
import {
    RecurringDamageFilters,
    type RecurringDamageFilterChange,
} from "./recurring-damage-filters";
import { DamagedItemTable } from "./damaged-item-table";
import { RecurringBranchTable } from "./recurring-branch-table";
import { RecurringStoreSheet } from "./recurring-store-sheet";
import { RecurringStoreTable } from "./recurring-store-table";

const PAGE_PATH = "/dashboard/recurring-damage";

export function RecurringDamageView({
    view,
    itemSummary,
    isAdmin,
    branchOptions,
    availableYears,
    period,
    branchName,
    brand,
    branches,
    stores,
    showBranchList,
    focusItem,
    loadError,
    initialStoreCode,
}: {
    view: RecurringDamageViewMode;
    itemSummary: DamagedItemSummary | null;
    isAdmin: boolean;
    branchOptions: string[];
    availableYears: number[];
    period: RecurringDamagePeriod;
    branchName: string;
    brand: StoreBrandFilter;
    branches: RecurringDamageBranchSummary[];
    stores: RecurringDamageStore[];
    showBranchList: boolean;
    focusItem: { itemId: string; itemName: string } | null;
    loadError: boolean;
    initialStoreCode: string | null;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(
        initialStoreCode,
    );

    // Filter berubah → render ulang di server dengan query baru.
    const navigate = useCallback(
        (change: RecurringDamageFilterChange) => {
            const params = new URLSearchParams(searchParams.toString());
            // Tulis tab aktif secara eksplisit agar tautan lama (tanpa `view`) tetap di tabnya
            // setelah `item`/`store` terhapus.
            params.set("view", view);
            for (const [key, value] of Object.entries(change)) {
                if (value === undefined || value === "all" || value === "ALL") {
                    params.delete(key);
                } else {
                    params.set(key, String(value));
                }
            }
            params.delete("store");
            setSelectedStoreCode(null);

            const query = params.toString();
            startTransition(() => {
                router.replace(query ? `${PAGE_PATH}?${query}` : PAGE_PATH, {
                    scroll: false,
                });
            });
        },
        [router, searchParams, view],
    );

    // Data toko sudah ada di klien; panel cukup memperbarui URL tanpa render ulang.
    const selectStore = useCallback((storeCode: string | null) => {
        setSelectedStoreCode(storeCode);
        const params = new URLSearchParams(window.location.search);
        if (storeCode) {
            params.set("store", storeCode);
        } else {
            params.delete("store");
        }
        const query = params.toString();
        window.history.replaceState(null, "", query ? `${PAGE_PATH}?${query}` : PAGE_PATH);
    }, []);

    // Tab per item dan tampilan semua cabang tidak memiliki data toko, jadi panel tidak dibuka.
    const activeStoreCode = view === "item" || showBranchList ? null : selectedStoreCode;
    const selectedStore = useMemo(
        () => stores.find((store) => store.storeCode === activeStoreCode) ?? null,
        [stores, activeStoreCode],
    );

    // Pertahankan isi panel terakhir (termasuk kondisi kosong) agar tidak berkedip saat animasi tutup.
    const [lastStore, setLastStore] = useState<RecurringDamageStore | null>(null);
    if (activeStoreCode !== null && selectedStore !== lastStore) setLastStore(selectedStore);

    const problematicCount = showBranchList
        ? branches.reduce((total, branch) => total + branch.problematicStoreCount, 0)
        : stores.length;

    return (
        <div className="flex min-h-full flex-col bg-muted/30">
            <div className="border-b bg-background px-4 py-3 lg:px-6">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    {formatRecurringDamagePeriod(period)}
                                </Badge>
                                {branchName && branchName !== "all" ? (
                                    <Badge variant="outline">{branchName}</Badge>
                                ) : null}
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {view === "item"
                                    ? "Jumlah kejadian rusak per item checklist pada periode terpilih."
                                    : "Toko dengan item checklist yang sama rusak lebih dari 1x pada periode terpilih."}
                            </p>
                        </div>
                        <RecurringDamageFilters
                            isAdmin={isAdmin}
                            branchOptions={branchOptions}
                            availableYears={availableYears}
                            period={period}
                            branchName={branchName}
                            brand={brand}
                            onChange={navigate}
                        />
                    </div>

                    {view === "item" ? (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="grid md:grid-cols-3">
                                <MetricColumn
                                    label="Total kejadian rusak"
                                    value={
                                        itemSummary
                                            ? `${itemSummary.totalDamageCount.toLocaleString("id-ID")} kali`
                                            : "-"
                                    }
                                />
                                <MetricColumn
                                    label="Item terdampak"
                                    value={
                                        itemSummary
                                            ? `${itemSummary.affectedItemCount.toLocaleString("id-ID")} dari ${REPORT_CHECKLIST_ITEMS.length.toLocaleString("id-ID")} item`
                                            : "-"
                                    }
                                />
                                <MetricColumn
                                    label="Toko terdampak"
                                    value={
                                        itemSummary
                                            ? `${itemSummary.affectedStoreCount.toLocaleString("id-ID")} toko`
                                            : "-"
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="grid">
                                <MetricColumn
                                    label={
                                        focusItem
                                            ? `Jumlah toko dengan ${focusItem.itemId} rusak berulang`
                                            : "Jumlah toko dengan kerusakan berulang"
                                    }
                                    value={
                                        loadError
                                            ? "-"
                                            : `${problematicCount.toLocaleString("id-ID")} toko`
                                    }
                                    tone={
                                        loadError
                                            ? "default"
                                            : problematicCount > 0
                                              ? "bad"
                                              : "good"
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Tabs
                value={view}
                onValueChange={(value) =>
                    navigate(
                        value === "item"
                            ? { view: "item", item: undefined }
                            : { view: "store" },
                    )
                }
                activationMode="manual"
                className="gap-0"
            >
                <div className="border-b bg-background px-4 pt-2 lg:px-6">
                    <TabsList variant="line" className="h-8 w-max justify-start rounded-none p-0">
                        <TabsTrigger value="item" className="h-8 flex-none px-3 text-xs">
                            <ListChecks data-icon="inline-start" />
                            Per item
                        </TabsTrigger>
                        <TabsTrigger value="store" className="h-8 flex-none px-3 text-xs">
                            <Store data-icon="inline-start" />
                            Toko rusak berulang
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div
                    className={cn(
                        "p-4 lg:p-6",
                        isPending && "pointer-events-none opacity-60",
                    )}
                >
                    <TabsContent value="item" className="mt-0">
                        {loadError || !itemSummary ? (
                            <div className="overflow-hidden rounded-lg border bg-background">
                                <EmptyTable
                                    icon={AlertCircle}
                                    title="Gagal memuat data"
                                    description="Data kerusakan per item tidak dapat dimuat. Silakan coba lagi."
                                />
                            </div>
                        ) : (
                            <DamagedItemTable
                                items={itemSummary.items}
                                onSelectItem={(itemId) =>
                                    navigate({ view: "store", item: itemId })
                                }
                            />
                        )}
                    </TabsContent>
                    <TabsContent value="store" className="mt-0">
                        {focusItem && !loadError ? (
                            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                                <span className="text-muted-foreground">Filter item:</span>
                                <Badge variant="outline">
                                    {focusItem.itemId} · {focusItem.itemName}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate({ item: undefined })}
                                >
                                    <X data-icon="inline-start" />
                                    Hapus filter
                                </Button>
                            </div>
                        ) : null}
                        {loadError ? (
                            <div className="overflow-hidden rounded-lg border bg-background">
                                <EmptyTable
                                    icon={AlertCircle}
                                    title="Gagal memuat data"
                                    description="Data kerusakan berulang tidak dapat dimuat. Silakan coba lagi."
                                />
                            </div>
                        ) : showBranchList ? (
                            <RecurringBranchTable
                                branches={branches}
                                itemFocused={focusItem !== null}
                                onSelectBranch={(name) => navigate({ branch: name })}
                            />
                        ) : (
                            <div className="flex flex-col gap-3">
                                {isAdmin ? (
                                    <div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate({ branch: "all" })}
                                        >
                                            <ChevronLeft data-icon="inline-start" />
                                            Semua cabang
                                        </Button>
                                    </div>
                                ) : null}
                                <RecurringStoreTable
                                    key={branchName}
                                    stores={stores}
                                    itemFocused={focusItem !== null}
                                    onSelectStore={selectStore}
                                />
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>

            <RecurringStoreSheet
                open={activeStoreCode !== null}
                store={activeStoreCode !== null ? selectedStore : lastStore}
                period={period}
                itemFocused={focusItem !== null}
                onOpenChange={(open) => {
                    if (!open) selectStore(null);
                }}
            />
        </div>
    );
}
