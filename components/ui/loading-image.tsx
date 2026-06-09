"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingImageProps = Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "onLoad" | "onError"
> & {
    wrapperClassName?: string;
    loadingLabel?: string;
    errorLabel?: string;
};

function LoadingImage({
    src,
    alt,
    className,
    wrapperClassName,
    loadingLabel = "Memuat foto...",
    errorLabel = "Foto gagal dimuat",
    ...props
}: LoadingImageProps) {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
        src ? "loading" : "error",
    );
    const imageRef = React.useRef<HTMLImageElement>(null);

    React.useEffect(() => {
        setStatus(src ? "loading" : "error");
    }, [src]);

    React.useEffect(() => {
        const image = imageRef.current;

        if (!src || !image) return;

        if (image.complete) {
            setStatus(image.naturalWidth > 0 ? "loaded" : "error");
        }
    }, [src]);

    return (
        <div
            className={cn(
                "relative overflow-hidden bg-muted",
                wrapperClassName,
            )}
        >
            {status === "loading" ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <Skeleton className="absolute inset-0 rounded-none" />
                    <span className="relative rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                        {loadingLabel}
                    </span>
                </div>
            ) : null}

            {status === "error" ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted text-xs text-muted-foreground">
                    <ImageOff className="size-5" />
                    <span>{errorLabel}</span>
                </div>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                ref={imageRef}
                {...props}
                src={src}
                alt={alt}
                className={cn(
                    "transition-opacity duration-150",
                    status === "loaded" ? "opacity-100" : "opacity-0",
                    className,
                )}
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("error")}
            />
        </div>
    );
}

export { LoadingImage };
