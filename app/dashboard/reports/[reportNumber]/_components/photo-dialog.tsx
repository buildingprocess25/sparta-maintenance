"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { DetailPhoto } from "../_lib/detail-data";
import { ConditionBadge } from "./shared-ui";

export function PhotoDialog({
    photo,
    onOpenChange,
}: {
    photo: DetailPhoto | null;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={Boolean(photo)} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle>{photo?.label ?? "Foto laporan"}</DialogTitle>
                    <DialogDescription>
                        {photo?.source ?? "Dokumentasi laporan"}
                    </DialogDescription>
                </DialogHeader>
                {photo ? (
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="flex min-h-[360px] items-center justify-center bg-black p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.url}
                                alt={photo.label}
                                className="max-h-[75vh] max-w-full object-contain"
                            />
                        </div>
                        <aside className="flex flex-col gap-3 border-l p-4 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Sumber
                                </p>
                                <p className="font-medium">{photo.source}</p>
                            </div>
                            {photo.itemId ? (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Item
                                        </p>
                                        <p className="font-medium">
                                            {photo.itemId} - {photo.itemName}
                                        </p>
                                    </div>
                                </>
                            ) : null}
                            {photo.conditionLabel ? (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="mb-1 text-xs text-muted-foreground">
                                            Kondisi
                                        </p>
                                        <ConditionBadge
                                            label={photo.conditionLabel}
                                            tone={photo.conditionTone}
                                        />
                                    </div>
                                </>
                            ) : null}
                        </aside>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
