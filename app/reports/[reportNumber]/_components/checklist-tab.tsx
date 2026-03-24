import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Image as ImageIcon,
    Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { checklistCategories } from "@/lib/checklist-data";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

type Props = {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    formatCurrency: (n: number) => string;
    onPhotoClick: (src: string) => void;
};

function getItemBadge(
    condition: string | undefined,
    preventive: string | undefined,
    isPreventiveCategory: boolean,
) {
    if (preventive === "OK")
        return (
            <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                OK
            </Badge>
        );
    if (preventive === "NOT_OK")
        return (
            <Badge variant="destructive" className="shrink-0">
                NOT OK
            </Badge>
        );
    if (isPreventiveCategory && condition === "BAIK")
        return (
            <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                OK
            </Badge>
        );
    if (isPreventiveCategory && condition === "RUSAK")
        return (
            <Badge variant="destructive" className="shrink-0">
                NOT OK
            </Badge>
        );
    if (condition === "BAIK")
        return (
            <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                Baik
            </Badge>
        );
    if (condition === "RUSAK")
        return (
            <Badge variant="destructive" className="shrink-0">
                Rusak
            </Badge>
        );
    if (condition === "TIDAK_ADA")
        return (
            <Badge
                variant="secondary"
                className="text-muted-foreground shrink-0"
            >
                Tidak Ada
            </Badge>
        );
    return (
        <Badge variant="outline" className="text-muted-foreground shrink-0">
            -
        </Badge>
    );
}

export function ChecklistTab({
    items,
    estimations,
    formatCurrency,
    onPhotoClick,
}: Props) {
    if (checklistCategories.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    Tidak ada data checklist.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="py-0 ring-0 md:py-6 shadow-none bg-transparent md:bg-background border-0 md:border">
            <CardContent className="space-y-3 px-1 md:px-6 pb-0 md:pb-6">
                {checklistCategories.map((category) => {
                    const categoryItems = items.filter((i) =>
                        i.itemId.startsWith(category.id),
                    );
                    // For preventive categories, only count items that have data
                    // (items without data are in the 3-month cooldown and are hidden).
                    const totalItems = category.isPreventive
                        ? category.items.filter((ci) =>
                              categoryItems.some(
                                  (ri) =>
                                      ri.itemId === ci.id &&
                                      (ri.condition || ri.preventiveCondition),
                              ),
                          ).length
                        : category.items.length;
                    const filledItems = categoryItems.filter(
                        (i) => i.condition || i.preventiveCondition,
                    ).length;

                    const damagedItems = categoryItems.filter(
                        (i) =>
                            i.condition === "RUSAK" ||
                            i.preventiveCondition === "NOT_OK",
                    );
                    const damagedCount = damagedItems.length;
                    const isAllOk = damagedCount === 0;

                    // Hide preventive categories where all items are in cooldown
                    if (category.isPreventive && totalItems === 0) return null;

                    return (
                        <Collapsible
                            key={category.id}
                            defaultOpen={false}
                            onOpenChange={(isOpen) => {
                                if (isOpen && damagedCount > 0) {
                                    setTimeout(() => {
                                        const el = document.getElementById(
                                            `checklistItem-${damagedItems[0].itemId}`,
                                        );
                                        if (el) {
                                            el.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                            });
                                        }
                                    }, 250);
                                }
                            }}
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                >
                                    <div className="flex items-center flex-wrap gap-2 text-left w-full pr-2">
                                        {isAllOk ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                        )}
                                        <span className="font-medium text-left">
                                            {category.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            ({filledItems}/{totalItems})
                                        </span>
                                        {!isAllOk && (
                                            <Badge
                                                variant="destructive"
                                                className="ml-auto shrink-0 hidden md:block"
                                            >
                                                {damagedCount} Item Perlu
                                                Perbaikan
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 in-data-[state=open]:rotate-180" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                                <div className="space-y-4 md:p-4 md:border md:rounded-lg bg-transparent md:bg-muted/30">
                                    {category.items.map((checklistItem) => {
                                        const reportItem = items.find(
                                            (i) =>
                                                i.itemId === checklistItem.id,
                                        );
                                        const condition = reportItem?.condition;
                                        const preventive =
                                            reportItem?.preventiveCondition;

                                        // Hide preventive items with no data — they are in the
                                        // 3-month cooldown period and were intentionally skipped.
                                        if (
                                            category.isPreventive &&
                                            !condition &&
                                            !preventive
                                        )
                                            return null;
                                        const hasPhoto =
                                            (reportItem?.images &&
                                                reportItem.images.length > 0) ||
                                            reportItem?.photoUrl;
                                        const isDamaged =
                                            condition === "RUSAK" ||
                                            preventive === "NOT_OK";

                                        const itemEstimations =
                                            estimations.filter(
                                                (e) =>
                                                    e.itemId ===
                                                    checklistItem.id,
                                            );

                                        return (
                                            <div
                                                key={checklistItem.id}
                                                id={`checklistItem-${checklistItem.id}`}
                                                className={cn(
                                                    "space-y-3 p-3 bg-background rounded-md border transition-colors",
                                                    isDamaged &&
                                                        "border-destructive/50 ring-1 ring-destructive/10",
                                                )}
                                            >
                                                {/* Name + badge */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {checklistItem.id}.{" "}
                                                            {checklistItem.name}
                                                        </p>
                                                        {checklistItem.desc && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {
                                                                    checklistItem.desc
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    {getItemBadge(
                                                        condition ?? undefined,
                                                        preventive ?? undefined,
                                                        category.isPreventive ??
                                                            false,
                                                    )}
                                                </div>

                                                {/* Condition pills */}
                                                {(condition || preventive) && (
                                                    <div className="flex flex-wrap gap-3 pt-3 border-t">
                                                        {category.isPreventive ? (
                                                            <>
                                                                <ConditionPill
                                                                    active={
                                                                        preventive ===
                                                                            "OK" ||
                                                                        condition ===
                                                                            "BAIK"
                                                                    }
                                                                    colorClass="green"
                                                                    label="OK"
                                                                />
                                                                <ConditionPill
                                                                    active={
                                                                        preventive ===
                                                                            "NOT_OK" ||
                                                                        condition ===
                                                                            "RUSAK"
                                                                    }
                                                                    colorClass="red"
                                                                    label="Not OK"
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ConditionPill
                                                                    active={
                                                                        condition ===
                                                                        "BAIK"
                                                                    }
                                                                    colorClass="green"
                                                                    label="Baik"
                                                                />
                                                                <ConditionPill
                                                                    active={
                                                                        condition ===
                                                                        "RUSAK"
                                                                    }
                                                                    colorClass="red"
                                                                    label="Rusak"
                                                                />
                                                                <ConditionPill
                                                                    active={
                                                                        condition ===
                                                                        "TIDAK_ADA"
                                                                    }
                                                                    colorClass="neutral"
                                                                    label="Tidak Ada"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {reportItem?.notes && (
                                                    <div className="pt-1 border-t">
                                                        <p className="text-xs text-muted-foreground mb-1">
                                                            Catatan
                                                        </p>
                                                        <p className="text-sm">
                                                            {reportItem.notes}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Handler */}
                                                {reportItem?.handler && (
                                                    <div className="flex items-center gap-2 pt-3 border-t">
                                                        <p className="text-muted-foreground">
                                                            Akan Dikerjakan
                                                            oleh:
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-sm"
                                                        >
                                                            {reportItem.handler ===
                                                            "REKANAN"
                                                                ? "Rekanan"
                                                                : reportItem.handler}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Photo */}
                                                {(hasPhoto ||
                                                    isDamaged ||
                                                    condition === "BAIK" ||
                                                    preventive === "OK") && (
                                                    <div className="pt-2 border-t">
                                                        <p className="text-muted-foreground mb-2">
                                                            {isDamaged
                                                                ? "Foto Kerusakan"
                                                                : "Foto Bukti"}
                                                        </p>
                                                        {hasPhoto ? (
                                                            <div
                                                                className="relative group overflow-hidden rounded-lg border-2 border-green-200 bg-green-50 w-full cursor-pointer"
                                                                onClick={() =>
                                                                    onPhotoClick(
                                                                        reportItem
                                                                            ?.images?.[0] ||
                                                                            reportItem?.photoUrl ||
                                                                            "",
                                                                    )
                                                                }
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={
                                                                        reportItem
                                                                            ?.images?.[0] ||
                                                                        reportItem?.photoUrl ||
                                                                        ""
                                                                    }
                                                                    alt={`Foto ${checklistItem.name}`}
                                                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                                                    <div className="bg-white/90 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                                                                        Klik
                                                                        untuk
                                                                        lihat
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : isDamaged ? (
                                                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20">
                                                                <ImageIcon className="h-3 w-3" />
                                                                <span>
                                                                    Foto wajib
                                                                    dilampirkan
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}

                                                {/* Estimations for this item */}
                                                {itemEstimations.length > 0 && (
                                                    <div className="pt-2 border-t">
                                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                                            <Package className="h-3 w-3" />
                                                            Estimasi Material
                                                        </p>
                                                        <div className="space-y-1">
                                                            {itemEstimations.map(
                                                                (est, idx) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded px-2.5 py-1.5"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="font-medium truncate">
                                                                                {
                                                                                    est.materialName
                                                                                }
                                                                            </span>
                                                                            <span className="text-muted-foreground shrink-0">
                                                                                {
                                                                                    est.quantity
                                                                                }{" "}
                                                                                {
                                                                                    est.unit
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="font-mono font-semibold shrink-0">
                                                                            {formatCurrency(
                                                                                est.totalPrice,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function ConditionPill({
    active,
    colorClass,
    label,
}: {
    active: boolean;
    colorClass: "green" | "red" | "neutral";
    label: string;
}) {
    const colors = {
        green: {
            pill: active
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-muted/40 text-muted-foreground",
            dot: active
                ? "border-green-600 bg-green-600"
                : "border-muted-foreground",
        },
        red: {
            pill: active
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-muted/40 text-muted-foreground",
            dot: active
                ? "border-red-600 bg-red-600"
                : "border-muted-foreground",
        },
        neutral: {
            pill: active
                ? "bg-muted border-border text-foreground"
                : "bg-muted/40 text-muted-foreground",
            dot: active
                ? "border-foreground bg-foreground"
                : "border-muted-foreground",
        },
    };
    const c = colors[colorClass];
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                c.pill,
            )}
        >
            <div className={cn("h-3 w-3 rounded-full border-2", c.dot)} />
            {label}
        </div>
    );
}
