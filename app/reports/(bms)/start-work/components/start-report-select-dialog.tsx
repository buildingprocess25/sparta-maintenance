"use client";

import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StartableReport } from "../queries";

interface Props {
    open: boolean;
    reports: StartableReport[];
    onSelect: (reportNumber: string) => void;
    onCancel: () => void;
}

export function StartReportSelectDialog({
    open,
    reports,
    onSelect,
    onCancel,
}: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [localSelected, setLocalSelected] = useState("");
    const [prevOpen, setPrevOpen] = useState(open);
    const inputRef = useRef<HTMLInputElement>(null);

    if (open && !prevOpen) {
        setSearchQuery("");
        setLocalSelected("");
        setPrevOpen(true);
    } else if (!open && prevOpen) {
        setPrevOpen(false);
    }

    const filteredReports = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return reports.filter(
            (r) =>
                r.reportNumber.toLowerCase().includes(q) ||
                r.storeName.toLowerCase().includes(q),
        );
    }, [reports, searchQuery]);

    const labelFor = (r: StartableReport) =>
        `${r.reportNumber} - ${r.storeName}`;

    const handleSelect = (r: StartableReport) => {
        setLocalSelected(r.reportNumber);
        setSearchQuery(labelFor(r));
    };

    const handleClear = () => {
        setSearchQuery("");
        setLocalSelected("");
        inputRef.current?.focus();
    };

    const handleConfirm = () => {
        if (localSelected) onSelect(localSelected);
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Cari Laporan</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cari dan pilih laporan yang siap dikerjakan. Klik OK
                        untuk melanjutkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                    <Label>
                        Nomor Laporan <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            ref={inputRef}
                            placeholder="Ketik nomor laporan atau nama toko..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value.trim())
                                    setLocalSelected("");
                            }}
                            className="pr-9"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {searchQuery.trim() && !localSelected && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((r) => (
                                        <button
                                            key={r.reportNumber}
                                            type="button"
                                            onClick={() => handleSelect(r)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                        >
                                            <span className="font-medium">
                                                {r.reportNumber}
                                            </span>
                                            <span className="text-muted-foreground ml-2">
                                                {r.storeName}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-3 py-2 text-sm text-muted-foreground">
                                        Tidak ada hasil
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {localSelected && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Laporan dipilih: <strong>{localSelected}</strong>
                        </p>
                    )}
                </div>

                <AlertDialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={!localSelected && reports.length === 0}
                    >
                        Batal
                    </Button>
                    <Button onClick={handleConfirm} disabled={!localSelected}>
                        OK
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
