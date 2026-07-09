import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { LocalPhoto } from "../types";
import { PhotoStrip } from "./photo-strip";

export function EvidenceCaptureSection({
    title,
    description,
    icon,
    photos,
    disabled,
    required = true,
    emptyText,
    actions,
    onRemove,
    onPreview,
}: {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    photos: LocalPhoto[];
    disabled?: boolean;
    required?: boolean;
    emptyText: string;
    actions: ReactNode;
    onRemove: (id: string) => void;
    onPreview: (url: string) => void;
}) {
    const Icon = icon;

    return (
        <section
            className={cn(
                "border-b border-border/40 py-4",
                disabled && "opacity-45",
            )}
        >
            <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold">
                                {title}
                            </h2>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {required ? "Wajib" : "Opsional"}
                        </span>
                    </div>
                    <div className="mt-3">
                        <PhotoStrip
                            photos={photos}
                            emptyText={emptyText}
                            onRemove={onRemove}
                            onPreview={onPreview}
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
                </div>
            </div>
        </section>
    );
}
