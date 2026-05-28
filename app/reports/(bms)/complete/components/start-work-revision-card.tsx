"use client";

import {
    Camera,
    ImagePlus,
    MapPin,
    Plus,
    ReceiptText,
    Store,
    Trash2,
    User,
    X,
    ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocalPhoto, MaterialStoreEntry } from "../types";

function PhotoThumbnails({
    photos,
    onRemove,
    onPreview,
}: {
    photos: LocalPhoto[];
    onRemove: (id: string) => void;
    onPreview: (url: string) => void;
}) {
    if (photos.length === 0) return null;

    return (
        <div className="mb-3 flex flex-wrap gap-3">
            {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.previewUrl}
                        alt="Foto mulai pekerjaan"
                        className="h-24 w-24 cursor-zoom-in rounded-lg border-2 border-green-200 object-cover"
                        onClick={() => onPreview(photo.previewUrl)}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(photo.id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

interface Props {
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
    onStoreChange: (id: string, field: "name" | "city", value: string) => void;
    onPreview: (url: string) => void;
}

export function StartWorkRevisionCard({
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
}: Props) {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-base">
                    Data Mulai Pekerjaan
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                {isZeroCost && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-background px-4 py-3 dark:border-amber-800">
                        <Checkbox
                            id="completion-start-skip-photos"
                            checked={skipPhotos}
                            onCheckedChange={(checked) =>
                                onSkipPhotosChange(checked === true)
                            }
                        />
                        <label
                            htmlFor="completion-start-skip-photos"
                            className="cursor-pointer text-sm"
                        >
                            <span className="font-semibold">
                                Estimasi Rp 0 - lewati foto selfie, toko
                                material, dan nota
                            </span>
                        </label>
                    </div>
                )}

                <div
                    className={
                        skipPhotos
                            ? "pointer-events-none select-none space-y-5 opacity-40"
                            : "space-y-5"
                    }
                >
                    <section>
                        <Label className="mb-2 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-primary" />
                            Foto Selfie{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <PhotoThumbnails
                            photos={selfiePhotos}
                            onRemove={onRemoveSelfie}
                            onPreview={onPreview}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700"
                            onClick={() => onOpenCamera("startSelfie")}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {selfiePhotos.length > 0
                                ? "Tambah Selfie"
                                : "Buka Kamera"}
                        </Button>
                    </section>

                    <section>
                        <Label className="mb-2 flex items-center gap-2 text-sm">
                            <Store className="h-4 w-4 text-primary" />
                            Foto Toko Material{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <PhotoThumbnails
                            photos={materialStorePhotos}
                            onRemove={onRemoveStorePhoto}
                            onPreview={onPreview}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 hover:text-indigo-700"
                                onClick={() => onOpenCamera("startStore")}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                {materialStorePhotos.length > 0
                                    ? "Tambah Foto"
                                    : "Buka Kamera"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 hover:text-indigo-700"
                                onClick={onOpenStoreGallery}
                            >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Pilih dari Galeri
                            </Button>
                        </div>
                    </section>

                    <section>
                        <Label className="mb-2 flex items-center gap-2 text-sm">
                            <ReceiptText className="h-4 w-4 text-primary" />
                            Foto Nota / Struk{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <PhotoThumbnails
                            photos={receiptPhotos}
                            onRemove={onRemoveReceipt}
                            onPreview={onPreview}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                            onClick={() => onOpenCamera("startReceipt")}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {receiptPhotos.length > 0
                                ? "Tambah Nota"
                                : "Foto Nota"}
                        </Button>
                    </section>

                    <section className="space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm font-semibold">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                Toko Material{" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={onAddStore}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Tambah Toko
                            </Button>
                        </div>

                        {materialStores.map((store, index) => (
                            <div
                                key={store.id}
                                className="flex items-start gap-2"
                            >
                                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div>
                                        <Label className="mb-1 block text-xs text-muted-foreground">
                                            Nama Toko
                                        </Label>
                                        <Input
                                            value={store.name}
                                            placeholder="Nama toko..."
                                            onChange={(event) =>
                                                onStoreChange(
                                                    store.id,
                                                    "name",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1 block text-xs text-muted-foreground">
                                            Alamat
                                        </Label>
                                        <Input
                                            value={store.city}
                                            placeholder="Alamat..."
                                            onChange={(event) =>
                                                onStoreChange(
                                                    store.id,
                                                    "city",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                {materialStores.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveStore(store.id)}
                                        className="mt-7 text-destructive transition-colors hover:text-destructive/80"
                                        aria-label={`Hapus toko ${index + 1}`}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </section>
                </div>
            </CardContent>
        </Card>
    );
}
