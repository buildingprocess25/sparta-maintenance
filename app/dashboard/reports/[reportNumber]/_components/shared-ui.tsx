"use client";

import type { ComponentType, SVGProps } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import type { ChecklistRow, DetailPhoto, WorkItem } from "../_lib/detail-data";
import {
    conditionBadgeClass,
    formatCurrency,
    formatDelta,
} from "./report-detail-utils";

export function ConditionBadgeButton({
    row,
    onPhotoClick,
}: {
    row: ChecklistRow;
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    const firstPhoto = row.beforePhotos[0];
    if (!row.conditionLabel) return null;

    return (
        <button
            type="button"
            className={cn(
                "inline-flex h-6 items-center justify-center gap-1 rounded-4xl border px-2 text-xs font-medium transition-colors",
                conditionBadgeClass(row.conditionTone),
                firstPhoto
                    ? "cursor-zoom-in hover:opacity-80"
                    : "cursor-default",
            )}
            onClick={(event) => {
                event.stopPropagation();
                if (firstPhoto) onPhotoClick(firstPhoto);
            }}
        >
            {row.conditionLabel}
            {firstPhoto ? <ChevronRight className="size-3" /> : null}
        </button>
    );
}

export function ConditionBadge({
    label,
    tone,
}: {
    label: string;
    tone?: "good" | "bad" | "neutral" | "unknown";
}) {
    if (!label) return null;

    return (
        <Badge variant="outline" className={conditionBadgeClass(tone)}>
            {label}
        </Badge>
    );
}

export function PhotoStrip({
    title,
    photos,
    onPhotoClick,
}: {
    title?: string;
    photos: DetailPhoto[];
    onPhotoClick: (photo: DetailPhoto) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            {title ? <p className="text-xs font-semibold">{title}</p> : null}
            {photos.length === 0 ? (
                <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    Tidak ada foto
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {photos.map((photo) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="relative size-16 overflow-hidden rounded-md border bg-muted"
                            onClick={() => onPhotoClick(photo)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.url}
                                alt={photo.label}
                                className="size-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function WorkNotes({ item }: { item: WorkItem }) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">Catatan</p>
            {item.notes || item.completionNotes ? (
                <div className="flex flex-col gap-2 text-xs">
                    {item.notes ? (
                        <div className="rounded-md border bg-background px-2 py-1.5">
                            <p className="font-medium">Checklist</p>
                            <p className="text-muted-foreground">
                                {item.notes}
                            </p>
                        </div>
                    ) : null}
                    {item.completionNotes ? (
                        <div className="rounded-md border bg-background px-2 py-1.5">
                            <p className="font-medium">Penyelesaian</p>
                            <p className="text-muted-foreground">
                                {item.completionNotes}
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">-</p>
            )}
        </div>
    );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md border bg-background px-2 py-1.5">
            <p className="text-muted-foreground">{label}</p>
            <p className="truncate font-medium text-foreground">{value}</p>
        </div>
    );
}

export function FilterButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant={active ? "default" : "outline"}
            size="xs"
            onClick={onClick}
        >
            {label}
        </Button>
    );
}

export function MiniMoney({
    label,
    value,
    delta = false,
    hasValue = true,
}: {
    label: string;
    value: number;
    delta?: boolean;
    hasValue?: boolean;
}) {
    return (
        <div className="rounded-md border bg-background px-2 py-1">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-mono font-semibold">
                {hasValue
                    ? delta
                        ? formatDelta(value)
                        : formatCurrency(value)
                    : ""}
            </p>
        </div>
    );
}

export function TotalBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-40">
            <p className="text-xs text-background/60">{label}</p>
            <p className="font-mono font-semibold">{value}</p>
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
}) {
    return (
        <Empty className="rounded-lg border bg-background">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

