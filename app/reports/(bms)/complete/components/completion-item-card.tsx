"use client";

import { Fragment, useEffect, useState } from "react";
import {
    Camera,
    ChevronDown,
    MapPin,
    Plus,
    Store,
    Trash2,
    ZoomIn,
} from "lucide-react";
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
import { LocalNotesTextarea } from "../../create/components/local-notes-textarea";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import type {
    CompletionItemState,
    LocalPhoto,
    MaterialStoreEntry,
    RealisasiEntry,
} from "../types";
import { realisasiGrandTotal, realisasiTotal } from "../types";

// ─── Re-export types so existing imports keep working ─────────────────────────
export type { CompletionItemState } from "../types";
export { createInitialItemState } from "../types";

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
    const fmt = (n: number) => (n ? formatIDR(n) : "");
    const [local, setLocal] = useState(fmt(value));

    useEffect(() => {
        setLocal(fmt(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

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

// ─── Photo Thumbnails ─────────────────────────────────────────────────────────

function PhotoThumbnails({
    photos,
    onRemove,
    onPreview,
    variant = "full",
}: {
    photos: LocalPhoto[];
    onRemove: (id: string) => void;
    onPreview: (url: string) => void;
    /** "full" = full-width (after photos), "thumb" = small squares (receipts) */
    variant?: "full" | "thumb";
}) {
    if (photos.length === 0) return null;

    if (variant === "thumb") {
        return (
            <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p) => (
                    <div key={p.id} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={p.previewUrl}
                            alt="Foto"
                            className="h-20 w-20 object-cover rounded-lg border-2 border-green-200 cursor-zoom-in"
                            onClick={() => onPreview(p.previewUrl)}
                        />
                        <button
                            type="button"
                            onClick={() => onRemove(p.id)}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-2">
            {photos.map((p) => (
                <div key={p.id} className="relative group w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={p.previewUrl}
                        alt="Foto"
                        className="w-full h-auto rounded-lg border-2 border-green-200 cursor-zoom-in block"
                        onClick={() => onPreview(p.previewUrl)}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Realisasi Table ──────────────────────────────────────────────────────────

function RealisasiTable({
    entries,
    onChange,
}: {
    entries: RealisasiEntry[];
    onChange: (entries: RealisasiEntry[]) => void;
}) {
    const update = (
        id: string,
        field: keyof RealisasiEntry,
        value: string | number,
    ) =>
        onChange(
            entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
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
            },
        ]);

    const grandTotal = realisasiGrandTotal(entries);

    return (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30">
                        <TableHead className="w-8">No</TableHead>
                        <TableHead className="min-w-40">Nama Barang</TableHead>
                        <TableHead className="min-w-18 w-18">Jml</TableHead>
                        <TableHead className="w-28">Satuan</TableHead>
                        <TableHead className="min-w-28">Harga</TableHead>
                        <TableHead className="w-28">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry, idx) => (
                        <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground text-sm">
                                {idx + 1}
                            </TableCell>
                            <TableCell>
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
                                    className="h-8"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={entry.quantity || ""}
                                    onChange={(e) =>
                                        update(
                                            entry.id,
                                            "quantity",
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                    className="h-8"
                                />
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-full justify-between text-left font-normal"
                                        >
                                            {entry.unit || "Pilih"}
                                            <ChevronDown className="h-3 w-3 opacity-50" />
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
                            <TableCell>
                                <PriceInput
                                    value={entry.price}
                                    onCommit={(v) =>
                                        update(entry.id, "price", v)
                                    }
                                    className="h-8"
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                                Rp {formatIDR(realisasiTotal(entry))}
                            </TableCell>
                            <TableCell>
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
                        <TableCell colSpan={7}>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-primary hover:text-primary hover:bg-primary/10"
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
                                className="text-right text-sm"
                            >
                                Total :
                            </TableCell>
                            <TableCell className="text-right text-sm text-primary">
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

// ─── Material Store Rows ──────────────────────────────────────────────────────

function MaterialStoreRows({
    stores,
    onChange,
}: {
    stores: MaterialStoreEntry[];
    onChange: (stores: MaterialStoreEntry[]) => void;
}) {
    const update = (id: string, field: "name" | "city", value: string) =>
        onChange(
            stores.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
        );

    const remove = (id: string) => onChange(stores.filter((s) => s.id !== id));

    const add = () =>
        onChange([...stores, { id: genId(), name: "", city: "" }]);

    return (
        <div className="space-y-2">
            {stores.map((store, idx) => (
                <Fragment key={store.id}>
                    {stores.length > 1 && (
                        <p className="text-xs text-muted-foreground font-medium">
                            Toko {idx + 1}
                        </p>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                                placeholder="Nama toko (contoh: Toko Bangunan Jaya)"
                                value={store.name}
                                onChange={(e) =>
                                    update(store.id, "name", e.target.value)
                                }
                            />
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Kota (contoh: Tangerang)"
                                    value={store.city}
                                    onChange={(e) =>
                                        update(store.id, "city", e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {stores.length > 1 && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => remove(store.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </Fragment>
            ))}
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary hover:bg-primary/10 mt-1"
                onClick={add}
            >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Toko
            </Button>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CompletionItemCardProps {
    item: ReportItemJson;
    estimations: MaterialEstimationJson[];
    state: CompletionItemState;
    onChange: (patch: Partial<CompletionItemState>) => void;
    /** Called when user wants to open camera for after photo */
    onOpenCamera: (itemId: string, type: "after") => void;
    /** Called when user taps a thumbnail to preview it fullscreen */
    onPreview: (url: string) => void;
}

// ─── Card Component ───────────────────────────────────────────────────────────

export function CompletionItemCard({
    item,
    estimations,
    state,
    onChange,
    onOpenCamera,
    onPreview,
}: CompletionItemCardProps) {
    const beforeImages = item.images ?? (item.photoUrl ? [item.photoUrl] : []);
    const estimationTotal = estimations.reduce((s, e) => s + e.totalPrice, 0);
    const grandTotal = realisasiGrandTotal(state.realisasiEntries);

    const fmt = (n: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(n);

    return (
        <div
            id={`item-${item.itemId}`}
            className="space-y-4 p-3 bg-background rounded-md border transition-all duration-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20 focus-within:shadow-lg focus-within:shadow-primary/20"
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

            {/* ─── Foto Sebelum / Sesudah ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                {/* Foto Sebelum */}
                <div>
                    <Label className="text-sm">Foto Sebelum</Label>
                    {beforeImages.length > 0 ? (
                        <div className="mt-2 flex flex-col gap-1.5">
                            {beforeImages.map((url) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <div
                                    key={url}
                                    className="relative group cursor-zoom-in w-full"
                                    onClick={() => onPreview(url)}
                                >
                                    <img
                                        src={url}
                                        alt="Sebelum"
                                        className="w-full aspect-video object-cover rounded-lg border-2 border-muted"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                            Tidak ada foto sebelum
                        </p>
                    )}
                </div>

                {/* Foto Sesudah */}
                <div>
                    <Label className="text-sm">
                        Foto Sesudah <span className="text-destructive">*</span>
                    </Label>
                    <PhotoThumbnails
                        photos={state.afterPhotos}
                        onRemove={(id) =>
                            onChange({
                                afterPhotos: state.afterPhotos.filter(
                                    (p) => p.id !== id,
                                ),
                            })
                        }
                        onPreview={onPreview}
                    />
                    {state.afterPhotos.length === 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="mt-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:text-blue-700"
                            onClick={() => onOpenCamera(item.itemId, "after")}
                        >
                            <Camera className="mr-1.5 h-4 w-4" />
                            Buka Kamera
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── Estimasi & Realisasi ────────────────────────────────── */}
            <div className="pt-2 border-t space-y-3">
                {/* Estimasi Sebelumnya (read-only reference) */}
                {estimationTotal > 0 && (
                    <div>
                        <Label className="text-sm text-muted-foreground">
                            Estimasi Sebelumnya
                        </Label>
                        <div className="mt-1 space-y-0.5 text-xs bg-muted/40 rounded-md p-2">
                            {estimations.map((e, i) => (
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
                            <div className="border-t border-muted-foreground/20 pt-1 flex justify-between font-semibold text-foreground">
                                <span>Total Estimasi</span>
                                <span>{fmt(estimationTotal)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Realisasi Biaya — editable table */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">
                            Realisasi Biaya{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                    </div>
                    <RealisasiTable
                        entries={state.realisasiEntries}
                        onChange={(entries) =>
                            onChange({ realisasiEntries: entries })
                        }
                    />
                </div>
            </div>

            {/* ─── Catatan Penyelesaian ─────────────────────────────────── */}
            <div className="pt-2 border-t">
                <LocalNotesTextarea
                    initialValue={state.notes}
                    onCommit={(v) => onChange({ notes: v })}
                />
            </div>
        </div>
    );
}
