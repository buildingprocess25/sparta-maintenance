"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoPreviewOverlayProps {
    previewPhoto: string | null;
    onClose: () => void;
}

export function PhotoPreviewOverlay({
    previewPhoto,
    onClose,
}: PhotoPreviewOverlayProps) {
    if (!previewPhoto) return null;

    return (
        <div
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-4xl w-full">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-12 right-0 text-white hover:bg-white/20"
                    onClick={onClose}
                >
                    <X className="h-6 w-6" />
                </Button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={previewPhoto}
                    alt="Preview"
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
