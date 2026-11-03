"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { MetricColumn } from "@/components/dashboard/metric-column";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    formatRecurringDamagePeriod,
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
import { RecurringBranchTable } from "./recurring-branch-table";
import { RecurringStoreSheet } from "./recurring-store-sheet";
import { RecurringStoreTable } from "./recurring-store-table";

const PAGE_PATH = "/dashboard/recurring-damage";

export function RecurringDamageView({
    isAdmin,
    branchOptions,
    availableYears,
    period,
    branchName,
    brand,
    branches,
    stores,
    showBranchList,
    loadError,
    initialStoreCode,
}: {
    isAdmin: boolean;
    branchOptions: string[];
    availableYears: number[];
    period: RecurringDamagePeriod;
    branchName: string;
    brand: StoreBrandFilter;
    branches: RecurringDamageBranchSummary[];
    stores: RecurringDamageStore[];
    showBranchList: boolean;
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
        [router, searchParams],
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

    // Tampilan semua cabang tidak memiliki data toko, jadi panel tidak dibuka.
    const activeStoreCode = showBranchList ? null : selectedStoreCode;
    const selectedStore = useMemo(
        () => stores.find((store) => store.storeCode === activeStoreCode) ?? null,
        [stores, activeStoreCode],
    );

    // Pertahankan toko terakhir agar isi panel tidak berkedip saat animasi tutup.
    const [lastStore, setLastStore] = useState<RecurringDamageStore | null>(null);
    if (selectedStore && selectedStore !== lastStore) setLastStore(selectedStore);

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
                                {!showBranchList && branchName ? (
                                    <Badge variant="outline">{branchName}</Badge>
                                ) : null}
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Toko dengan item checklist yang sama rusak lebih dari
                                1x pada periode terpilih.
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

                    <div className="overflow-hidden rounded-lg border bg-background">
                        <div className="grid">
                            <MetricColumn
                                label="Toko problematik"
                                value={loadError ? "-" : problematicCount.toString()}
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
                </div>
            </div>

            <div
                className={cn(
                    "p-4 lg:p-6",
                    isPending && "pointer-events-none opacity-60",
                )}
            >
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
                            onSelectStore={selectStore}
                        />
                    </div>
                )}
            </div>

            <RecurringStoreSheet
                open={selectedStore !== null}
                store={selectedStore ?? lastStore}
                period={period}
                onOpenChange={(open) => {
                    if (!open) selectStore(null);
                }}
            />
        </div>
    );
}
