"use client";

import { useMemo, useState, type PointerEvent, type WheelEvent } from "react";
import {
    ArrowRightLeft,
    ImageIcon,
    Package,
    ReceiptText,
    RotateCcw,
    Store,
    ZoomIn,
    ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingImage } from "@/components/ui/loading-image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type {
    DetailPhoto,
    ReportDetailModel,
    WorkItem,
} from "../_lib/detail-data";
import {
    ConditionBadge,
    EmptyState,
    PhotoStrip,
    WorkNotes,
} from "./shared-ui";
import {
    formatCurrency,
    formatHandler,
    formatMoneyCell,
    getRealizationComparisonRows,
    getReceiptPhotos,
    getReportMaterialStores,
    isAfterInProgressStatus,
    type RealizationComparisonRow,
    type ReportMaterialStoreRow,
} from "./report-detail-utils";
import { useReportApprovalReviewGate } from "./report-approval-review-gate";

export function WorkCostTab({
    report,
    onPhotoClick,
}: {
    report: ReportDetailModel;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    const [compareOpen, setCompareOpen] = useState(false);
    const reviewGate = useReportApprovalReviewGate();
    const canCompareWithReceipt = isAfterInProgressStatus(report.status);
    const materialStores = useMemo(
        () => getReportMaterialStores(report),
        [report],
    );
    const receiptPhotos = useMemo(() => getReceiptPhotos(report), [report]);
    const completionAdditionalPhotos = useMemo(
        () =>
            report.photos.filter(
                (photo) => photo.source === "Dokumentasi tambahan",
            ),
        [report.photos],
    );
    const realizationRows = useMemo(
        () => getRealizationComparisonRows(report),
        [report],
    );
    const realizationTotal = realizationRows.reduce(
        (total, row) => total + row.total,
        0,
    );

    if (report.workItems.length === 0) {
        return (
            <EmptyState
                icon={Package}
                title="Belum ada detail pekerjaan"
                description="Item bermasalah, estimasi, atau realisasi belum tercatat pada laporan ini."
            />
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {canCompareWithReceipt ||
            materialStores.length > 0 ||
            completionAdditionalPhotos.length > 0 ? (
                <WorkCostToolsSection
                    canCompareWithReceipt={canCompareWithReceipt}
                    receiptCount={receiptPhotos.length}
                    realizationRowCount={
                        realizationRows.filter((row) => !row.isDiscount).length
                    }
                    stores={materialStores}
                    completionAdditionalPhotos={completionAdditionalPhotos}
                    completionAdditionalNote={report.completionAdditionalNote}
                    onPhotoClick={onPhotoClick}
                    onCompareClick={() => {
                        reviewGate.markReceiptComparisonOpened();
                        setCompareOpen(true);
                    }}
                />
            ) : null}

            {report.workItems.map((item) => (
                <WorkItemPanel
                    key={item.itemId}
                    item={item}
                    onPhotoClick={(photo) => {
                        reviewGate.markPhotoOpened(photo.id);
                        onPhotoClick(photo);
                    }}
                />
            ))}

            <ReceiptCompareDialog
                open={compareOpen}
                onOpenChange={setCompareOpen}
                photos={receiptPhotos}
                rows={realizationRows}
                total={realizationTotal}
            />
        </div>
    );
}

function WorkCostToolsSection({
    canCompareWithReceipt,
    receiptCount,
    realizationRowCount,
    stores,
    completionAdditionalPhotos,
    completionAdditionalNote,
    onPhotoClick,
    onCompareClick,
}: {
    canCompareWithReceipt: boolean;
    receiptCount: number;
    realizationRowCount: number;
    stores: ReportMaterialStoreRow[];
    completionAdditionalPhotos: DetailPhoto[];
    completionAdditionalNote: string | null;
    onPhotoClick: (photo: DetailPhoto) => void;
    onCompareClick: () => void;
}) {
    const reviewGate = useReportApprovalReviewGate();

    return (
        <div className="flex flex-wrap items-stretch gap-3">
            {canCompareWithReceipt ? (
                <QuickActionsSection
                    receiptCount={receiptCount}
                    realizationRowCount={realizationRowCount}
                    needsReview={
                        reviewGate.enabled &&
                        !reviewGate.hasOpenedReceiptComparison
                    }
                    onCompareClick={onCompareClick}
                />
            ) : null}
            {stores.length > 0 ? (
                <MaterialStoresSection stores={stores} />
            ) : null}
            {completionAdditionalPhotos.length > 0 ? (
                <CompletionDocumentationSection
                    photos={completionAdditionalPhotos}
                    note={completionAdditionalNote}
                    onPhotoClick={onPhotoClick}
                />
            ) : null}
        </div>
    );
}

function QuickActionsSection({
    receiptCount,
    realizationRowCount,
    needsReview,
    onCompareClick,
}: {
    receiptCount: number;
    realizationRowCount: number;
    needsReview: boolean;
    onCompareClick: () => void;
}) {
    return (
        <section
            data-review-required={needsReview ? "true" : undefined}
            data-tour="approval-compare-nota"
            className="w-full rounded-lg border bg-background px-3 py-2 sm:w-[320px]"
        >
            <div className="flex h-full flex-col justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">Aksi Cepat</h2>
                        {needsReview ? (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                Perlu dicek
                            </Badge>
                        ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {receiptCount} foto nota, {realizationRowCount} baris
                        realisasi.
                    </p>
                </div>
                <Button size="sm" onClick={onCompareClick}>
                    <ArrowRightLeft data-icon="inline-start" />
                    Bandingkan dengan Nota
                </Button>
            </div>
        </section>
    );
}

function MaterialStoresSection({
    stores,
}: {
    stores: ReportMaterialStoreRow[];
}) {
    return (
        <section className="w-full overflow-hidden rounded-lg border bg-background sm:w-auto sm:min-w-[360px] sm:max-w-3xl">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Store className="size-4 text-muted-foreground" />
                    <h2 className="truncate text-sm font-semibold">
                        Toko material laporan
                    </h2>
                </div>
                <Badge variant="secondary">{stores.length} toko</Badge>
            </div>
            <div className="flex flex-wrap gap-2 p-2">
                {stores.map((store) => (
                    <div
                        key={store.id}
                        className="min-w-48 rounded-md border bg-muted/20 px-2 py-1.5 text-xs"
                    >
                        <p className="truncate font-medium">{store.name}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-3 text-muted-foreground">
                            <span className="truncate">{store.city}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function CompletionDocumentationSection({
    photos,
    note,
    onPhotoClick,
}: {
    photos: DetailPhoto[];
    note: string | null;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    return (
        <section className="w-full overflow-hidden rounded-lg border bg-background sm:w-[360px]">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <ImageIcon className="size-4 text-muted-foreground" />
                    <h2 className="truncate text-sm font-semibold">
                        Dokumentasi tambahan
                    </h2>
                </div>
                <Badge variant="secondary">{photos.length} foto</Badge>
            </div>
            <div className="flex flex-col gap-2 p-2">
                <PhotoStrip photos={photos} onPhotoClick={onPhotoClick} />
                {note ? (
                    <p className="rounded-md border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
                        {note}
                    </p>
                ) : null}
            </div>
        </section>
    );
}

function ReceiptCompareDialog({
    open,
    onOpenChange,
    photos,
    rows,
    total,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    photos: DetailPhoto[];
    rows: RealizationComparisonRow[];
    total: number;
}) {
    const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [drag, setDrag] = useState<{
        pointerId: number;
        originX: number;
        originY: number;
        startX: number;
        startY: number;
    } | null>(null);
    const [pinch, setPinch] = useState<{
        pointers: Map<number, { x: number; y: number }>;
        initialDistance: number;
        initialZoom: number;
    } | null>(null);
    const activePhoto =
        photos.find((photo) => photo.id === activePhotoId) ?? photos[0] ?? null;

    function resetImageView() {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setDrag(null);
        setPinch(null);
    }

    function updateZoom(nextZoom: number) {
        const clamped = Math.min(4, Math.max(1, Number(nextZoom.toFixed(2))));
        setZoom(clamped);
        if (clamped === 1) {
            setPan({ x: 0, y: 0 });
        }
    }

    function handleWheel(event: WheelEvent<HTMLDivElement>) {
        if (!activePhoto) return;
        event.preventDefault();
        updateZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
    }

    function getDistance(
        p1: { x: number; y: number },
        p2: { x: number; y: number },
    ) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        if (!activePhoto) return;

        event.currentTarget.setPointerCapture(event.pointerId);

        const newPinch = pinch
            ? { ...pinch, pointers: new Map(pinch.pointers) }
            : {
                  pointers: new Map<number, { x: number; y: number }>(),
                  initialDistance: 0,
                  initialZoom: zoom,
              };
        newPinch.pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        if (newPinch.pointers.size === 2) {
            const points = Array.from(newPinch.pointers.values());
            newPinch.initialDistance = getDistance(points[0], points[1]);
            newPinch.initialZoom = zoom;
            setDrag(null);
        } else if (newPinch.pointers.size === 1 && zoom > 1) {
            setDrag({
                pointerId: event.pointerId,
                originX: event.clientX,
                originY: event.clientY,
                startX: pan.x,
                startY: pan.y,
            });
        }

        setPinch(newPinch);
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (!activePhoto) return;

        if (pinch && pinch.pointers.size >= 2 && pinch.pointers.has(event.pointerId)) {
            const newPinch = { ...pinch, pointers: new Map(pinch.pointers) };
            newPinch.pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            const points = Array.from(newPinch.pointers.values()).slice(0, 2);
            const currentDistance = getDistance(points[0], points[1]);

            if (newPinch.initialDistance > 0) {
                const scale = currentDistance / newPinch.initialDistance;
                updateZoom(newPinch.initialZoom * scale);
            }

            setPinch(newPinch);
            return;
        }

        if (!drag || drag.pointerId !== event.pointerId || zoom <= 1) return;

        setPan({
            x: drag.startX + event.clientX - drag.originX,
            y: drag.startY + event.clientY - drag.originY,
        });
    }

    function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (pinch && pinch.pointers.has(event.pointerId)) {
            const newPinch = { ...pinch, pointers: new Map(pinch.pointers) };
            newPinch.pointers.delete(event.pointerId);

            if (newPinch.pointers.size < 2) {
                newPinch.initialDistance = 0;
            }

            setPinch(newPinch);
        }

        if (drag && drag.pointerId === event.pointerId) {
            setDrag(null);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) resetImageView();
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-6xl md:overflow-hidden xl:max-w-7xl">
                <DialogHeader className="border-b px-4 py-5">
                    <DialogTitle>Bandingkan dengan Nota</DialogTitle>
                </DialogHeader>
                <div className="grid max-h-[calc(100dvh-8rem)] min-h-0 lg:max-h-[calc(100vh-10rem)] lg:min-h-[520px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <section className="flex min-h-0 flex-col border-b bg-muted/20 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                            <div className="flex items-center gap-2">
                                <ReceiptText className="size-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">
                                    Foto nota
                                </h3>
                            </div>
                            <Badge variant="secondary">
                                {photos.length} foto
                            </Badge>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div
                                className={cn(
                                    "relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-black p-2",
                                    activePhoto &&
                                        (zoom > 1
                                            ? drag
                                                ? "cursor-grabbing"
                                                : "cursor-grab"
                                            : "cursor-zoom-in"),
                                )}
                                onWheel={handleWheel}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerEnd}
                                onPointerCancel={handlePointerEnd}
                                onDoubleClick={() =>
                                    updateZoom(zoom === 1 ? 2 : 1)
                                }
                            >
                                {activePhoto ? (
                                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-background/95 p-1 shadow-sm">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            disabled={zoom <= 1}
                                            onClick={() =>
                                                updateZoom(zoom - 0.25)
                                            }
                                            aria-label="Perkecil foto nota"
                                        >
                                            <ZoomOut />
                                        </Button>
                                        <span className="min-w-11 text-center font-mono text-xs text-foreground">
                                            {Math.round(zoom * 100)}%
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            disabled={zoom >= 4}
                                            onClick={() =>
                                                updateZoom(zoom + 0.25)
                                            }
                                            aria-label="Perbesar foto nota"
                                        >
                                            <ZoomIn />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            disabled={
                                                zoom === 1 &&
                                                pan.x === 0 &&
                                                pan.y === 0
                                            }
                                            onClick={() => {
                                                setZoom(1);
                                                setPan({ x: 0, y: 0 });
                                            }}
                                            aria-label="Reset posisi foto nota"
                                        >
                                            <RotateCcw />
                                        </Button>
                                    </div>
                                ) : null}
                                {activePhoto ? (
                                    <LoadingImage
                                        wrapperClassName="flex size-full items-center justify-center bg-transparent"
                                        loadingLabel="Memuat foto nota..."
                                        errorLabel="Foto nota gagal dimuat"
                                        src={activePhoto.url}
                                        alt={activePhoto.label}
                                        className="size-full object-contain will-change-transform"
                                        draggable={false}
                                        style={{
                                            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                                            transition: drag
                                                ? "none"
                                                : "transform 120ms ease-out",
                                        }}
                                    />
                                ) : (
                                    <div className="rounded-md border border-dashed border-white/20 px-4 py-8 text-center text-xs text-white/60">
                                        Belum ada foto nota.
                                    </div>
                                )}
                            </div>
                            {photos.length > 0 ? (
                                <div className="flex gap-2 overflow-x-auto border-t bg-background p-2">
                                    {photos.map((photo) => (
                                        <button
                                            key={photo.id}
                                            type="button"
                                            className={cn(
                                                "relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted",
                                                activePhoto?.id === photo.id &&
                                                    "ring-2 ring-primary ring-offset-2",
                                            )}
                                            onClick={() => {
                                                setActivePhotoId(photo.id);
                                                resetImageView();
                                            }}
                                        >
                                            <LoadingImage
                                                wrapperClassName="size-full"
                                                src={photo.url}
                                                alt={photo.label}
                                                className="size-full object-contain"
                                            />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="min-h-0 overflow-auto bg-background">
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Tabel realisasi
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {
                                        rows.filter((row) => !row.isDiscount)
                                            .length
                                    }{" "}
                                    material
                                </p>
                            </div>
                        </div>
                        {rows.length === 0 ? (
                            <div className="flex min-h-80 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                                Belum ada realisasi untuk dibandingkan.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="h-8 w-28">
                                            Item
                                        </TableHead>
                                        <TableHead className="h-8 min-w-56">
                                            Material
                                        </TableHead>
                                        <TableHead className="h-8 w-24 text-right">
                                            Qty
                                        </TableHead>
                                        <TableHead className="h-8 w-28 text-right">
                                            Harga
                                        </TableHead>
                                        <TableHead className="h-8 w-28 text-right">
                                            Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className={cn(
                                                row.isDiscount && "bg-muted/20",
                                            )}
                                        >
                                            <TableCell className="py-1.5 text-xs">
                                                <p className="font-mono font-medium">
                                                    {row.itemId}
                                                </p>
                                                <p className="truncate text-muted-foreground">
                                                    {row.itemName}
                                                </p>
                                            </TableCell>
                                            <TableCell className="max-w-80 whitespace-normal py-1.5 text-xs font-medium">
                                                {row.materialName}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right text-xs text-muted-foreground">
                                                {row.quantityLabel}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-xs">
                                                {row.price === null
                                                    ? ""
                                                    : formatCurrency(row.price)}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    "py-1.5 text-right font-mono text-xs font-semibold",
                                                    row.total < 0 &&
                                                        "text-blue-600",
                                                )}
                                            >
                                                {formatMoneyCell(row.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableCell
                                            colSpan={4}
                                            className="py-2 text-right text-xs font-semibold"
                                        >
                                            Total realisasi
                                        </TableCell>
                                        <TableCell className="py-2 text-right font-mono text-xs font-semibold">
                                            {formatCurrency(total)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function WorkItemPanel({
    item,
    onPhotoClick,
}: {
    item: WorkItem;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    const reviewGate = useReportApprovalReviewGate();
    const photos = [
        ...item.beforePhotos,
        ...item.afterPhotos,
        ...item.receiptPhotos,
    ];
    const needsPhotoReview =
        reviewGate.enabled &&
        photos.length > 0 &&
        photos.some((photo) => !reviewGate.isPhotoOpened(photo.id));

    return (
        <section
            data-review-required={needsPhotoReview ? "true" : undefined}
            className="overflow-hidden rounded-lg border bg-background"
        >
            <div className="flex flex-col gap-2 border-b bg-muted/30 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                        {item.itemId}
                    </Badge>
                    <h2 className="truncate text-sm font-semibold">
                        {item.itemName}
                    </h2>
                    <ConditionBadge
                        label={item.conditionLabel}
                        tone={item.conditionTone}
                    />
                    {item.handler ? (
                        <Badge variant="secondary">
                            Handler {formatHandler(item.handler)}
                        </Badge>
                    ) : null}
                </div>
            </div>

            <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <CostTable
                    title="Estimasi disetujui"
                    rows={item.estimations.map((row) => ({
                        name: row.materialName,
                        quantity: row.quantity,
                        unit: row.unit,
                        price: row.price,
                        total: row.totalPrice,
                    }))}
                    total={item.estimationTotal}
                    empty="Belum ada estimasi item ini."
                />
                <CostTable
                    title="Realisasi lapangan"
                    rows={item.realisasiItems.map((row) => ({
                        name: row.materialName,
                        quantity: row.quantity,
                        unit: row.unit,
                        price: row.price,
                        total: row.totalPrice ?? row.quantity * row.price,
                    }))}
                    total={item.realisasiTotal}
                    discount={item.discountAmount}
                    empty="Belum ada realisasi item ini."
                />
            </div>

            <div className="grid gap-3 border-t bg-muted/10 px-3 py-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <WorkNotes item={item} />
                <div className="grid gap-2">
                    <div data-tour="approval-work-photos">
                        <PhotoStrip
                            title="Foto"
                            titleAccessory={
                                needsPhotoReview ? (
                                    <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                        Perlu dicek
                                    </Badge>
                                ) : null
                            }
                            photos={photos}
                            onPhotoClick={onPhotoClick}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function CostTable({
    title,
    rows,
    total,
    discount = 0,
    empty,
}: {
    title: string;
    rows: Array<{
        name: string;
        quantity: number;
        unit: string;
        price: number;
        total: number;
    }>;
    total: number;
    discount?: number;
    empty: string;
}) {
    return (
        <div className="min-w-0 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">{title}</h3>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    {empty}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="h-7">Material</TableHead>
                            <TableHead className="h-7 w-20 text-right">
                                Qty
                            </TableHead>
                            <TableHead className="h-7 w-28 text-right">
                                Harga
                            </TableHead>
                            <TableHead className="h-7 w-28 text-right">
                                Total
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={`${row.name}-${index}`}>
                                <TableCell className="max-w-72 whitespace-normal py-1.5 text-xs font-medium">
                                    {row.name}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-muted-foreground">
                                    {row.quantity} {row.unit}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs">
                                    {formatCurrency(row.price)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs font-semibold">
                                    {formatCurrency(row.total)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {discount > 0 ? (
                            <TableRow className="bg-muted/20">
                                <TableCell
                                    colSpan={3}
                                    className="py-1.5 text-right text-xs font-medium"
                                >
                                    Potongan
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs font-semibold">
                                    -{formatCurrency(discount)}
                                </TableCell>
                            </TableRow>
                        ) : null}
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell
                                colSpan={3}
                                className="py-1.5 text-right text-xs font-semibold"
                            >
                                Total
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-xs font-semibold">
                                {formatCurrency(total)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            )}
        </div>
    );
}

