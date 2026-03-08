import {
    Camera,
    CheckCircle2,
    ClipboardList,
    ImageIcon,
    Receipt,
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
import type { ReportItemJson } from "@/types/report";

type Props = {
    items: ReportItemJson[];
    startSelfieUrls: string[];
    startReceiptUrls: string[];
    formatCurrency: (n: number) => string;
    onPhotoClick: (src: string) => void;
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
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-md border cursor-zoom-in hover:opacity-80 transition-opacity"
                    onClick={() => onPhotoClick(url)}
                />
            ))}
        </div>
    );
}

function EmptyPhotos({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
        </div>
    );
}

export function CompletionTab({
    items,
    startSelfieUrls,
    startReceiptUrls,
    formatCurrency,
    onPhotoClick,
}: Props) {
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
                    <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            Foto Selfie
                        </p>
                        {startSelfieUrls.length > 0 ? (
                            <PhotoGrid
                                urls={startSelfieUrls}
                                onPhotoClick={onPhotoClick}
                            />
                        ) : (
                            <EmptyPhotos label="Belum ada foto selfie." />
                        )}
                    </div>

                    <Separator />

                    {/* Nota/struk awal */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                            Foto Nota / Struk Belanja
                        </p>
                        {startReceiptUrls.length > 0 ? (
                            <PhotoGrid
                                urls={startReceiptUrls}
                                onPhotoClick={onPhotoClick}
                            />
                        ) : (
                            <EmptyPhotos label="Belum ada foto nota/struk." />
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
                        <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                        >
                            {completedItems.length} item
                        </Badge>
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
                                const totalRealisasi = realisasi.reduce(
                                    (sum, r) => sum + r.totalPrice,
                                    0,
                                );

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
                                            return (
                                                <div className="grid grid-cols-2 gap-4">
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
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Foto Sesudah
                                                        </p>
                                                        {afterUrls.length >
                                                        0 ? (
                                                            <PhotoGrid
                                                                urls={afterUrls}
                                                                onPhotoClick={
                                                                    onPhotoClick
                                                                }
                                                            />
                                                        ) : (
                                                            <EmptyPhotos label="Belum ada foto." />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Realisasi biaya table */}
                                        {realisasi.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Realisasi Biaya
                                                </p>
                                                {/* Desktop */}
                                                <div className="hidden md:block rounded-md border overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent text-xs bg-muted/30">
                                                                <TableHead className="h-8">
                                                                    Material
                                                                </TableHead>
                                                                <TableHead className="text-right h-8 w-20">
                                                                    Qty
                                                                </TableHead>
                                                                <TableHead className="text-right h-8 w-32">
                                                                    Harga
                                                                </TableHead>
                                                                <TableHead className="text-right h-8 w-36">
                                                                    Subtotal
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {realisasi.map(
                                                                (r, i) => (
                                                                    <TableRow
                                                                        key={i}
                                                                        className="hover:bg-muted/10"
                                                                    >
                                                                        <TableCell className="text-sm py-2">
                                                                            {
                                                                                r.materialName
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm text-muted-foreground py-2">
                                                                            {
                                                                                r.quantity
                                                                            }{" "}
                                                                            {
                                                                                r.unit
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-mono text-muted-foreground py-2">
                                                                            {formatCurrency(
                                                                                r.price,
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-mono font-medium py-2">
                                                                            {formatCurrency(
                                                                                r.totalPrice,
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ),
                                                            )}
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-2 border-dashed">
                                                                <TableCell
                                                                    colSpan={3}
                                                                    className="text-right text-sm font-semibold py-2"
                                                                >
                                                                    Total
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold font-mono text-primary py-2">
                                                                    {formatCurrency(
                                                                        totalRealisasi,
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                                {/* Mobile */}
                                                <div className="md:hidden rounded-md border divide-y">
                                                    {realisasi.map((r, i) => (
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
                                                                {r.quantity}{" "}
                                                                {r.unit} ×{" "}
                                                                {formatCurrency(
                                                                    r.price,
                                                                )}
                                                            </p>
                                                        </div>
                                                    ))}
                                                    <div className="p-3 flex justify-between items-center bg-muted/30">
                                                        <p className="text-sm font-semibold">
                                                            Total Realisasi
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
