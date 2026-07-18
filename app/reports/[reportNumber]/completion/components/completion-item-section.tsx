import { useState, useEffect } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit2,
  MoreVertical,
  PlusCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { unitOptions, getChecklistItemMeta } from "@/lib/checklist-data";
import { cn } from "@/lib/utils";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import {
  realisasiGrandTotal,
  realisasiNetTotal,
  realisasiTotal,
  type CompletionItemState,
  type RealisasiEntry,
} from "../types";
import {
  formatCurrency,
  formatNumber,
  genId,
  getBeforeImages,
  toRemotePhoto,
} from "../completion-utils";
import { PhotoStrip } from "./photo-strip";

export function CompletionItemSection({
  item,
  estimations,
  state,
  isComplete,
  onChange,
  onOpenCamera,
  onRemoveAfterPhoto,
  onPreview,
}: {
  item: ReportItemJson;
  estimations: MaterialEstimationJson[];
  state: CompletionItemState;
  isComplete: boolean;
  onChange: (patch: Partial<CompletionItemState>) => void;
  onOpenCamera: () => void;
  onRemoveAfterPhoto: (id: string) => void;
  onPreview: (url: string) => void;
}) {
  const beforePhotos = getBeforeImages(item).map((url, idx) =>
    toRemotePhoto(url, idx),
  );
  const estimationTotal = estimations.reduce(
    (sum, estimation) => sum + estimation.totalPrice,
    0,
  );

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === item.itemId) {
        setIsOpen(true);
      }
    };
    window.addEventListener("open-completion-item", handleOpen);
    return () => window.removeEventListener("open-completion-item", handleOpen);
  }, [item.itemId]);

  return (
    <section
      id={`completion-item-${item.itemId}`}
      className="border-b border-border/40 py-4"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex w-full items-start gap-3 cursor-pointer select-none">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                isComplete
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-amber-500/10 text-amber-700",
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <AlertCircle className="size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-left">
                  <h2 className="text-sm font-semibold">
                    {item.itemId}. {item.itemName || getChecklistItemMeta(item.itemId)?.itemName || item.itemId}
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.categoryName || getChecklistItemMeta(item.itemId)?.categoryName || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isComplete
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-amber-500/10 text-amber-700",
                    )}
                  >
                    {isComplete ? "Lengkap" : "Wajib"}
                  </span>
                  <ChevronDown
                    className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {item.condition === "RUSAK" && (
                  <span className="rounded-md bg-destructive/10 px-2 py-1 text-center text-[10px] font-semibold text-destructive">
                    Rusak
                  </span>
                )}
                {item.preventiveCondition === "NOT_OK" && (
                  <span className="rounded-md bg-destructive/10 px-2 py-1 text-center text-[10px] font-semibold text-destructive">
                    Not OK
                  </span>
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>

      <div className="mt-5 grid gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Foto sebelum</Label>
          <div className="mt-2">
            <PhotoStrip
              photos={beforePhotos}
              emptyText="Tidak ada foto sebelum."
              onPreview={onPreview}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">
              Foto sesudah
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCamera}
            >
              <Camera data-icon="inline-start" />
              {state.afterPhotos.length > 0 ? "Tambah Foto" : "Kamera"}
            </Button>
          </div>
          <div className="mt-2">
            <PhotoStrip
              photos={state.afterPhotos}
              emptyText="Belum ada foto sesudah."
              onRemove={onRemoveAfterPhoto}
              onPreview={onPreview}
            />
            {state.afterPhotos.length === 0 && (
              <p className="mt-1.5 text-[11px] font-medium text-destructive">
                Foto sesudah wajib diisi.
              </p>
            )}
          </div>
        </div>
      </div>

      {estimationTotal > 0 && (
        <div className="mt-4 rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-3 py-3">
          <div className="mb-3">
            <p className="text-xs font-semibold text-indigo-900/80 dark:text-indigo-200">
              Estimasi material
            </p>
          </div>
          <div className="space-y-2">
            {estimations.map((estimation, index) => (
              <div
                key={`${estimation.itemId}-${index}`}
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {estimation.materialName}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {formatCurrency(estimation.price)} / {estimation.unit} &times; {estimation.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold">
                    {formatCurrency(estimation.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-indigo-500/20 pt-2">
            <span className="text-xs font-semibold text-indigo-900/80 dark:text-indigo-200">
              Total estimasi
            </span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
              {formatCurrency(estimationTotal)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">
            Realisasi biaya
          </Label>
        </div>
        <RealisasiEditor
          entries={state.realisasiEntries}
          discountAmount={state.discountAmount}
          onEntriesChange={(entries) => onChange({ realisasiEntries: entries })}
          onDiscountChange={(discountAmount) => onChange({ discountAmount })}
        />
        {(state.realisasiEntries.length === 0 ||
          state.realisasiEntries.some(
            (e) =>
              !e.materialName.trim() ||
              e.price === null ||
              typeof e.quantity !== "number" ||
              e.quantity <= 0,
          )) && (
          <p className="mt-1.5 text-[11px] font-medium text-destructive">
            Realisasi biaya wajib diisi lengkap (nama, jumlah &gt; 0, harga).
          </p>
        )}
      </div>

      <div className="mt-4">
        <Label className="text-xs text-muted-foreground">Catatan item</Label>
        <Textarea
          value={state.notes}
          placeholder="Catatan penyelesaian item..."
          className="mt-2 min-h-20 resize-none"
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function PriceInput({
  value,
  onCommit,
  placeholder = "Harga",
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="text-muted-foreground text-sm font-medium">Rp</span>
      </div>
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value === null ? "" : formatNumber(value)}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^0-9]/g, "");
          onCommit(raw ? parseInt(raw, 10) : null);
        }}
        className="pl-9"
      />
    </div>
  );
}

function RealisasiEditor({
  entries,
  discountAmount,
  onEntriesChange,
  onDiscountChange,
}: {
  entries: RealisasiEntry[];
  discountAmount: number;
  onEntriesChange: (entries: RealisasiEntry[]) => void;
  onDiscountChange: (discountAmount: number) => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftEntry, setDraftEntry] = useState<RealisasiEntry | null>(null);

  const handleOpenDialog = (entry?: RealisasiEntry) => {
    if (entry) {
      setDraftEntry({ ...entry });
    } else {
      setDraftEntry({
        id: genId(),
        materialName: "",
        quantity: 1,
        unit: "Pcs",
        price: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!draftEntry) return;
    const exists = entries.some((e) => e.id === draftEntry.id);
    if (exists) {
      onEntriesChange(
        entries.map((e) => (e.id === draftEntry.id ? draftEntry : e)),
      );
    } else {
      onEntriesChange([...entries, draftEntry]);
    }
    setIsDialogOpen(false);
  };

  const handleRemove = (id: string) => {
    onEntriesChange(entries.filter((e) => e.id !== id));
  };

  const subtotal = realisasiGrandTotal(entries);
  const total = realisasiNetTotal(entries, discountAmount);

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-3 text-xs text-muted-foreground text-center">
          Belum ada realisasi barang.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground px-1">
            Ketuk titik tiga untuk edit barang atau hapus.
          </p>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {entry.materialName || "Barang tanpa nama"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {formatCurrency(entry.price ?? 0)} / {entry.unit} &times;{" "}
                  {entry.quantity}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">
                  {formatCurrency(realisasiTotal(entry))}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7"
                    >
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(entry)}>
                      <Edit2 className="mr-2 size-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => handleRemove(entry.id)}
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full bg-background"
        onClick={() => handleOpenDialog()}
      >
        <PlusCircle data-icon="inline-start" className="mr-2 size-4" />
        Tambah Barang
      </Button>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <div className="mt-2 grid grid-cols-[1fr_132px] items-center gap-3">
          <span className="text-muted-foreground">Potongan harga</span>
          <PriceInput
            value={discountAmount}
            placeholder="Potongan"
            onCommit={(value) => onDiscountChange(Math.max(0, value ?? 0))}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/60 pt-2">
          <span className="font-semibold">Total realisasi</span>
          <span className="font-semibold text-emerald-700">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {draftEntry && entries.some((e) => e.id === draftEntry.id)
                ? "Edit Realisasi Barang"
                : "Tambah Realisasi Barang"}
            </DialogTitle>
            <DialogDescription>
              Isi rincian material yang telah direalisasikan.
            </DialogDescription>
          </DialogHeader>

          {draftEntry && (
            <div className="grid gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Nama Barang / Material</Label>
                <Input
                  value={draftEntry.materialName}
                  placeholder="Nama barang"
                  onChange={(e) =>
                    setDraftEntry({
                      ...draftEntry,
                      materialName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-[1fr_104px] gap-2">
                <div className="flex flex-col gap-2">
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={
                      draftEntry.quantity === "" ? "" : draftEntry.quantity
                    }
                    placeholder="Jumlah"
                    onChange={(e) =>
                      setDraftEntry({
                        ...draftEntry,
                        quantity:
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Satuan</Label>
                  <Select
                    value={draftEntry.unit || "Pcs"}
                    onValueChange={(val) =>
                      setDraftEntry({
                        ...draftEntry,
                        unit: val,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Harga Satuan</Label>
                <div className="grid gap-2">
                  <PriceInput
                    value={draftEntry.price}
                    placeholder="Harga satuan"
                    onCommit={(val) =>
                      setDraftEntry({
                        ...draftEntry,
                        price: val,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Isi 0 jika tanpa dana taktis.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                !draftEntry?.materialName.trim() ||
                draftEntry.price === null ||
                !draftEntry.quantity
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
