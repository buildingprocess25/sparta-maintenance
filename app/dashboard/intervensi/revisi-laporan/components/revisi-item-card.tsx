"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { unitOptions } from "@/lib/checklist-data";
import { LocalNotesTextarea } from "@/app/reports/(bms)/create/components/local-notes-textarea";
import type { ReportItemJson } from "@/types/report";
import type { RevisedItemData } from "../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatIDR(n: number): string {
    return n.toLocaleString("id-ID");
}

// ─── Price Input ──────────────────────────────────────────────────────────────

function PriceInput({
    value,
    onCommit,
    className,
}: {
    value: number;
    onCommit: (v: number) => void;
    className?: string;
}) {
    const fmt = (n: number) =>
        Number.isFinite(n) ? formatIDR(Math.max(0, n)) : "";
    const [local, setLocal] = useState(fmt(value));

    return (
        <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={local}
            onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const num = parseInt(raw, 10) || 0;
                setLocal(num ? formatIDR(num) : raw);
                onCommit(num);
            }}
            onBlur={() => setLocal(fmt(value))}
            className={className}
        />
    );
}

// ─── Realisasi Table ──────────────────────────────────────────────────────────

// Extend RealisasiItem with client-only ID for React keys
export type ClientRealisasiEntry = RevisedItemData["realisasiItems"][0] & {
    id: string;
};

function RealisasiTable({
    entries,
    onChange,
}: {
    entries: ClientRealisasiEntry[];
    onChange: (entries: ClientRealisasiEntry[]) => void;
}) {
    const update = (
        id: string,
        field: keyof ClientRealisasiEntry,
        value: string | number,
    ) =>
        onChange(
            entries.map((e) => {
                if (e.id !== id) return e;
                const updated = { ...e, [field]: value };
                updated.totalPrice = updated.quantity * updated.price;
                return updated;
            }),
        );

    const remove = (id: string) => onChange(entries.filter((e) => e.id !== id));

    const add = () =>
        onChange([
            ...entries,
            {
                id: genId(),
                materialName: "",
                quantity: 1,
                unit: "pcs",
                price: 0,
                totalPrice: 0,
            },
        ]);

    const grandTotal = entries.reduce((s, e) => s + e.totalPrice, 0);

    return (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30">
                        <TableHead className="w-8 text-xs h-8">No</TableHead>
                        <TableHead className="min-w-40 text-xs h-8">
                            Nama Barang
                        </TableHead>
                        <TableHead className="min-w-18 w-18 text-xs h-8">
                            Jml
                        </TableHead>
                        <TableHead className="w-24 text-xs h-8">
                            Satuan
                        </TableHead>
                        <TableHead className="min-w-28 text-xs h-8">
                            Harga
                        </TableHead>
                        <TableHead className="w-28 text-xs h-8">
                            Total
                        </TableHead>
                        <TableHead className="w-10 h-8"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry, idx) => (
                        <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground text-sm py-2">
                                {idx + 1}
                            </TableCell>
                            <TableCell className="py-2">
                                <Input
                                    placeholder="Nama barang"
                                    value={entry.materialName}
                                    onChange={(e) =>
                                        update(
                                            entry.id,
                                            "materialName",
                                            e.target.value,
                                        )
                                    }
                                    className="h-8 text-sm"
                                />
                            </TableCell>
                            <TableCell className="py-2">
                                <Input
                                    type="number"
                                    min="0"
                                    value={entry.quantity || ""}
                                    onChange={(e) =>
                                        update(
                                            entry.id,
                                            "quantity",
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                    className="h-8 text-sm"
                                />
                            </TableCell>
                            <TableCell className="py-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-full justify-between text-left font-normal text-sm px-2"
                                        >
                                            <span className="truncate mr-1">
                                                {entry.unit || "Pilih"}
                                            </span>
                                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="max-h-48 overflow-y-auto">
                                        {unitOptions.map((u) => (
                                            <DropdownMenuItem
                                                key={u}
                                                onSelect={() =>
                                                    update(entry.id, "unit", u)
                                                }
                                            >
                                                {u}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell className="py-2">
                                <PriceInput
                                    value={entry.price}
                                    onCommit={(v) =>
                                        update(entry.id, "price", v)
                                    }
                                    className="h-8 text-sm"
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm py-2">
                                Rp {formatIDR(entry.totalPrice)}
                            </TableCell>
                            <TableCell className="py-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => remove(entry.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}

                    {/* Add row */}
                    <TableRow className="hover:bg-muted/20">
                        <TableCell colSpan={7} className="py-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-primary hover:text-primary hover:bg-primary/10 h-8"
                                onClick={add}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Tambah Barang
                            </Button>
                        </TableCell>
                    </TableRow>

                    {/* Grand total */}
                    {entries.length > 0 && (
                        <TableRow className="bg-primary/10 font-bold">
                            <TableCell
                                colSpan={5}
                                className="text-right text-sm py-2"
                            >
                                Total :
                            </TableCell>
                            <TableCell className="text-right text-sm text-primary py-2">
                                Rp {formatIDR(grandTotal)}
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RevisiItemCardProps {
    item: ReportItemJson;
    state: RevisedItemData;
    onChange: (patch: Partial<RevisedItemData>) => void;
}

// ─── Card Component ───────────────────────────────────────────────────────────

export function RevisiItemCard({
    item,
    state,
    onChange,
}: RevisiItemCardProps) {
    const previousRealisasi = item.realisasiItems ?? [];
    const previousRealisasiTotal = previousRealisasi.reduce(
        (s, e) => s + e.totalPrice,
        0,
    );

    const fmt = (n: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(n);

    // Provide default client IDs for realisasiItems
    const entriesWithIds: ClientRealisasiEntry[] = state.realisasiItems.map(
        (r, idx) => ({
            ...r,
            id: (r as ClientRealisasiEntry).id || `entry-${idx}-${genId()}`,
        }),
    ) as ClientRealisasiEntry[];

    return (
        <div
            id={`item-${item.itemId}`}
            className="space-y-4 p-4 bg-background rounded-lg border shadow-sm transition-all duration-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20"
        >
            {/* Item header */}
            <div>
                <p className="font-medium text-sm">
                    {item.itemId}. {item.itemName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {item.categoryName}
                    {item.condition === "RUSAK" && (
                        <span className="ml-2 text-destructive font-medium">
                            Rusak
                        </span>
                    )}
                    {item.preventiveCondition === "NOT_OK" && (
                        <span className="ml-2 text-destructive font-medium">
                            Not OK
                        </span>
                    )}
                </p>
            </div>

            {/* ─── Estimasi & Realisasi ────────────────────────────────── */}
            <div className="pt-3 border-t space-y-4">
                {/* Realisasi sebelumnya (read-only reference) */}
                {previousRealisasiTotal > 0 && (
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">
                            Realisasi Sebelumnya
                        </Label>
                        <div className="space-y-1 text-xs bg-muted/40 rounded-md p-2.5 border">
                            {previousRealisasi.map((e, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between gap-2 text-muted-foreground"
                                >
                                    <span className="truncate">
                                        {e.materialName} ({e.quantity} {e.unit})
                                    </span>
                                    <span className="shrink-0 font-medium text-foreground">
                                        {fmt(e.totalPrice)}
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-muted-foreground/20 pt-1.5 mt-1.5 flex justify-between font-semibold text-foreground">
                                <span>Total Realisasi Sebelumnya</span>
                                <span>{fmt(previousRealisasiTotal)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Realisasi Biaya — editable table */}
                <div>
                    <Label className="text-sm mb-2 block font-medium">
                        Revisi Realisasi Biaya{" "}
                        <span className="text-destructive">*</span>
                    </Label>
                    <RealisasiTable
                        entries={entriesWithIds}
                        onChange={(newEntries) =>
                            onChange({ realisasiItems: newEntries })
                        }
                    />
                </div>
            </div>

            {/* ─── Catatan Penyelesaian ─────────────────────────────────── */}
            <div className="pt-3 border-t">
                <LocalNotesTextarea
                    initialValue={state.completionNotes ?? ""}
                    onCommit={(v) => onChange({ completionNotes: v })}
                />
            </div>
        </div>
    );
}
