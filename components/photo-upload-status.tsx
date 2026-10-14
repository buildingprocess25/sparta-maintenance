"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EagerUploadState } from "@/lib/photo-upload/eager-upload-registry";

export type PhotoUploadStatusValue = {
    states: Readonly<Record<string, EagerUploadState>>;
    onRetry: (photoId: string) => void;
};

const PhotoUploadStatusContext = createContext<PhotoUploadStatusValue | null>(
    null,
);

export function PhotoUploadStatusProvider({
    value,
    children,
}: {
    value: PhotoUploadStatusValue;
    children: ReactNode;
}) {
    return (
        <PhotoUploadStatusContext.Provider value={value}>
            {children}
        </PhotoUploadStatusContext.Provider>
    );
}

/**
 * Overlay for a photo thumbnail showing its eager upload status.
 * Must be rendered inside a `relative` container. Renders nothing when there
 * is no provider or no tracked status for the photo.
 */
export function PhotoUploadStatusOverlay({ photoId }: { photoId: string }) {
    const context = useContext(PhotoUploadStatusContext);
    const state = context?.states[photoId];
    if (!context || !state) return null;

    if (state.status === "uploading") {
        return (
            <div
                role="status"
                aria-label="Mengunggah foto"
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white"
            >
                <Loader2 className="size-5 animate-spin" />
            </div>
        );
    }

    if (state.status === "uploaded") {
        return (
            <div
                aria-label="Foto sudah terunggah"
                className="pointer-events-none absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/95 text-emerald-600 shadow-sm"
            >
                <CheckCircle2 className="size-4" />
            </div>
        );
    }

    return (
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-destructive/85 py-1">
            <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => context.onRetry(photoId)}
            >
                <RotateCw data-icon="inline-start" />
                Ulangi
            </Button>
        </div>
    );
}
