import {
    Camera,
    CheckCircle2,
    ClipboardList,
    Eye,
    ImageIcon,
    Receipt,
    SkipForward,
    Store,
    User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { resolvePhotoUrl } from "@/lib/storage/photo-url";
import type {
    ReportItemJson,
    MaterialEstimationJson,
    MaterialStoreJson,
} from "@/types/report";

type Props = {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    startSelfieUrls: string[];
    startReceiptUrls: string[];
    startMaterialStores: MaterialStoreJson[];
    completionAdditionalPhotos: string[];
    completionAdditionalNote: string | null;
    formatCurrency: (n: number) => string;
    onPhotoClick: (src: string) => void;
    /** Pass true when viewer is BMC reviewing PENDING_REVIEW */
    isReviewer?: boolean;
    /** Called whenever a photo in a tracked section is clicked */
    onSectionViewed?: (sectionId: string) => void;
    /** Set of section IDs already viewed (from parent state) */
    viewedSections?: Set<string>;
    /** True when total estimation is Rp 0 — selfie & nota were intentionally skipped */
    isZeroCost?: boolean;
};

function PhotoGrid({
    urls,
    onPhotoClick,
}: {
    urls: string[];
    onPhotoClick: (src: string) => void;
}) {
    if (urls.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={i}
                    src={resolvePhotoUrl(url)}
                    alt={`Foto ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-md border cursor-zoom-in hover:opacity-80 transition-opacity"
                    onClick={() => onPhotoClick(resolvePhotoUrl(url))}
                />
            ))}
        </div>
    );
}

function EmptyPhotos({
    label,
    skipped = false,
}: {
    label: string;
    skipped?: boolean;
}) {
    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            {skipped ? (
                <ImageIcon className="h-4 w-4 shrink-0" />
            ) : (
                <ImageIcon className="h-4 w-4 shrink-0" />
            )}
            <span className={skipped ? "text-amber-700" : ""}>{label}</span>
        </div>
    );
}

export function CompletionTab({
    items,
    estimations,
    startSelfieUrls,
    startReceiptUrls,
    startMaterialStores,
    completionAdditionalPhotos,
    completionAdditionalNote,
    formatCurrency,
    onPhotoClick,
    isReviewer = false,
    onSectionViewed,
    viewedSections = new Set(),
    isZeroCost = false,
}: Props) {
    function makeClickHandler(sectionId: string) {
        return (src: string) => {
            onSectionViewed?.(sectionId);
            onPhotoClick(src);
        };
    }

    const startMaterialStorePhotos = Array.from(
        new Set(startMaterialStores.flatMap((store) => store.photoUrls ?? [])),
    );

    // Calculate grand total realization across all items
    const grandTotalRealisasi = items.reduce((total, item) => {
        const realisasiItems = item.realisasiItems ?? [];
        const itemTotal = realisasiItems.reduce(
            (sum, r) => sum + (r.totalPrice || 0),
            0,
        );
        return total + itemTotal;
    }, 0);

    // Items that are BMS-handled and broken/not-ok — show even if only before
    // photos exist (e.g. IN_PROGRESS: work started but not yet submitted).
    // `images` is the newer multi-photo field; `photoUrl` is the legacy single-
    // photo field — most existing reports still use photoUrl.
    const completedItems = items.filter(
        (item) =>
            (item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK") &&
            item.handler === "BMS" &&
            ((item.images && item.images.length > 0) ||
                !!item.photoUrl ||
                (item.afterImages && item.afterImages.length > 0)),
    );

    return (
        <div className="space-y-4">
            {/* ── Start-work section ─────────────────────────────────────── */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="border-b pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        Data Mulai Pengerjaan
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Selfie */}
                    <div id="review-selfie" className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            Foto Selfie
                            {isReviewer &&
                                startSelfieUrls.length > 0 &&
                                (viewedSections.has("selfie") ? (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                        Sudah ditinjau
                                    </span>
                                ) : (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Eye className="h-3.5 w-3.5" /> Klik
                                        foto untuk meninjau
                                    </span>
                                ))}
                        </p>
                        {startSelfieUrls.length > 0 ? (
                            <PhotoGrid
                                urls={startSelfieUrls}
                                onPhotoClick={makeClickHandler("selfie")}
                            />
                        ) : (
                            <EmptyPhotos
                                label={
                                    isZeroCost
                                        ? "Dilewati — estimasi tanpa biaya"
                                        : "Belum ada foto selfie."
                                }
                                skipped={isZeroCost}
                            />
                        )}
                    </div>

                    <Separator />

                    {/* Foto toko material */}
                    <div id="review-store" className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-muted-foreground" />
                            Foto Toko Material
                            {isReviewer &&
                                startMaterialStorePhotos.length > 0 &&
                                (viewedSections.has("store") ? (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                        Sudah ditinjau
                                    </span>
                                ) : (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Eye className="h-3.5 w-3.5" /> Klik
                                        foto untuk meninjau
                                    </span>
                                ))}
                        </p>
                        {startMaterialStorePhotos.length > 0 ? (
                            <PhotoGrid
                                urls={startMaterialStorePhotos}
                                onPhotoClick={makeClickHandler("store")}
                            />
                        ) : (
                            <EmptyPhotos
                                label={
                                    isZeroCost
                                        ? "Dilewati — estimasi tanpa biaya"
                                        : "Belum ada foto toko material."
                                }
                                skipped={isZeroCost}
                            />
                        )}
                    </div>

                    <Separator />

                    {/* Nota/struk awal */}
                    <div id="review-nota" className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                            Foto Nota / Struk Belanja
                            {isReviewer &&
                                startReceiptUrls.length > 0 &&
                                (viewedSections.has("nota") ? (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                        Sudah ditinjau
                                    </span>
                                ) : (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Eye className="h-3.5 w-3.5" /> Klik
                                        foto untuk meninjau
                                    </span>
                                ))}
                        </p>
                        {startReceiptUrls.length > 0 ? (
                            <>
                                <PhotoGrid
                                    urls={startReceiptUrls}
                                    onPhotoClick={makeClickHandler("nota")}
                                />
                                {startMaterialStores.length > 0 ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                                        <div className="mb-3">
                                            <p className="text-sm font-semibold text-amber-900">
                                                Toko Material
                                            </p>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {startMaterialStores.map(
                                                (store) => (
                                                    <div
                                                        key={`${store.name}-${store.city}`}
                                                        className="rounded-md border border-border/70 bg-background px-3 py-2"
                                                    >
                                                        <p className="text-sm font-medium text-foreground">
                                                            {store.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Alamat: {store.city}
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <EmptyPhotos
                                label={
                                    isZeroCost
                                        ? "Dilewati — estimasi tanpa biaya"
                                        : "Belum ada foto nota/struk."
                                }
                                skipped={isZeroCost}
                            />
                        )}
                    </div>

                    <Separator />

                    {/* Dokumentasi tambahan */}
                    <div id="review-additional-docs" className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Dokumentasi Tambahan
                            {isReviewer &&
                                completionAdditionalPhotos.length > 0 &&
                                (viewedSections.has("additional-docs") ? (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                        Sudah ditinjau
                                    </span>
                                ) : (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Eye className="h-3.5 w-3.5" /> Klik
                                        foto untuk meninjau
                                    </span>
                                ))}
                        </p>
                        {completionAdditionalPhotos.length > 0 ? (
                            <PhotoGrid
                                urls={completionAdditionalPhotos}
                                onPhotoClick={makeClickHandler(
                                    "additional-docs",
                                )}
                            />
                        ) : (
                            <EmptyPhotos label="Belum ada dokumentasi tambahan." />
                        )}
                        {completionAdditionalNote && (
                            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Catatan Dokumentasi Tambahan
                                </p>
                                <p className="text-sm mt-1 whitespace-pre-line">
                                    {completionAdditionalNote}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Per-item completion data ────────────────────────────────── */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            Realisasi Pekerjaan
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                            >
                                {completedItems.length} item
                            </Badge>
                            {grandTotalRealisasi > 0 && (
                                <Badge
                                    variant="outline"
                                    className="font-mono text-sm bg-background"
                                >
                                    Total: {formatCurrency(grandTotalRealisasi)}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {completedItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Belum ada data realisasi pekerjaan.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {completedItems.map((item) => {
                                const realisasi = item.realisasiItems ?? [];
                                const estimasiItem = estimations.filter(
                                    (e) => e.itemId === item.itemId,
                                );
                                const totalRealisasi = realisasi.reduce(
                                    (sum, r) => sum + r.totalPrice,
                                    0,
                                );
                                const totalEstimasi = estimasiItem.reduce(
                                    (sum, e) => sum + e.totalPrice,
                                    0,
                                );
                                const selisih = totalRealisasi - totalEstimasi;

                                return (
                                    <div
                                        key={item.itemId}
                                        className="p-4 space-y-4"
                                    >
                                        {/* Item header */}
                                        <div className="flex items-start gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs shrink-0 mt-0.5"
                                            >
                                                {item.itemId}
                                            </Badge>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold leading-snug">
                                                    {item.itemName}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {item.categoryName}
                                                </p>
                                            </div>
                                            {totalRealisasi > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="font-mono text-xs ml-auto shrink-0"
                                                >
                                                    {formatCurrency(
                                                        totalRealisasi,
                                                    )}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Before & after photos — side by side */}
                                        {(() => {
                                            const beforeUrls =
                                                item.images &&
                                                item.images.length > 0
                                                    ? item.images
                                                    : item.photoUrl
                                                      ? [item.photoUrl]
                                                      : [];
                                            const afterUrls =
                                                item.afterImages ?? [];
                                            if (
                                                beforeUrls.length === 0 &&
                                                afterUrls.length === 0
                                            )
                                                return null;
                                            const afterSectionId = `after-${item.itemId}`;
                                            return (
                                                <div
                                                    id={`review-${afterSectionId}`}
                                                    className="grid grid-cols-2 gap-4"
                                                >
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Foto Sebelum
                                                        </p>
                                                        {beforeUrls.length >
                                                        0 ? (
                                                            <PhotoGrid
                                                                urls={
                                                                    beforeUrls
                                                                }
                                                                onPhotoClick={
                                                                    onPhotoClick
                                                                }
                                                            />
                                                        ) : (
                                                            <EmptyPhotos label="Belum ada foto." />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            Foto Sesudah
                                                            {isReviewer &&
                                                                afterUrls.length >
                                                                    0 &&
                                                                (viewedSections.has(
                                                                    afterSectionId,
                                                                ) ? (
                                                                    <span className="flex items-center gap-1 text-emerald-600 normal-case">
                                                                        <CheckCircle2 className="h-3 w-3" />{" "}
                                                                        Ditinjau
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-amber-600 normal-case">
                                                                        <Eye className="h-3 w-3" />{" "}
                                                                        Klik
                                                                        foto
                                                                    </span>
                                                                ))}
                                                        </p>
                                                        {afterUrls.length >
                                                        0 ? (
                                                            <PhotoGrid
                                                                urls={afterUrls}
                                                                onPhotoClick={makeClickHandler(
                                                                    afterSectionId,
                                                                )}
                                                            />
                                                        ) : (
                                                            <EmptyPhotos label="Belum ada foto." />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Realisasi biaya table */}
                                        {(realisasi.length > 0 ||
                                            estimasiItem.length > 0) && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Realisasi Biaya
                                                </p>

                                                {/* ── Estimasi (per item) ─────────────────────────── */}
                                                {estimasiItem.length > 0 && (
                                                    <div className="rounded-md border overflow-hidden">
                                                        <div className="bg-muted/50 px-3 py-1.5">
                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                Estimasi
                                                                Sebelumnya
                                                            </p>
                                                        </div>
                                                        {/* Desktop */}
                                                        <div className="hidden md:block">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent text-xs bg-muted/20">
                                                                        <TableHead className="h-7 text-xs">
                                                                            Material
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-20 text-xs">
                                                                            Qty
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-32 text-xs">
                                                                            Harga
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-36 text-xs">
                                                                            Subtotal
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {estimasiItem.map(
                                                                        (
                                                                            e,
                                                                            i,
                                                                        ) => (
                                                                            <TableRow
                                                                                key={
                                                                                    i
                                                                                }
                                                                                className="hover:bg-muted/10"
                                                                            >
                                                                                <TableCell className="text-sm py-1.5">
                                                                                    {
                                                                                        e.materialName
                                                                                    }
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm text-muted-foreground py-1.5">
                                                                                    {
                                                                                        e.quantity
                                                                                    }{" "}
                                                                                    {
                                                                                        e.unit
                                                                                    }
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm font-mono text-muted-foreground py-1.5">
                                                                                    {formatCurrency(
                                                                                        e.price,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm font-mono py-1.5">
                                                                                    {formatCurrency(
                                                                                        e.totalPrice,
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ),
                                                                    )}
                                                                    <TableRow className="bg-muted/20 hover:bg-muted/20 border-t border-dashed">
                                                                        <TableCell
                                                                            colSpan={
                                                                                3
                                                                            }
                                                                            className="text-right text-xs font-semibold py-1.5 text-muted-foreground"
                                                                        >
                                                                            Total
                                                                            Estimasi
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-bold font-mono text-muted-foreground py-1.5">
                                                                            {formatCurrency(
                                                                                totalEstimasi,
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        {/* Mobile */}
                                                        <div className="md:hidden divide-y">
                                                            {estimasiItem.map(
                                                                (e, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="p-3 space-y-0.5"
                                                                    >
                                                                        <div className="flex justify-between items-start gap-2">
                                                                            <p className="text-sm font-medium">
                                                                                {
                                                                                    e.materialName
                                                                                }
                                                                            </p>
                                                                            <p className="text-sm font-mono shrink-0">
                                                                                {formatCurrency(
                                                                                    e.totalPrice,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                e.quantity
                                                                            }{" "}
                                                                            {
                                                                                e.unit
                                                                            }{" "}
                                                                            ×{" "}
                                                                            {formatCurrency(
                                                                                e.price,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                ),
                                                            )}
                                                            <div className="p-3 flex justify-between items-center bg-muted/20">
                                                                <p className="text-xs font-semibold text-muted-foreground">
                                                                    Total
                                                                    Estimasi
                                                                </p>
                                                                <p className="text-sm font-bold font-mono text-muted-foreground">
                                                                    {formatCurrency(
                                                                        totalEstimasi,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Realisasi aktual ──────────────────────────── */}
                                                {realisasi.length > 0 && (
                                                    <div className="rounded-md border overflow-hidden">
                                                        <div className="bg-primary/5 px-3 py-1.5">
                                                            <p className="text-xs font-semibold text-primary">
                                                                Realisasi Aktual
                                                            </p>
                                                        </div>
                                                        {/* Desktop */}
                                                        <div className="hidden md:block">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent text-xs bg-muted/20">
                                                                        <TableHead className="h-7 text-xs">
                                                                            Material
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-20 text-xs">
                                                                            Qty
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-32 text-xs">
                                                                            Harga
                                                                        </TableHead>
                                                                        <TableHead className="text-right h-7 w-36 text-xs">
                                                                            Subtotal
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {realisasi.map(
                                                                        (
                                                                            r,
                                                                            i,
                                                                        ) => (
                                                                            <TableRow
                                                                                key={
                                                                                    i
                                                                                }
                                                                                className="hover:bg-muted/10"
                                                                            >
                                                                                <TableCell className="text-sm py-1.5">
                                                                                    {
                                                                                        r.materialName
                                                                                    }
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm text-muted-foreground py-1.5">
                                                                                    {
                                                                                        r.quantity
                                                                                    }{" "}
                                                                                    {
                                                                                        r.unit
                                                                                    }
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm font-mono text-muted-foreground py-1.5">
                                                                                    {formatCurrency(
                                                                                        r.price,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm font-mono font-medium py-1.5">
                                                                                    {formatCurrency(
                                                                                        r.totalPrice,
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ),
                                                                    )}
                                                                    <TableRow className="bg-primary/5 hover:bg-primary/5 border-t border-dashed">
                                                                        <TableCell
                                                                            colSpan={
                                                                                3
                                                                            }
                                                                            className="text-right text-xs font-semibold py-1.5"
                                                                        >
                                                                            Total
                                                                            Realisasi
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-bold font-mono text-primary py-1.5">
                                                                            {formatCurrency(
                                                                                totalRealisasi,
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        {/* Mobile */}
                                                        <div className="md:hidden divide-y">
                                                            {realisasi.map(
                                                                (r, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="p-3 space-y-0.5"
                                                                    >
                                                                        <div className="flex justify-between items-start gap-2">
                                                                            <p className="text-sm font-medium">
                                                                                {
                                                                                    r.materialName
                                                                                }
                                                                            </p>
                                                                            <p className="text-sm font-mono font-semibold text-primary shrink-0">
                                                                                {formatCurrency(
                                                                                    r.totalPrice,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                r.quantity
                                                                            }{" "}
                                                                            {
                                                                                r.unit
                                                                            }{" "}
                                                                            ×{" "}
                                                                            {formatCurrency(
                                                                                r.price,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                ),
                                                            )}
                                                            <div className="p-3 flex justify-between items-center bg-primary/5">
                                                                <p className="text-sm font-semibold">
                                                                    Total
                                                                    Realisasi
                                                                </p>
                                                                <p className="text-sm font-bold font-mono text-primary">
                                                                    {formatCurrency(
                                                                        totalRealisasi,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Selisih ───────────────────────────────────── */}
                                                {estimasiItem.length > 0 &&
                                                    realisasi.length > 0 && (
                                                        <div
                                                            className={`flex items-center justify-between rounded-md border px-4 py-2.5 ${
                                                                selisih > 0
                                                                    ? "bg-red-50 border-red-200"
                                                                    : selisih <
                                                                        0
                                                                      ? "bg-emerald-50 border-emerald-200"
                                                                      : "bg-muted/30 border-border"
                                                            }`}
                                                        >
                                                            <p className="text-sm font-semibold">
                                                                Selisih
                                                            </p>
                                                            <div className="text-right">
                                                                <p
                                                                    className={`text-sm font-bold font-mono ${
                                                                        selisih >
                                                                        0
                                                                            ? "text-red-600"
                                                                            : selisih <
                                                                                0
                                                                              ? "text-emerald-600"
                                                                              : "text-muted-foreground"
                                                                    }`}
                                                                >
                                                                    {selisih > 0
                                                                        ? "+"
                                                                        : ""}
                                                                    {formatCurrency(
                                                                        selisih,
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {selisih > 0
                                                                        ? "Melebihi estimasi"
                                                                        : selisih <
                                                                            0
                                                                          ? "Di bawah estimasi"
                                                                          : "Sesuai estimasi"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        {/* Completion notes */}
                                        {item.completionNotes && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Catatan
                                                </p>
                                                <p className="text-sm bg-muted/30 rounded-md p-2.5">
                                                    {item.completionNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
