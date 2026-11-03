"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink, Repeat } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { ReportStatusBadge } from "@/components/dashboard/report-status-badge";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    RECURRING_DAMAGE_HANDLER_LABELS,
    formatRecurringDamagePeriod,
    type RecurringDamageItem,
    type RecurringDamagePeriod,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import { describeSignageCondition } from "@/lib/signage";
import { formatJakartaDate } from "@/lib/time";

function RecurringItemSection({
    item,
    defaultOpen,
}: {
    item: RecurringDamageItem;
    defaultOpen: boolean;
}) {
    return (
        <Collapsible defaultOpen={defaultOpen} className="rounded-lg border bg-background">
            <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2 text-left">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                        {item.itemId} · {item.itemName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                        {item.categoryName}
                    </p>
                </div>
                <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                    {item.count}x
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <ul className="divide-y border-t">
                    {item.detections.map((detection) => {
                        const signage = describeSignageCondition(detection);
                        return (
                            <li
                                key={detection.reportNumber}
                                className="flex flex-col gap-1 px-3 py-2 text-xs"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={`/dashboard/reports/${detection.reportNumber}`}
                                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                    >
                                        {detection.reportNumber}
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <span className="text-muted-foreground">
                                        {formatJakartaDate(detection.createdAt)}
                                    </span>
                                    <ReportStatusBadge status={detection.status} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    <span>
                                        Handler:{" "}
                                        {detection.handler
                                            ? (RECURRING_DAMAGE_HANDLER_LABELS[detection.handler] ??
                                              detection.handler)
                                            : "-"}
                                    </span>
                                    {signage ? <span>Kondisi: {signage.text}</span> : null}
                                </div>
                                {detection.notes ? (
                                    <p className="text-[11px] text-muted-foreground">
                                        {detection.notes}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function RecurringStoreSheet({
    open,
    store,
    period,
    onOpenChange,
}: {
    open: boolean;
    store: RecurringDamageStore | null;
    period: RecurringDamagePeriod;
    onOpenChange: (open: boolean) => void;
}) {
    const periodLabel = formatRecurringDamagePeriod(period);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>{store ? store.storeName : "Detail toko"}</SheetTitle>
                    <SheetDescription>
                        {store
                            ? `${store.storeCode} · ${store.branchName} · ${periodLabel}`
                            : periodLabel}
                    </SheetDescription>
                </SheetHeader>
                <div className="no-scrollbar grid gap-3 overflow-y-auto px-4 pb-4">
                    {store ? (
                        store.items.map((item, index) => (
                            <RecurringItemSection
                                key={item.itemId}
                                item={item}
                                defaultOpen={index === 0}
                            />
                        ))
                    ) : (
                        <EmptyTable
                            icon={Repeat}
                            title="Tidak ada data toko"
                            description="Toko ini tidak punya item rusak berulang di periode ini atau berada di luar cakupan Anda."
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
