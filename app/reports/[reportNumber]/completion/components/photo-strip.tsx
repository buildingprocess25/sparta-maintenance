import { Trash2, ZoomIn } from "lucide-react";

import type { LocalPhoto } from "../types";

export function PhotoStrip({
    photos,
    emptyText,
    onRemove,
    onPreview,
}: {
    photos: LocalPhoto[];
    emptyText: string;
    onRemove?: (id: string) => void;
    onPreview: (url: string) => void;
}) {
    if (photos.length === 0) {
        return (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {photos.map((photo) => (
                <div
                    key={photo.id}
                    className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.previewUrl}
                        alt="Foto bukti"
                        className="h-full w-full object-cover"
                        onClick={() => onPreview(photo.previewUrl)}
                    />
                    <button
                        type="button"
                        onClick={() => onPreview(photo.previewUrl)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100"
                        aria-label="Lihat foto"
                    >
                        <ZoomIn className="size-5" />
                    </button>
                    {onRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove(photo.id)}
                            className="absolute right-0 top-0 flex size-11 items-start justify-end p-1 text-destructive"
                            aria-label="Hapus foto"
                        >
                            <span className="flex size-8 items-center justify-center rounded-full bg-background/95 shadow-sm">
                                <Trash2 className="size-4" />
                            </span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
