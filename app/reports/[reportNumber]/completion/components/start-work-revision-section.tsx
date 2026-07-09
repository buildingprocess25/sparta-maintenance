import {
    AlertCircle,
    Camera,
    ImagePlus,
    MapPin,
    Plus,
    ReceiptText,
    Store,
    User,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LocalPhoto, MaterialStoreEntry } from "../types";
import { EvidenceCaptureSection } from "./evidence-capture-section";

export function StartWorkRevisionSection({
    isZeroCost,
    skipPhotos,
    onSkipPhotosChange,
    selfiePhotos,
    materialStorePhotos,
    receiptPhotos,
    materialStores,
    onOpenCamera,
    onOpenStoreGallery,
    onRemoveSelfie,
    onRemoveStorePhoto,
    onRemoveReceipt,
    onAddStore,
    onRemoveStore,
    onStoreChange,
    onPreview,
}: {
    isZeroCost: boolean;
    skipPhotos: boolean;
    onSkipPhotosChange: (value: boolean) => void;
    selfiePhotos: LocalPhoto[];
    materialStorePhotos: LocalPhoto[];
    receiptPhotos: LocalPhoto[];
    materialStores: MaterialStoreEntry[];
    onOpenCamera: (
        target: "startSelfie" | "startStore" | "startReceipt",
    ) => void;
    onOpenStoreGallery: () => void;
    onRemoveSelfie: (id: string) => void;
    onRemoveStorePhoto: (id: string) => void;
    onRemoveReceipt: (id: string) => void;
    onAddStore: () => void;
    onRemoveStore: (id: string) => void;
    onStoreChange: (
        id: string,
        field: "name" | "city",
        value: string,
    ) => void;
    onPreview: (url: string) => void;
}) {
    return (
        <section id="start-work-section" className="border-b border-border/40 py-4">
            <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                    <AlertCircle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">
                        Revisi bukti awal
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        Laporan revisi perlu menyertakan ulang bukti mulai
                        pekerjaan.
                    </p>

                    {isZeroCost && (
                        <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-3 text-amber-950">
                            <Checkbox
                                id="completion-skip-start-photos"
                                checked={skipPhotos}
                                onCheckedChange={(checked) =>
                                    onSkipPhotosChange(checked === true)
                                }
                                className="mt-0.5 border-amber-400 bg-white"
                            />
                            <label
                                htmlFor="completion-skip-start-photos"
                                className="min-w-0 flex-1 cursor-pointer"
                            >
                                <p className="text-sm font-semibold">
                                    Tanpa pembelian material
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                                    Centang jika estimasi Rp 0. Foto selfie,
                                    toko material, dan nota akan dilewati.
                                </p>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-1">
                <EvidenceCaptureSection
                    title="Selfie di lokasi"
                    description="Foto bersama pejabat toko dan barang yang dibeli sebagai bukti BMS sudah berada di lokasi."
                    icon={User}
                    photos={selfiePhotos}
                    disabled={skipPhotos}
                    emptyText="Belum ada foto selfie."
                    onRemove={onRemoveSelfie}
                    onPreview={onPreview}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={skipPhotos}
                            onClick={() => onOpenCamera("startSelfie")}
                        >
                            <Camera data-icon="inline-start" />
                            {selfiePhotos.length > 0
                                ? "Tambah Selfie"
                                : "Buka Kamera"}
                        </Button>
                    }
                />

                <EvidenceCaptureSection
                    title="Toko material"
                    description="Foto tampak depan toko tempat pembelian material."
                    icon={Store}
                    photos={materialStorePhotos}
                    disabled={skipPhotos}
                    emptyText="Belum ada foto toko material."
                    onRemove={onRemoveStorePhoto}
                    onPreview={onPreview}
                    actions={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={skipPhotos}
                                onClick={() => onOpenCamera("startStore")}
                            >
                                <Camera data-icon="inline-start" />
                                Kamera
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={skipPhotos}
                                onClick={onOpenStoreGallery}
                            >
                                <ImagePlus data-icon="inline-start" />
                                Galeri
                            </Button>
                        </>
                    }
                />

                <EvidenceCaptureSection
                    title="Nota pembelian"
                    description="Foto nota atau struk material yang dibawa ke lokasi."
                    icon={ReceiptText}
                    photos={receiptPhotos}
                    disabled={skipPhotos}
                    emptyText="Belum ada foto nota."
                    onRemove={onRemoveReceipt}
                    onPreview={onPreview}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={skipPhotos}
                            onClick={() => onOpenCamera("startReceipt")}
                        >
                            <Camera data-icon="inline-start" />
                            {receiptPhotos.length > 0
                                ? "Tambah Nota"
                                : "Foto Nota"}
                        </Button>
                    }
                />

                <section
                    className={cn(
                        "border-b border-border/40 py-4",
                        skipPhotos && "opacity-45",
                    )}
                >
                    <div className="flex gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MapPin className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        Data toko material
                                    </h2>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                        Isi nama toko dan alamat sesuai nota.
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Wajib
                                </span>
                            </div>

                            <div className="mt-3 flex flex-col gap-3">
                                {materialStores.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                                        Tambahkan toko material setelah foto
                                        bukti tersedia.
                                    </p>
                                ) : (
                                    materialStores.map((store, index) => (
                                        <div
                                            key={store.id}
                                            className="flex gap-2"
                                        >
                                            <div className="grid flex-1 grid-cols-1 gap-2">
                                                <Label className="text-xs">
                                                    Toko {index + 1}
                                                </Label>
                                                <Input
                                                    placeholder="Nama toko material"
                                                    value={store.name}
                                                    disabled={skipPhotos}
                                                    onChange={(event) =>
                                                        onStoreChange(
                                                            store.id,
                                                            "name",
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                                <Textarea
                                                    placeholder="Alamat"
                                                    value={store.city}
                                                    disabled={skipPhotos}
                                                    className="min-h-20 resize-none"
                                                    onChange={(event) =>
                                                        onStoreChange(
                                                            store.id,
                                                            "city",
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            {materialStores.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    disabled={skipPhotos}
                                                    onClick={() =>
                                                        onRemoveStore(store.id)
                                                    }
                                                    aria-label={`Hapus toko ${index + 1}`}
                                                >
                                                    <X />
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                )}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={skipPhotos}
                                    onClick={onAddStore}
                                    className="self-start"
                                >
                                    <Plus data-icon="inline-start" />
                                    Tambah Toko
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
