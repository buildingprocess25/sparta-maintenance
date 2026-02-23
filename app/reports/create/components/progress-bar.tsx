"use client";

interface ProgressBarProps {
    step: 1 | 2;
}

export function ProgressBar({ step }: ProgressBarProps) {
    return (
        <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
            <div
                className={`flex items-center gap-2 ${step === 1 ? "text-primary" : "text-muted-foreground"}`}
            >
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                    1
                </div>
                <span className="text-sm font-medium">Checklist</span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div
                className={`flex items-center gap-2 ${step === 2 ? "text-primary" : "text-muted-foreground"}`}
            >
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                    2
                </div>
                <span className="text-sm font-medium">Ringkasan</span>
            </div>
        </div>
    );
}
