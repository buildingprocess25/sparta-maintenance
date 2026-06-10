"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingImage } from "@/components/ui/loading-image";
import type { DetailPhoto } from "../_lib/detail-data";
import { ConditionBadge } from "./shared-ui";

export function PhotoDialog({
    photo,
    photos = [],
    onPhotoChange,
    onOpenChange,
}: {
    photo: DetailPhoto | null;
    photos?: DetailPhoto[];
    onPhotoChange?: (photo: DetailPhoto) => void;
    onOpenChange: (open: boolean) => void;
}) {
    const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

    function goToPrev() {
        if (hasPrev && onPhotoChange) {
            onPhotoChange(photos[currentIndex - 1]);
        }
    }

    function goToNext() {
        if (hasNext && onPhotoChange) {
            onPhotoChange(photos[currentIndex + 1]);
        }
    }

    useEffect(() => {
        if (!photo) return;

        const handlePopState = () => {
            onOpenChange(false);
        };

        window.history.pushState({ photoDialog: true }, "");
        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [photo, onOpenChange]);

    useEffect(() => {
        if (!photo) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                goToPrev();
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                goToNext();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [photo, hasPrev, hasNext, currentIndex, photos, onPhotoChange]);

    return (
        <Dialog open={Boolean(photo)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-5xl md:overflow-hidden">
                <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle>{photo?.label ?? "Foto laporan"}</DialogTitle>
                    <DialogDescription>
                        {photo?.source ?? "Dokumentasi laporan"}
                    </DialogDescription>
                </DialogHeader>
                {photo ? (
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="group relative flex bg-black">
                            {hasPrev ? (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                    onClick={goToPrev}
                                    aria-label="Foto sebelumnya"
                                >
                                    <ChevronLeft className="size-5" />
                                </Button>
                            ) : null}

                            <LoadingImage
                                wrapperClassName="flex w-full min-h-[240px] items-center justify-center p-2 lg:min-h-[360px]"
                                loadingLabel="Memuat foto laporan..."
                                errorLabel="Foto laporan gagal dimuat"
                                src={photo.url}
                                alt={photo.label}
                                className="max-h-[50vh] max-w-full object-contain lg:max-h-[75vh]"
                            />

                            {hasNext ? (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                    onClick={goToNext}
                                    aria-label="Foto selanjutnya"
                                >
                                    <ChevronRight className="size-5" />
                                </Button>
                            ) : null}
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

