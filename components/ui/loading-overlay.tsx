import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    isOpen: boolean;
    message?: string;
}

export function LoadingOverlay({
    isOpen,
    message = "Memproses...",
}: LoadingOverlayProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-lg border">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">
                    {message}
                </p>
            </div>
        </div>
    );
}
