import {
  AlertCircle,
  Camera,
  ImagePlus,
  MapPin,
  Plus,
  ReceiptText,
  Trash2,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LocalPhoto, StartWorkMaterialStoreEntry } from "../types";
import { EvidenceCaptureSection } from "./evidence-capture-section";

export function StartWorkRevisionSection({
  isZeroCost,
  skipPhotos,
  onSkipPhotosChange,
  selfiePhotos,
  receiptPhotos,
  materialStores,
  onOpenCamera,
  onOpenStoreCamera,
  onAddStorePhoto,
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
  receiptPhotos: LocalPhoto[];
  materialStores: StartWorkMaterialStoreEntry[];
  onOpenCamera: (target: "startSelfie" | "startReceipt") => void;
  onOpenStoreCamera: (storeId: string) => void;
  onAddStorePhoto: (storeId: string, file: File) => void;
  onRemoveSelfie: (id: string) => void;
  onRemoveStorePhoto: (storeId: string, photoId: string) => void;
  onRemoveReceipt: (id: string) => void;
  onAddStore: () => void;
  onRemoveStore: (id: string) => void;
  onStoreChange: (id: string, field: "name" | "city", value: string) => void;
  onPreview: (url: string) => void;
}) {
  return (
    <section id="start-work-section" className="border-b border-border/40 py-4">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
          <AlertCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Revisi bukti awal</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Laporan revisi perlu menyertakan ulang bukti mulai pekerjaan.
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
                  Centang jika estimasi Rp 0. Foto selfie, toko material, dan
                  nota akan dilewati.
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
              {selfiePhotos.length > 0 ? "Tambah Selfie" : "Buka Kamera"}
            </Button>
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
              {receiptPhotos.length > 0 ? "Tambah Nota" : "Foto Nota"}
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
                  <h2 className="text-sm font-semibold">Data toko material</h2>
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
                    Belum ada toko material. Silakan tambah toko.
                  </p>
                ) : (
                  materialStores.map((store, index) => (
                    <div key={store.id} className="flex gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            Toko {index + 1}
                          </Label>
                          {materialStores.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={skipPhotos}
                              onClick={() => onRemoveStore(store.id)}
                              aria-label={`Hapus toko ${index + 1}`}
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder={
                            receiptPhotos.length === 0
                              ? "Nama toko material (Upload foto nota terlebih dahulu)"
                              : "Nama toko material"
                          }
                          value={store.name}
                          disabled={skipPhotos || receiptPhotos.length === 0}
                          onChange={(event) =>
                            onStoreChange(store.id, "name", event.target.value)
                          }
                        />
                        <Textarea
                          placeholder={
                            receiptPhotos.length === 0
                              ? "Alamat (Upload foto nota terlebih dahulu)"
                              : "Alamat"
                          }
                          value={store.city}
                          disabled={skipPhotos || receiptPhotos.length === 0}
                          className="min-h-16 resize-none"
                          onChange={(event) =>
                            onStoreChange(store.id, "city", event.target.value)
                          }
                        />
                        <div className="mt-1 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Foto Toko
                            </Label>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                disabled={skipPhotos}
                                onClick={() => onOpenStoreCamera(store.id)}
                              >
                                <Camera
                                  data-icon="inline-start"
                                  className="mr-1 size-3"
                                />
                                Kamera
                              </Button>
                              <label
                                className={cn(
                                  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                  "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-6 px-2",
                                  skipPhotos &&
                                    "pointer-events-none opacity-50",
                                )}
                              >
                                <ImagePlus className="mr-1 size-3" />
                                Galeri
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  disabled={skipPhotos}
                                  onChange={(e) => {
                                    const files = Array.from(
                                      e.target.files ?? [],
                                    );
                                    files.forEach((file) =>
                                      onAddStorePhoto(store.id, file),
                                    );
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          {store.photos.length === 0 ? (
                            <div className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                              Belum ada foto.
                            </div>
                          ) : (
                            <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
                              {store.photos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.previewUrl}
                                    alt="Foto bukti"
                                    className="h-full w-full object-cover"
                                    onClick={() => onPreview(photo.previewUrl)}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon-sm"
                                    onClick={() =>
                                      onRemoveStorePhoto(store.id, photo.id)
                                    }
                                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-label="Hapus foto"
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
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
