"use client";

import { Fragment, useState, useEffect } from "react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    if (!value) return "";
    return value.toLocaleString("id-ID");
}

/** Parse string berformat "50.000" → 50000 */
function parseFormattedNumber(formatted: string): number {
    const cleaned = formatted.replace(/\./g, "").replace(/[^0-9]/g, "");
    return parseInt(cleaned, 10) || 0;
}

/** Input harga dengan local state — hanya commit ke parent saat blur */
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
            placeholder="0"
            value={localValue}
            onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const num = parseInt(raw, 10) || 0;
                setLocalValue(num ? num.toLocaleString("id-ID") : raw);
            }}
            onBlur={() => {
                const num = parseFormattedNumber(localValue);
                onCommit(num);
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
    isSubmitDialogOpen,
    setIsSubmitDialogOpen,
    onAddBmsEntry,
    onUpdateBmsEntry,
    onRemoveBmsEntry,
    onBack,
    onSubmit,
}: BmsEstimationStepProps) {
    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full gap-4 md:gap-8">
            <div className="w-full space-y-6">
                {/* BMS Estimation Table */}
                {bmsItems.size > 0 && (
                    <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                        <CardHeader className="px-0 md:px-6">
                            <CardTitle className="text-base">
                                Estimasi Harga BMS ({bmsItemsList.length} item)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Tambahkan barang untuk setiap item rusak
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 md:px-6">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="min-w-8">
                                                No
                                            </TableHead>
                                            <TableHead className="min-w-60">
                                                Item
                                            </TableHead>
                                            <TableHead className="min-w-16">
                                                Jml
                                            </TableHead>
                                            <TableHead className="min-w-32">
                                                Satuan
                                            </TableHead>
                                            <TableHead className="min-w-30">
                                                Harga
                                            </TableHead>
                                            <TableHead className="min-w-32">
                                                Total
                                            </TableHead>
                                            <TableHead className="min-w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Array.from(bmsItems.entries()).map(
                                            ([itemId, itemGroup], idx) => (
                                                <Fragment key={itemId}>
                                                    {/* Item Header Row */}
                                                    <TableRow
                                                        id={`bms-${itemId}`}
                                                        className="bg-primary/5 hover:bg-primary/10"
                                                    >
                                                        <TableCell className="font-bold">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell
                                                            colSpan={6}
                                                            className="font-bold"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {
                                                                        itemGroup
                                                                            .checklistItem
                                                                            .name
                                                                    }
                                                                </span>
                                                                <span className="text-xs font-normal text-muted-foreground">
                                                                    (
                                                                    {
                                                                        itemGroup.categoryTitle
                                                                    }
                                                                    )
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* BMS Entries */}
                                                    {itemGroup.entries.map(
                                                        (entry) => (
                                                            <TableRow
                                                                key={entry.id}
                                                                id={`bms-${itemId}-${entry.id}`}
                                                            >
                                                                <TableCell></TableCell>
                                                                <TableCell>
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
                                                                        className="h-8"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="0"
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
                                                                        className="h-8"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="outline"
                                                                                className="h-8 w-full justify-between text-left"
                                                                            >
                                                                                {entry.unit ||
                                                                                    "Pilih satuan"}
                                                                                <ChevronDown />
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
                                                                </TableCell>
                                                                <TableCell>
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
                                                                        className="h-8"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    Rp{" "}
                                                                    {entry.total.toLocaleString(
                                                                        "id-ID",
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() =>
                                                                            onRemoveBmsEntry(
                                                                                itemId,
                                                                                entry.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )}

                                                    {/* Add Item Button Row */}
                                                    <TableRow className="hover:bg-muted/30">
                                                        <TableCell></TableCell>
                                                        <TableCell
                                                            colSpan={6}
                                                            className="pl-8"
                                                        >
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() =>
                                                                    onAddBmsEntry(
                                                                        itemId,
                                                                    )
                                                                }
                                                            >
                                                                <Plus className="h-4 w-4 mr-1" />
                                                                Tambah barang
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Item Subtotal */}
                                                    {itemGroup.entries.length >
                                                        0 && (
                                                        <TableRow className="bg-muted/20">
                                                            <TableCell></TableCell>
                                                            <TableCell
                                                                colSpan={4}
                                                                className="text-right font-semibold"
                                                            >
                                                                Subtotal:
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold text-primary">
                                                                Rp{" "}
                                                                {itemGroup.entries
                                                                    .reduce(
                                                                        (
                                                                            sum,
                                                                            e,
                                                                        ) =>
                                                                            sum +
                                                                            e.total,
                                                                        0,
                                                                    )
                                                                    .toLocaleString(
                                                                        "id-ID",
                                                                    )}
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            ),
                                        )}

                                        {/* Grand Total */}
                                        <TableRow className="bg-primary/10 font-bold">
                                            <TableCell></TableCell>
                                            <TableCell
                                                colSpan={4}
                                                className="text-right text-base"
                                            >
                                                Total Keseluruhan:
                                            </TableCell>
                                            <TableCell className="text-right text-base text-primary">
                                                Rp{" "}
                                                {grandTotalBms.toLocaleString(
                                                    "id-ID",
                                                )}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Rekanan Items */}
                {rekananItems.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Item Rekanan ({rekananItems.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    {rekananItems.map((item, i) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{i + 1}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-8 md:col-start-5 md:order-3 mt-4 md:mt-0">
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
                                    <AlertTriangle className="h-5 w-5 text-primary" />
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
                                            {store}
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
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onSubmit}
                                    className="bg-primary"
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
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
