"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import type { StoreOption } from "./types";

interface StoreSelectDialogProps {
    open: boolean;
    stores: StoreOption[];
    selectedStoreCode: string;
    onStoreChange: (storeCode: string) => void;
    onCancel: () => void;
}

export function StoreSelectDialog({
    open,
    stores,
    selectedStoreCode,
    onStoreChange,
    onCancel,
}: StoreSelectDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [localSelectedCode, setLocalSelectedCode] =
        useState(selectedStoreCode);
    const [prevOpen, setPrevOpen] = useState(open);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && !prevOpen) {
            setSearchQuery("");
            setLocalSelectedCode(selectedStoreCode);
            setPrevOpen(true);
        } else if (!open && prevOpen) {
            setPrevOpen(false);
        }
    }, [open, prevOpen, selectedStoreCode]);

    const filteredStores = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return stores.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query),
        );
    }, [stores, searchQuery]);

    const selectedLabel = useMemo(() => {
        if (!localSelectedCode) return "";
        const store = stores.find((s) => s.code === localSelectedCode);
        return store ? `${store.code} - ${store.name}` : "";
    }, [localSelectedCode, stores]);

    const handleSelect = (code: string) => {
        setLocalSelectedCode(code);
        const store = stores.find((s) => s.code === code);
        if (store) setSearchQuery(`${store.code} - ${store.name}`);
    };

    const handleClear = () => {
        setSearchQuery("");
        setLocalSelectedCode("");
        inputRef.current?.focus();
    };

    const handleConfirm = () => {
        if (localSelectedCode) {
            onStoreChange(localSelectedCode);
        }
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Pilih Toko</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cari dan pilih toko yang akan diinspeksi. Klik OK untuk
                        menyimpan pilihan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                    <div className="space-y-2">
                        <Label>
                            Toko <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                placeholder="Ketik kode atau nama toko..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!e.target.value.trim()) {
                                        setLocalSelectedCode("");
                                    }
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

                            {searchQuery.trim() && !localSelectedCode && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                                    {filteredStores.length > 0 ? (
                                        filteredStores.map((store) => (
                                            <button
                                                key={store.code}
                                                type="button"
                                                onClick={() =>
                                                    handleSelect(store.code)
                                                }
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                            >
                                                {store.code} - {store.name}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            Toko tidak ditemukan
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!localSelectedCode}
                    >
                        OK
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
