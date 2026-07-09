"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
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
  Store,
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
type CameraTarget = "selfie" | "receipt" | "store" | null;
type MaterialStoreEntry = {
  id: string;
  name: string;
  city: string;
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
  const [materialStorePhotos, setMaterialStorePhotos] = useState<
    StartWorkLocalPhoto[]
  >([]);
  const [receiptPhotos, setReceiptPhotos] = useState<StartWorkLocalPhoto[]>([]);
  const [materialStores, setMaterialStores] = useState<MaterialStoreEntry[]>(
    [],
  );
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
      version: 1,
      reportNumber,
      savedAt: new Date().toISOString(),
      selfiePhotoIds: selfiePhotos.map((photo) => photo.id),
      materialStorePhotoIds: materialStorePhotos.map((photo) => photo.id),
      receiptPhotoIds: receiptPhotos.map((photo) => photo.id),
      materialStores,
      skipPhotos,
    }),
    [
      reportNumber,
      selfiePhotos,
      materialStorePhotos,
      receiptPhotos,
      materialStores,
      skipPhotos,
    ],
  );

  useEffect(() => {
    autosave
      .restoreDraft(reportNumber)
      .then((draft) => {
        if (!draft) return;
        setSelfiePhotos(draft.selfiePhotos);
        setMaterialStorePhotos(draft.materialStorePhotos);
        setReceiptPhotos(draft.receiptPhotos);
        setMaterialStores(draft.materialStores);
        setSkipPhotos(draft.skipPhotos);
      })
      .finally(() => setIsRestoringDraft(false));
  }, [autosave, reportNumber]);

  useEffect(() => {
    if (isRestoringDraft) return;
    autosave.triggerSave(reportNumber, buildDraftData());
  }, [autosave, buildDraftData, isRestoringDraft, reportNumber]);

  const handleAddMaterialStorePhoto = useCallback(
    (file: File) => {
      void (async () => {
        try {
          const compressedFile = await compressMaterialStorePhoto(file);
          const photo = await autosave.addPhoto(
            reportNumber,
            compressedFile,
            "store",
          );
          setMaterialStorePhotos((prev) => [...prev, photo]);
        } catch (error) {
          console.warn("Gagal mengompres foto toko material:", error);
          const photo = await autosave.addPhoto(reportNumber, file, "store");
          setMaterialStorePhotos((prev) => [...prev, photo]);
        }
      })();
    },
    [autosave, reportNumber],
  );

  const handlePhotoCaptured = useCallback(
    async (file: File) => {
      if (!cameraTarget) return;
      setCameraTarget(null);

      if (cameraTarget === "store") {
        handleAddMaterialStorePhoto(file);
        return;
      }

      const photo = await autosave.addPhoto(reportNumber, file, cameraTarget);
      if (cameraTarget === "selfie") {
        setSelfiePhotos((prev) => [...prev, photo]);
        return;
      }

      setReceiptPhotos((prev) => {
        const next = [...prev, photo];
        if (prev.length === 0) {
          setMaterialStores([{ id: genId(), name: "", city: "" }]);
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
        if (next.length === 0) setMaterialStores([]);
        return next;
      });
    },
    [autosave],
  );

  const handleRemoveStorePhoto = useCallback(
    (id: string) => {
      void autosave.removePhoto(id);
      setMaterialStorePhotos((prev) => prev.filter((photo) => photo.id !== id));
    },
    [autosave],
  );

  const handleStoreGalleryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      files.forEach((file) => handleAddMaterialStorePhoto(file));
      event.target.value = "";
    },
    [handleAddMaterialStorePhoto],
  );

  const handleAddStore = useCallback(() => {
    setMaterialStores((prev) => [...prev, { id: genId(), name: "", city: "" }]);
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
      materialStorePhotoCount: materialStorePhotos.length,
      receiptCount: receiptPhotos.length,
      materialStores,
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
      const materialStorePhotosToUpload = skipPhotos ? [] : materialStorePhotos;

      const uploadedSelfieUrls: string[] = [];
      const uploadedSelfieFileIds: string[] = [];
      for (const photo of selfiePhotosToUpload) {
        const result = await uploadPhoto(photo.file);
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
        const result = await uploadPhoto(photo.file);
        if (!result) {
          toast.dismiss(loadingId);
          toast.error("Gagal mengunggah foto nota");
          return;
        }
        uploadedReceiptUrls.push(result.url);
        uploadedReceiptFileIds.push(result.fileId);
      }

      const uploadedStoreUrls: string[] = [];
      const uploadedStoreFileIds: string[] = [];
      for (const photo of materialStorePhotosToUpload) {
        const result = await uploadPhoto(photo.file);
        if (!result) {
          toast.dismiss(loadingId);
          toast.error("Gagal mengunggah foto toko material");
          return;
        }
        uploadedStoreUrls.push(result.url);
        uploadedStoreFileIds.push(result.fileId);
      }

      const result = await startWorkWithPhotos(reportNumber, {
        selfieUrls: uploadedSelfieUrls,
        selfieFileIds: uploadedSelfieFileIds,
        receiptUrls: uploadedReceiptUrls,
        receiptFileIds: uploadedReceiptFileIds,
        materialStores: skipPhotos
          ? []
          : materialStores.map((store, index) => ({
              name: store.name.trim(),
              city: store.city.trim(),
              ...(index === 0 && uploadedStoreUrls.length > 0
                ? { photoUrls: uploadedStoreUrls }
                : {}),
            })),
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
    materialStorePhotos,
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
          title="Toko material"
          description="Foto tampak depan toko tempat pembelian material."
          icon={Store}
          photos={materialStorePhotos}
          disabled={skipPhotos}
          onRemove={handleRemoveStorePhoto}
          onPreview={setPreviewUrl}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={skipPhotos}
                onClick={() => setCameraTarget("store")}
              >
                <Camera data-icon="inline-start" />
                Kamera
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={skipPhotos}
                onClick={() => storeGalleryInputRef.current?.click()}
              >
                <ImagePlus data-icon="inline-start" />
                Galeri
              </Button>
              <input
                ref={storeGalleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleStoreGalleryChange}
              />
            </>
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
            (skipPhotos || receiptPhotos.length === 0) && "opacity-45",
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
                    Data toko muncul setelah foto nota ditambahkan.
                  </p>
                ) : (
                  materialStores.map((store, index) => (
                    <div key={store.id} className="flex gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-2">
                        <Label className="text-xs">Toko {index + 1}</Label>
                        <Input
                          placeholder="Nama toko material"
                          value={store.name}
                          disabled={skipPhotos}
                          onChange={(event) =>
                            handleStoreChange(
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
                            handleStoreChange(
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
                          onClick={() => handleRemoveStore(store.id)}
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
                  disabled={skipPhotos || receiptPhotos.length === 0}
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
