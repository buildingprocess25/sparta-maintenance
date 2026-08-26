"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  Camera,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  SendHorizonal,
  Trash2,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { BmsMobileHeader } from "@/components/bms-mobile/bms-mobile-header";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Textarea } from "@/components/ui/textarea";
import { startWorkWithPhotos } from "@/app/reports/actions/start-work-with-photos";
import {
  getReportStatusBadgeClass,
  getReportStatusLabel,
} from "@/lib/report-status";
import { getStartWorkEvidenceError } from "@/lib/start-work-evidence";
import { genPhotoId } from "@/lib/upload-photo";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import { cn } from "@/lib/utils";
import type { MaterialEstimationJson } from "@/types/report";
import type { ReportForStartWork } from "./queries";
import {
  useStartWorkAutosave,
  type StartWorkDraftData,
  type StartWorkLocalPhoto,
} from "./use-start-work-autosave";

type StartWorkReport = NonNullable<ReportForStartWork>;
type CameraTarget =
  "selfie" | "receipt" | { type: "store"; storeId: string } | null;
type MaterialStoreEntry = {
  id: string;
  name: string;
  city: string;
  photos: StartWorkLocalPhoto[];
};

type StartWorkClientProps = {
  report: StartWorkReport;
  userNIK: string;
  userName: string;
};

const MATERIAL_STORE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.07,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
} as const;

function genId() {
  return genPhotoId();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTotalEstimation(report: StartWorkReport) {
  const estimations = report.estimations as MaterialEstimationJson[];
  if (!Array.isArray(estimations)) return 0;

  return estimations.reduce(
    (sum, estimation) => sum + (estimation.totalPrice ?? 0),
    0,
  );
}

async function compressMaterialStorePhoto(file: File): Promise<File> {
  const compressed = (await imageCompression(
    file,
    MATERIAL_STORE_COMPRESSION_OPTIONS,
  )) as Blob;
  return new File([compressed], file.name || "photo.jpg", {
    type: compressed.type || file.type || "image/jpeg",
  });
}

function PhotoStrip({
  photos,
  onRemove,
  onPreview,
}: {
  photos: StartWorkLocalPhoto[];
  onRemove: (id: string) => void;
  onPreview: (url: string) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 text-center text-xs text-muted-foreground">
        Belum ada foto.
      </div>
    );
  }

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt="Foto bukti"
            className="h-full w-full object-cover"
            onClick={() => onPreview(photo.previewUrl)}
          />
          <button
            type="button"
            onClick={() => onPreview(photo.previewUrl)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100"
            aria-label="Lihat foto"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/95 text-destructive shadow-sm"
            aria-label="Hapus foto"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function StartWorkClient({
  report,
  userNIK,
  userName,
}: StartWorkClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { uploadPhoto } = usePhotoUpload();
  const autosave = useStartWorkAutosave();
  const isHeaderVisible = useBmsMobileHeaderVisibility();
  const reportNumber = report.reportNumber;

  const [isRestoringDraft, setIsRestoringDraft] = useState(true);
  const [selfiePhotos, setSelfiePhotos] = useState<StartWorkLocalPhoto[]>([]);
  const [receiptPhotos, setReceiptPhotos] = useState<StartWorkLocalPhoto[]>([]);
  const [materialStores, setMaterialStores] = useState<MaterialStoreEntry[]>(() => [
    { id: genId(), name: "", city: "", photos: [] },
  ]);
  const [skipPhotos, setSkipPhotos] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const storeGalleryInputRef = useRef<HTMLInputElement>(null);
  const totalEstimation = getTotalEstimation(report);
  const isZeroCost = totalEstimation === 0;

  const closePreview = useHistoryBackClose(!!previewUrl, () =>
    setPreviewUrl(null),
  );

  const buildDraftData = useCallback(
    (): StartWorkDraftData => ({
      version: 2,
      reportNumber,
      savedAt: new Date().toISOString(),
      selfiePhotoIds: selfiePhotos.map((photo) => photo.id),
      receiptPhotoIds: receiptPhotos.map((photo) => photo.id),
      materialStores: materialStores.map((store) => ({
        id: store.id,
        name: store.name,
        city: store.city,
        photoIds: store.photos.map((p) => p.id),
      })),
      skipPhotos,
    }),
    [reportNumber, selfiePhotos, receiptPhotos, materialStores, skipPhotos],
  );

  useEffect(() => {
    autosave
      .restoreDraft(reportNumber)
      .then((draft) => {
        if (!draft) return;
        setSelfiePhotos(draft.selfiePhotos);
        setReceiptPhotos(draft.receiptPhotos);
        setMaterialStores(
          draft.materialStores.length > 0
            ? draft.materialStores.map((store) => ({
                ...store,
                photos: store.photos || [],
              }))
            : [{ id: genId(), name: "", city: "", photos: [] }]
        );
        setSkipPhotos(draft.skipPhotos);
      })
      .finally(() => setIsRestoringDraft(false));
  }, [autosave, reportNumber]);

  useEffect(() => {
    if (isRestoringDraft) return;
    autosave.triggerSave(reportNumber, buildDraftData());
  }, [autosave, buildDraftData, isRestoringDraft, reportNumber]);

  const handleAddMaterialStorePhoto = useCallback(
    (storeId: string, file: File) => {
      void (async () => {
        try {
          const compressedFile = await compressMaterialStorePhoto(file);
          const photo = await autosave.addPhoto(
            reportNumber,
            compressedFile,
            "store",
          );
          setMaterialStores((prev) =>
            prev.map((s) =>
              s.id === storeId ? { ...s, photos: [...s.photos, photo] } : s,
            ),
          );
        } catch (error) {
          console.warn("Gagal mengompres foto toko material:", error);
          const photo = await autosave.addPhoto(reportNumber, file, "store");
          setMaterialStores((prev) =>
            prev.map((s) =>
              s.id === storeId ? { ...s, photos: [...s.photos, photo] } : s,
            ),
          );
        }
      })();
    },
    [autosave, reportNumber],
  );

  const handlePhotoCaptured = useCallback(
    async (file: File) => {
      if (!cameraTarget) return;
      const target = cameraTarget;
      setCameraTarget(null);

      if (typeof target === "object" && target.type === "store") {
        handleAddMaterialStorePhoto(target.storeId, file);
        return;
      }

      const photo = await autosave.addPhoto(
        reportNumber,
        file,
        target as string,
      );
      if (target === "selfie") {
        setSelfiePhotos((prev) => [...prev, photo]);
        return;
      }

      setReceiptPhotos((prev) => {
        const next = [...prev, photo];
        if (prev.length === 0) {
          setMaterialStores([{ id: genId(), name: "", city: "", photos: [] }]);
        }
        return next;
      });
    },
    [autosave, cameraTarget, handleAddMaterialStorePhoto, reportNumber],
  );

  const handleRemoveSelfiePhoto = useCallback(
    (id: string) => {
      void autosave.removePhoto(id);
      setSelfiePhotos((prev) => prev.filter((photo) => photo.id !== id));
    },
    [autosave],
  );

  const handleRemoveReceiptPhoto = useCallback(
    (id: string) => {
      void autosave.removePhoto(id);
      setReceiptPhotos((prev) => {
        const next = prev.filter((photo) => photo.id !== id);
        return next;
      });
    },
    [autosave],
  );

  const handleRemoveStorePhoto = useCallback(
    (storeId: string, photoId: string) => {
      void autosave.removePhoto(photoId);
      setMaterialStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? { ...s, photos: s.photos.filter((p) => p.id !== photoId) }
            : s,
        ),
      );
    },
    [autosave],
  );

  const handleAddStore = useCallback(() => {
    setMaterialStores((prev) => [
      ...prev,
      { id: genId(), name: "", city: "", photos: [] },
    ]);
  }, []);

  const handleRemoveStore = useCallback((id: string) => {
    setMaterialStores((prev) => prev.filter((store) => store.id !== id));
  }, []);

  const handleStoreChange = useCallback(
    (id: string, field: "name" | "city", value: string) => {
      setMaterialStores((prev) =>
        prev.map((store) =>
          store.id === id ? { ...store, [field]: value } : store,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const validationError = getStartWorkEvidenceError({
      isZeroCost,
      skipPhotos,
      selfieCount: selfiePhotos.length,
      materialStorePhotoCount: materialStores.reduce(
        (acc, store) => acc + store.photos.length,
        0,
      ),
      receiptCount: receiptPhotos.length,
      materialStores: materialStores.map((store) => ({
        name: store.name,
        city: store.city,
        photoCount: store.photos.length,
      })),
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    startTransition(async () => {
      const loadingId = toast.loading(
        "Mengunggah foto dan memulai pekerjaan...",
      );
      const selfiePhotosToUpload = skipPhotos ? [] : selfiePhotos;
      const receiptPhotosToUpload = skipPhotos ? [] : receiptPhotos;
      const uploadedSelfieUrls: string[] = [];
      const uploadedSelfieFileIds: string[] = [];
      for (const photo of selfiePhotosToUpload) {
        const result = await uploadPhoto(photo.file, {
          kind: "START_SELFIE",
          reportNumber,
        });
        if (!result) {
          toast.dismiss(loadingId);
          toast.error("Gagal mengunggah foto selfie");
          return;
        }
        uploadedSelfieUrls.push(result.url);
        uploadedSelfieFileIds.push(result.fileId);
      }

      const uploadedReceiptUrls: string[] = [];
      const uploadedReceiptFileIds: string[] = [];
      for (const photo of receiptPhotosToUpload) {
        const result = await uploadPhoto(photo.file, {
          kind: "START_RECEIPT",
          reportNumber,
        });
        if (!result) {
          toast.dismiss(loadingId);
          toast.error("Gagal mengunggah foto nota");
          return;
        }
        uploadedReceiptUrls.push(result.url);
        uploadedReceiptFileIds.push(result.fileId);
      }

      let allStorePhotosUploadFailed = false;
      const uploadedStoreFileIds: string[] = [];
      const finalizedStores = skipPhotos
        ? []
        : await Promise.all(
            materialStores.map(async (store) => {
              const urls: string[] = [];
              const storeIndex = materialStores.findIndex(
                (candidate) => candidate.id === store.id,
              );
              for (const photo of store.photos) {
                const result = await uploadPhoto(photo.file, {
                  kind: "START_MATERIAL_STORE",
                  reportNumber,
                  entryId: store.id,
                  index: storeIndex,
                  name: store.name,
                  city: store.city,
                });
                if (!result) {
                  allStorePhotosUploadFailed = true;
                  continue;
                }
                urls.push(result.url);
                if (result.fileId) uploadedStoreFileIds.push(result.fileId);
              }
              return {
                name: store.name.trim(),
                city: store.city.trim(),
                ...(urls.length > 0 ? { photoUrls: urls } : {}),
              };
            }),
          );

      if (allStorePhotosUploadFailed) {
        toast.dismiss(loadingId);
        toast.error("Gagal mengunggah foto toko material");
        return;
      }

      const result = await startWorkWithPhotos(reportNumber, {
        selfieUrls: uploadedSelfieUrls,
        selfieFileIds: uploadedSelfieFileIds,
        receiptUrls: uploadedReceiptUrls,
        receiptFileIds: uploadedReceiptFileIds,
        materialStores: finalizedStores,
        materialStorePhotoFileIds: uploadedStoreFileIds,
        skipPhotos,
      });

      toast.dismiss(loadingId);

      if (result.error) {
        toast.error("Gagal memulai pekerjaan", {
          description: result.error,
        });
        return;
      }

      toast.success("Pengerjaan dimulai", {
        description: `Status laporan menjadi ${getReportStatusLabel("IN_PROGRESS")}.`,
      });
      await autosave.clearDraft(reportNumber);
      router.push(`/reports/${reportNumber}`);
    });
  }, [
    autosave,
    isZeroCost,
    materialStores,
    receiptPhotos,
    reportNumber,
    router,
    selfiePhotos,
    skipPhotos,
    uploadPhoto,
  ]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <BmsMobileHeader
        title="Mulai Pekerjaan"
        showBackButton
        backHref={`/reports/${reportNumber}`}
      />

      <div
        className={cn(
          "fixed inset-x-0 top-[57px] z-30 border-b border-border/40 bg-background transition-transform duration-300 ease-out",
          isHeaderVisible ? "translate-y-0" : "-translate-y-[57px]",
        )}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{report.storeName}</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {report.reportNumber} · {formatCurrency(totalEstimation)}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
              getReportStatusBadgeClass(report.status),
            )}
          >
            {getReportStatusLabel(report.status)}
          </span>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pb-32 pt-[116px]">
        {isZeroCost && (
          <section className="mb-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-3 text-amber-950">
            <div className="flex items-start gap-3">
              <Checkbox
                id="skip-photos"
                checked={skipPhotos}
                onCheckedChange={(checked) => setSkipPhotos(checked === true)}
                className="mt-0.5 border-amber-400 bg-white"
              />
              <label
                htmlFor="skip-photos"
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
          </section>
        )}

        <EvidenceCaptureSection
          title="Selfie di lokasi"
          description="Foto bersama pejabat toko dan barang yang dibeli sebagai bukti BMS sudah berada di lokasi."
          icon={User}
          photos={selfiePhotos}
          disabled={skipPhotos}
          onRemove={handleRemoveSelfiePhoto}
          onPreview={setPreviewUrl}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={skipPhotos}
              onClick={() => setCameraTarget("selfie")}
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
          onRemove={handleRemoveReceiptPhoto}
          onPreview={setPreviewUrl}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={skipPhotos}
              onClick={() => setCameraTarget("receipt")}
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
                              onClick={() => handleRemoveStore(store.id)}
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
                            handleStoreChange(
                              store.id,
                              "name",
                              event.target.value,
                            )
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
                            handleStoreChange(
                              store.id,
                              "city",
                              event.target.value,
                            )
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
                                onClick={() =>
                                  setCameraTarget({
                                    type: "store",
                                    storeId: store.id,
                                  })
                                }
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
                                      handleAddMaterialStorePhoto(
                                        store.id,
                                        file,
                                      ),
                                    );
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          <PhotoStrip
                            photos={store.photos}
                            onRemove={(photoId) =>
                              handleRemoveStorePhoto(store.id, photoId)
                            }
                            onPreview={setPreviewUrl}
                          />
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
                  onClick={handleAddStore}
                  className="self-start"
                >
                  <Plus data-icon="inline-start" />
                  Tambah Toko
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            onClick={handleSubmit}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Memproses
              </>
            ) : (
              <>
                Submit Mulai Pekerjaan{" "}
                <SendHorizonal data-icon="inline-start" />
              </>
            )}
          </Button>
        </div>
      </footer>

      <CameraModal
        isOpen={cameraTarget !== null}
        onCapture={handlePhotoCaptured}
        onClose={() => setCameraTarget(null)}
        watermarkInfo={{
          name: userName,
          nik: userNIK,
          role: "BMS",
          storeInfo: `Toko: ${report.storeName}`,
        }}
      />

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview foto"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={closePreview}
              className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full bg-white text-black"
              aria-label="Tutup preview"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <LoadingOverlay
        isOpen={isRestoringDraft}
        message="Memuat draft mulai pekerjaan..."
      />
    </div>
  );
}

function EvidenceCaptureSection({
  title,
  description,
  icon,
  photos,
  disabled,
  onRemove,
  onPreview,
  actions,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  photos: StartWorkLocalPhoto[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  onPreview: (url: string) => void;
  actions: ReactNode;
}) {
  const Icon = icon;

  return (
    <section
      className={cn("border-b border-border/40 py-4", disabled && "opacity-45")}
    >
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Wajib
            </span>
          </div>
          <div className="mt-3">
            <PhotoStrip
              photos={photos}
              onRemove={onRemove}
              onPreview={onPreview}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
    </section>
  );
}
