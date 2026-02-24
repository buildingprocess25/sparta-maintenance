"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from "@/components/ui/combobox";
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

    // Reset state when dialog transitions from closed to open
    if (open && !prevOpen) {
        setSearchQuery("");
        setLocalSelectedCode(selectedStoreCode);
        setPrevOpen(true);
    } else if (!open && prevOpen) {
        setPrevOpen(false);
    }

    const filteredStores = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return stores.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query),
        );
    }, [stores, searchQuery]);

    const selectedObject = useMemo(() => {
        if (!localSelectedCode) return null;
        const store = stores.find((s) => s.code === localSelectedCode);
        if (!store) return null;
        return { value: store.code, label: `${store.code} - ${store.name}` };
    }, [localSelectedCode, stores]);

    const handleConfirm = () => {
        if (localSelectedCode) {
            onStoreChange(localSelectedCode);
        }
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-md overflow-visible">
                <AlertDialogHeader>
                    <AlertDialogTitle>Pilih Toko</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cari dan pilih toko yang akan diinspeksi. Klik OK untuk
                        menyimpan pilihan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <div className="space-y-2">
                        <Label>
                            Toko <span className="text-red-500">*</span>
                        </Label>
                        <Combobox
                            value={selectedObject}
                            onValueChange={(
                                val: { value: string; label: string } | null,
                            ) => {
                                if (val) {
                                    setLocalSelectedCode(val.value);
                                }
                            }}
                            inputValue={searchQuery}
                            onInputValueChange={(val) => setSearchQuery(val)}
                            isItemEqualToValue={(item, selected) =>
                                item?.value === selected?.value
                            }
                        >
                            <ComboboxInput
                                placeholder="Ketik kode atau nama toko..."
                                className="w-full"
                            />
                            <ComboboxContent
                                align="start"
                                sideOffset={4}
                                className="w-[--anchor-width]"
                            >
                                <ComboboxList>
                                    {filteredStores.map((store) => (
                                        <ComboboxItem
                                            key={store.code}
                                            value={{
                                                value: store.code,
                                                label: `${store.code} - ${store.name}`,
                                            }}
                                        >
                                            {store.code} - {store.name}
                                        </ComboboxItem>
                                    ))}
                                    {filteredStores.length === 0 && (
                                        <ComboboxEmpty className="py-6 text-center">
                                            {!searchQuery.trim()
                                                ? "Ketik beberapa huruf untuk mulai mencari"
                                                : "Toko tidak ditemukan"}
                                        </ComboboxEmpty>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
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
