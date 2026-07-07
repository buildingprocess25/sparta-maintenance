"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StoreOption } from "./types";

interface StoreStepProps {
    stores: StoreOption[];
    selectedStoreCode: string;
    onStoreSelect: (storeCode: string) => void;
}

const getBrandLogo = (brand: string | null | undefined, storeName: string) => {
    const lowerName = storeName.toLowerCase();
    const isLawson = lowerName.includes("lawson") || brand?.toLowerCase().includes("lawson");
    const isMidi = lowerName.includes("midi") || brand?.toLowerCase().includes("midi");

    if (isLawson || isMidi) { 
        return {
            src: "/assets/Building-Logo.png",
            alt: "Store Logo",
            containerClassName: "bg-primary/5",
        };
    }
    
    return {
        src: "/assets/logoalfamart.png",
        alt: "Logo Alfamart",
        containerClassName: "bg-primary/5",
    };
};

export function StoreStep({
    stores,
    selectedStoreCode,
    onStoreSelect,
}: StoreStepProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStores = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            // Tampilkan sedikit di awal agar tidak berat render ribuan toko
            return stores.slice(0, 15);
        }

        return stores.filter((store) =>
            [store.code, store.name].join(" ").toLowerCase().includes(query),
        ).slice(0, 50); 
    }, [stores, searchQuery]);

    const handleStoreSelect = (storeCode: string) => {
        if (storeCode === selectedStoreCode) {
            return;
        }
        onStoreSelect(storeCode);
    };

    return (
        <>
            <section className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                    Cari dan konfirmasi lokasi toko yang membutuhkan maintenance.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        aria-label="Cari toko"
                        placeholder="Cari kode atau nama toko"
                        className="h-12 rounded-xl bg-muted/70 pr-11 pl-11 font-medium"
                    />

                    {searchQuery ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Hapus pencarian"
                            className="absolute top-1/2 right-3 -translate-y-1/2"
                            onClick={() => setSearchQuery("")}
                        >
                            <X />
                        </Button>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-2">
                    {filteredStores.map((store) => {
                        const isSelected = store.code === selectedStoreCode;
                        const brandLogo = getBrandLogo(store.brand, store.name);
                        return (
                            <Card
                                key={store.code}
                                size="sm"
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onClick={() => handleStoreSelect(store.code)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                    ) {
                                        event.preventDefault();
                                        handleStoreSelect(store.code);
                                    }
                                }}
                                className={cn(
                                    "relative cursor-pointer bg-card/95 shadow-sm transition-colors",
                                    isSelected
                                        ? "ring-2 ring-primary"
                                        : "ring-1 ring-border/60 hover:bg-accent/50",
                                )}
                            >
                                <CardContent>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className={cn(
                                                    "flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60",
                                                    brandLogo.containerClassName,
                                                    isSelected
                                                        ? "shadow-sm shadow-primary/15"
                                                        : "shadow-sm",
                                                )}
                                            >
                                                <Image
                                                    src={brandLogo.src}
                                                    alt={brandLogo.alt}
                                                    width={40}
                                                    height={40}
                                                    className="max-h-9 w-auto object-contain"
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <Badge
                                                    variant="secondary"
                                                    className="mb-1 text-[10px]"
                                                >
                                                    {store.code}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="mb-1 ml-1 text-[10px]"
                                                >
                                                    {store.type}
                                                </Badge>
                                                <h3 className="truncate text-base leading-tight font-semibold">
                                                    {store.name}
                                                </h3>
                                            </div>
                                        </div>

                                        {isSelected ? (
                                            <CheckCircle2 className="size-6 shrink-0 text-primary" />
                                        ) : null}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {filteredStores.length === 0 ? (
                        <Card size="sm" className="border-dashed bg-card/70">
                            <CardContent>
                                <div className="flex flex-col gap-1 text-center">
                                    <p className="text-sm font-semibold">
                                        Toko tidak ditemukan
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Coba cari dengan kode atau nama toko
                                        lain.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </section>
        </>
    );
}
