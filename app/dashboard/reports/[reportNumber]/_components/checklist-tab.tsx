"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ChecklistRow, DetailPhoto, ReportDetailModel } from "../_lib/detail-data";
import {
    ConditionBadgeButton,
    EmptyState,
    FilterButton,
    InfoPill,
    PhotoStrip,
} from "./shared-ui";
import {
    formatCurrencyIfPresent,
    formatHandler,
    matchesChecklistFilter,
    type ChecklistFilter,
} from "./report-detail-utils";

export function ChecklistTab({
    report,
    onPhotoClick,
}: {
    report: ReportDetailModel;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    const [filter, setFilter] = useState<ChecklistFilter>("all");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const counts = useMemo(() => {
        const rows = report.checklistGroups.flatMap((group) => group.rows);
        return {
            all: rows.length,
            issue: rows.filter((row) => row.isIssue).length,
            photo: rows.filter((row) => row.beforePhotos.length > 0).length,
            bms: rows.filter((row) => row.handler === "BMS").length,
            rekanan: rows.filter((row) => row.handler === "REKANAN").length,
        };
    }, [report.checklistGroups]);

    const filteredGroups = report.checklistGroups
        .map((group) => ({
            ...group,
            rows: group.rows.filter((row) =>
                matchesChecklistFilter(row, filter),
            ),
        }))
        .filter((group) => group.rows.length > 0);

    function toggleRow(itemId: string) {
        setExpandedRows((current) => {
            const next = new Set(current);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                <FilterButton
                    active={filter === "all"}
                    label={`Semua (${counts.all})`}
                    onClick={() => setFilter("all")}
                />
                <FilterButton
                    active={filter === "issue"}
                    label={`Bermasalah (${counts.issue})`}
                    onClick={() => setFilter("issue")}
                />
                <FilterButton
                    active={filter === "photo"}
                    label={`Ada foto (${counts.photo})`}
                    onClick={() => setFilter("photo")}
                />
                <FilterButton
                    active={filter === "bms"}
                    label={`BMS (${counts.bms})`}
                    onClick={() => setFilter("bms")}
                />
                <FilterButton
                    active={filter === "rekanan"}
                    label={`Rekanan (${counts.rekanan})`}
                    onClick={() => setFilter("rekanan")}
                />
            </div>

            {filteredGroups.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title="Tidak ada checklist"
                    description="Tidak ada item yang cocok dengan filter ini."
                />
            ) : (
                filteredGroups.map((group) => (
                    <section
                        key={group.categoryName}
                        className="overflow-hidden rounded-lg border bg-background"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-semibold">
                                    {group.categoryName}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {group.rows.length} item ditampilkan
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                    {group.issueCount} bermasalah
                                </Badge>
                                <Badge variant="outline">
                                    {group.photoCount} foto
                                </Badge>
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-background hover:bg-background">
                                    <TableHead className="h-8 w-8" />
                                    <TableHead className="h-8 w-24">
                                        ID
                                    </TableHead>
                                    <TableHead className="h-8 min-w-80">
                                        Item
                                    </TableHead>
                                    <TableHead className="h-8 w-40">
                                        Kondisi
                                    </TableHead>
                                    <TableHead className="h-8 w-36 text-right">
                                        Estimasi
                                    </TableHead>
                                    <TableHead className="h-8 w-36 text-right">
                                        Realisasi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {group.rows.map((row) => {
                                    const expanded = expandedRows.has(
                                        row.itemId,
                                    );
                                    return (
                                        <Fragment key={row.itemId}>
                                            <TableRow
                                                className={cn(
                                                    "cursor-pointer",
                                                    row.isIssue &&
                                                        "bg-destructive/5 hover:bg-destructive/10",
                                                )}
                                                onClick={() =>
                                                    toggleRow(row.itemId)
                                                }
                                            >
                                                <TableCell className="py-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        aria-label={
                                                            expanded
                                                                ? "Tutup detail item"
                                                                : "Buka detail item"
                                                        }
                                                    >
                                                        <ChevronDown
                                                            className={cn(
                                                                "transition-transform",
                                                                expanded &&
                                                                    "rotate-180",
                                                            )}
                                                        />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="py-1.5 font-mono text-xs">
                                                    {row.itemId}
                                                </TableCell>
                                                <TableCell className="max-w-[560px] py-1.5">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {row.itemName}
                                                        </p>
                                                        {row.handler ||
                                                        row.notes ? (
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {[
                                                                    row.handler
                                                                        ? `Handler ${formatHandler(row.handler)}`
                                                                        : null,
                                                                    row.notes,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        " - ",
                                                                    )}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <ConditionBadgeButton
                                                        row={row}
                                                        onPhotoClick={
                                                            onPhotoClick
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right font-mono text-xs">
                                                    {formatCurrencyIfPresent(
                                                        row.estimationTotal,
                                                        row.hasEstimation,
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right font-mono text-xs">
                                                    {formatCurrencyIfPresent(
                                                        row.realisasiTotal,
                                                        row.hasRealisasi,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {expanded ? (
                                                <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                    <TableCell
                                                        colSpan={6}
                                                        className="whitespace-normal p-0"
                                                    >
                                                        <ChecklistRowDetail
                                                            row={row}
                                                            onPhotoClick={
                                                                onPhotoClick
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </section>
                ))
            )}
        </div>
    );
}

function ChecklistRowDetail({
    row,
    onPhotoClick,
}: {
    row: ChecklistRow;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    return (
        <div className="grid gap-3 border-l-4 border-primary/40 px-3 py-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex flex-col gap-2">
                <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <InfoPill
                        label="Handler"
                        value={formatHandler(row.handler)}
                    />
                    <InfoPill
                        label="Estimasi"
                        value={formatCurrencyIfPresent(
                            row.estimationTotal,
                            row.hasEstimation,
                        )}
                    />
                    <InfoPill
                        label="Realisasi"
                        value={formatCurrencyIfPresent(
                            row.realisasiTotal,
                            row.hasRealisasi,
                        )}
                    />
                    <InfoPill
                        label="Foto"
                        value={`${row.beforePhotos.length} foto`}
                    />
                </div>
                {row.notes ? (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs">
                        <p className="mb-1 font-medium">Catatan checklist</p>
                        <p className="whitespace-pre-line text-muted-foreground">
                            {row.notes}
                        </p>
                    </div>
                ) : null}
            </div>

            <PhotoStrip photos={row.beforePhotos} onPhotoClick={onPhotoClick} />
        </div>
    );
}

