"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileCheck, ImageIcon, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DetailPhoto, ReportDetailModel } from "../_lib/detail-data";
import { ConditionBadge, EmptyState } from "./shared-ui";
import { getFinalDriveDocuments } from "./report-detail-utils";

export function DocumentationTab({
    report,
    onPhotoClick,
}: {
    report: ReportDetailModel;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    const grouped = useMemo(() => {
        const map = new Map<string, DetailPhoto[]>();
        for (const photo of report.photos) {
            const current = map.get(photo.source) ?? [];
            current.push(photo);
            map.set(photo.source, current);
        }
        return Array.from(map.entries());
    }, [report.photos]);

    return (
        <div className="flex flex-col gap-3">
            {grouped.length === 0 ? (
                <EmptyState
                    icon={ImageIcon}
                    title="Belum ada dokumentasi"
                    description="Foto checklist, nota, atau hasil pekerjaan belum tersedia."
                />
            ) : (
                grouped.map(([source, photos]) => (
                    <section
                        key={source}
                        className="rounded-lg border bg-background"
                    >
                        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                            <h2 className="text-sm font-semibold">{source}</h2>
                            <Badge variant="secondary">
                                {photos.length} foto
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                            {photos.map((photo) => (
                                <button
                                    key={photo.id}
                                    type="button"
                                    className="group min-w-0 rounded-md border bg-background p-1 text-left transition-colors hover:bg-muted/40"
                                    onClick={() => onPhotoClick(photo)}
                                >
                                    <div className="relative aspect-square overflow-hidden rounded bg-muted">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.url}
                                            alt={photo.label}
                                            className="size-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        {photo.conditionLabel ? (
                                            <div className="absolute left-1 top-1">
                                                <ConditionBadge
                                                    label={photo.conditionLabel}
                                                    tone={photo.conditionTone}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 truncate text-xs">
                                        {photo.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
