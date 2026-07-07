"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Trash2,
    ChevronDown,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { unitOptions, type ChecklistItem } from "@/lib/checklist-data";
import type { BmsItemGroup } from "./types";

/** Format angka dengan titik sebagai separator ribuan: 50000 → "50.000" */
function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return "";
    return value.toLocaleString("id-ID");
}

/** Parse string berformat "50.000" → 50000 */
function parseFormattedNumber(formatted: string): number {
    const cleaned = formatted.replace(/\./g, "").replace(/[^0-9]/g, "");
    return parseInt(cleaned, 10) || 0;
}

/** Input harga dengan local state — commit ke parent setiap perubahan */
function PriceInput({
    value,
    onCommit,
    className,
}: {
    value: number;
    onCommit: (value: number) => void;
    className?: string;
}) {
    const [localValue, setLocalValue] = useState(formatNumber(value));

    // Sync jika value dari parent berubah (misal restore draft)
    useEffect(() => {
        setLocalValue(formatNumber(value));
    }, [value]);

    return (
        <Input
            type="text"
            inputMode="numeric"
            value={localValue}
            onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const num = parseInt(raw, 10) || 0;
                setLocalValue(num ? num.toLocaleString("id-ID") : raw);
                onCommit(num);
            }}
            onBlur={() => {
                const num = parseFormattedNumber(localValue);
                setLocalValue(formatNumber(num));
            }}
            className={className}
        />
    );
}

interface BmsEstimationStepProps {
    bmsItems: Map<string, BmsItemGroup>;
    bmsItemsList: ChecklistItem[];
    rekananItems: ChecklistItem[];
    grandTotalBms: number;
    store: string;
    storeCode: string;
    isSubmitDialogOpen: boolean;
    setIsSubmitDialogOpen: (open: boolean) => void;
    onAddBmsEntry: (itemId: string) => void;
    onUpdateBmsEntry: (
        itemId: string,
        entryId: string,
        field: "itemName" | "quantity" | "unit" | "price",
        value: string | number,
    ) => void;
    onRemoveBmsEntry: (itemId: string, entryId: string) => void;
    onBack: () => void;
    onSubmit: () => void;
}

export function BmsEstimationStep({
    bmsItems,
    bmsItemsList,
    rekananItems,
    grandTotalBms,
    store,
    storeCode,
    isSubmitDialogOpen,
    setIsSubmitDialogOpen,
    onAddBmsEntry,
    onUpdateBmsEntry,
    onRemoveBmsEntry,
    onBack,
    onSubmit,
}: BmsEstimationStepProps) {
    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <div className="flex w-full flex-col gap-4">
                {bmsItems.size > 0 && (
                    <Card size="sm">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Estimasi Harga BMS ({bmsItemsList.length} item)
                            </CardTitle>
                            <CardDescription>
                                Tambahkan barang untuk setiap item rusak
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                {Array.from(bmsItems.entries()).map(
                                    ([itemId, itemGroup], idx) => {
                                        const subtotal =
                                            itemGroup.entries.reduce(
                                                (sum, entry) =>
                                                    sum + entry.total,
                                                0,
                                            );

                                        return (
                                            <div
                                                key={itemId}
                                                id={`bms-${itemId}`}
                                                className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-primary">
                                                            Item {idx + 1}
                                                        </p>
                                                        <h3 className="text-sm font-semibold leading-snug">
                                                            {
                                                                itemGroup
                                                                    .checklistItem
                                                                    .name
                                                            }
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                itemGroup.categoryTitle
                                                            }
                                                        </p>
                                                    </div>
                                                    <p className="shrink-0 text-right text-sm font-semibold">
                                                        Rp{" "}
                                                        {subtotal.toLocaleString(
                                                            "id-ID",
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    {itemGroup.entries.map(
                                                        (entry) => (
                                                            <div
                                                                key={entry.id}
                                                                id={`bms-${itemId}-${entry.id}`}
                                                                className="flex flex-col gap-2 rounded-lg bg-background p-3"
                                                            >
                                                                <Input
                                                                    type="text"
                                                                    placeholder="Nama barang"
                                                                    value={
                                                                        entry.itemName
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        onUpdateBmsEntry(
                                                                            itemId,
                                                                            entry.id,
                                                                            "itemName",
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                />
                                                                <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="Jml"
                                                                        value={
                                                                            entry.quantity ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            onUpdateBmsEntry(
                                                                                itemId,
                                                                                entry.id,
                                                                                "quantity",
                                                                                parseFloat(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                ) ||
                                                                                    0,
                                                                            )
                                                                        }
                                                                    />
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                className="w-full justify-between"
                                                                            >
                                                                                {entry.unit ||
                                                                                    "Satuan"}
                                                                                <ChevronDown data-icon="inline-end" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className="max-h-48 overflow-y-auto">
                                                                            {unitOptions.map(
                                                                                (
                                                                                    unitOption,
                                                                                ) => (
                                                                                    <DropdownMenuItem
                                                                                        key={
                                                                                            unitOption
                                                                                        }
                                                                                        onSelect={() =>
                                                                                            onUpdateBmsEntry(
                                                                                                itemId,
                                                                                                entry.id,
                                                                                                "unit",
                                                                                                unitOption,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            unitOption
                                                                                        }
                                                                                    </DropdownMenuItem>
                                                                                ),
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                                                    <PriceInput
                                                                        value={
                                                                            entry.price
                                                                        }
                                                                        onCommit={(
                                                                            num,
                                                                        ) =>
                                                                            onUpdateBmsEntry(
                                                                                itemId,
                                                                                entry.id,
                                                                                "price",
                                                                                num,
                                                                            )
                                                                        }
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="text-destructive"
                                                                        onClick={() =>
                                                                            onRemoveBmsEntry(
                                                                                itemId,
                                                                                entry.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 />
                                                                    </Button>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        Total
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        Rp{" "}
                                                                        {entry.total.toLocaleString(
                                                                            "id-ID",
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onAddBmsEntry(itemId)
                                                    }
                                                >
                                                    <Plus data-icon="inline-start" />
                                                    Tambah barang
                                                </Button>
                                            </div>
                                        );
                                    },
                                )}

                                <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3">
                                    <span className="text-sm font-semibold">
                                        Total Keseluruhan
                                    </span>
                                    <span className="font-bold text-primary">
                                        Rp {grandTotalBms.toLocaleString("id-ID")}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Rekanan Items */}
                {rekananItems.length > 0 && (
                    <Card size="sm">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Item Rekanan ({rekananItems.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                {rekananItems.map((item, i) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-2 rounded-lg bg-muted/40 p-2 text-sm"
                                    >
                                        <span className="text-muted-foreground">
                                            {i + 1}.
                                        </span>
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-12px_40px_rgb(15_23_42/0.08)] backdrop-blur-xl">
                <ButtonGroup className="w-full">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onBack}
                    >
                        Kembali
                    </Button>
                    <AlertDialog
                        open={isSubmitDialogOpen}
                        onOpenChange={setIsSubmitDialogOpen}
                    >
                        <AlertDialogTrigger asChild>
                            <Button className="flex-1">Submit Laporan</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle data-icon="inline-start" />
                                    Konfirmasi Submit Laporan
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Apakah Anda yakin ingin submit laporan ini?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-3">
                                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Toko:
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {storeCode} - {store}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Item Rusak:
                                        </span>
                                        <span className="font-medium text-red-600">
                                            {bmsItemsList.length +
                                                rekananItems.length}{" "}
                                            item
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Handler BMS:
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {bmsItemsList.length} item
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Handler Rekanan:
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {rekananItems.length} item
                                        </span>
                                    </div>
                                    {grandTotalBms > 0 && (
                                        <div className="flex justify-between pt-2 border-t">
                                            <span className="text-muted-foreground">
                                                Total Biaya BMS:
                                            </span>
                                            <span className="font-bold text-primary">
                                                Rp{" "}
                                                {grandTotalBms.toLocaleString(
                                                    "id-ID",
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Setelah submit, laporan akan dikirim untuk
                                    proses approval.
                                </p>
                            </div>
                            <AlertDialogFooter className="flex-row justify-end grid grid-cols-2 gap-2">
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onSubmit}
                                    className="bg-primary"
                                >
                                    <CheckCircle data-icon="inline-start" />
                                    Ya, Submit
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </ButtonGroup>
            </div>
        </div>
    );
}
