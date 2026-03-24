import { CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STEPS = [
    { key: "DIBUAT", label: "Laporan Dibuat", icon: CheckCircle2 },
    {
        key: "PENDING_ESTIMATION",
        label: "Menunggu Persetujuan Estimasi",
        icon: Clock,
    },
    {
        key: "ESTIMATION_APPROVED",
        label: "Estimasi Disetujui",
        icon: CheckCircle2,
    },
    { key: "IN_PROGRESS", label: "Sedang Dikerjakan", icon: Wrench },
    {
        key: "PENDING_REVIEW",
        label: "Menunggu Review Penyelesaian",
        icon: Clock,
    },
    { key: "COMPLETED", label: "Selesai", icon: CheckCircle2 },
];

const STATUS_ORDER: Record<string, number> = {
    PENDING_ESTIMATION: 1,
    ESTIMATION_APPROVED: 2,
    ESTIMATION_REJECTED_REVISION: 2,
    ESTIMATION_REJECTED: 2,
    IN_PROGRESS: 3,
    PENDING_REVIEW: 4,
    REVIEW_REJECTED_REVISION: 4,
    COMPLETED: 5,
};

function isRejectionStatus(status: string) {
    return (
        status === "ESTIMATION_REJECTED" ||
        status === "ESTIMATION_REJECTED_REVISION" ||
        status === "REVIEW_REJECTED_REVISION"
    );
}

function getRejectionStep(status: string) {
    if (
        status === "ESTIMATION_REJECTED" ||
        status === "ESTIMATION_REJECTED_REVISION"
    )
        return 2;
    if (status === "REVIEW_REJECTED_REVISION") return 4;
    return -1;
}

export function StatusTimeline({ status }: { status: string }) {
    const currentOrder = STATUS_ORDER[status] ?? 0;
    const isRejected = isRejectionStatus(status);
    const rejectionStep = getRejectionStep(status);

    const currentLabel = isRejected
        ? status === "ESTIMATION_REJECTED"
            ? "Estimasi Ditolak"
            : status === "ESTIMATION_REJECTED_REVISION"
              ? "Estimasi Ditolak (Revisi)"
              : "Penyelesaian Ditolak (Revisi)"
        : (STATUS_STEPS[currentOrder]?.label ?? status);

    return (
        <>
            {/* Mobile: compact progress strip */}
            <div className="lg:hidden">
                <div className="flex items-center gap-0.5 mb-2.5">
                    {STATUS_STEPS.map((step, idx) => {
                        const isPassed = currentOrder > idx && !isRejected;
                        const isActive = currentOrder === idx;
                        const isRejectedStep =
                            isRejected && idx === rejectionStep;
                        return (
                            <div
                                key={step.key}
                                className="flex items-center flex-1 last:flex-none"
                            >
                                <div
                                    className={cn(
                                        "rounded-full shrink-0 transition-all",
                                        isActive
                                            ? "w-3 h-3 bg-primary ring-2 ring-primary/25"
                                            : isPassed
                                              ? "w-2 h-2 bg-primary"
                                              : isRejectedStep
                                                ? "w-3 h-3 bg-red-500 ring-2 ring-red-200"
                                                : "w-2 h-2 bg-muted-foreground/25",
                                    )}
                                />
                                {idx < STATUS_STEPS.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 flex-1 mx-0.5",
                                            isPassed
                                                ? "bg-primary"
                                                : "bg-muted-foreground/20",
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between">
                    <p
                        className={cn(
                            "text-sm font-semibold",
                            isRejected ? "text-red-600" : "text-foreground",
                        )}
                    >
                        {currentLabel}
                    </p>
                    <span className="text-xs text-muted-foreground">
                        Langkah {currentOrder + 1} / {STATUS_STEPS.length}
                    </span>
                </div>
            </div>

            {/* Desktop: full horizontal timeline */}
            <div className="hidden lg:flex items-center w-full max-w-3xl mx-auto py-2">
                {STATUS_STEPS.map((step, idx) => {
                    const isActive = step.key === status;
                    const isPassed = currentOrder > idx && !isRejected;
                    const isRejectedStep = isRejected && idx === rejectionStep;
                    const Icon = step.icon;

                    return (
                        <div
                            key={step.key}
                            className={cn(
                                "flex items-center",
                                idx < STATUS_STEPS.length - 1 ? "flex-1" : "",
                            )}
                        >
                            <div className="flex flex-col items-center relative z-10">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                        isActive || isPassed
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : isRejectedStep
                                              ? "bg-red-100 border-red-500 text-red-600"
                                              : "bg-background border-muted text-muted-foreground",
                                    )}
                                >
                                    {isRejectedStep ? (
                                        <XCircle className="w-4 h-4" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "absolute top-10 text-[10px] sm:text-xs font-medium w-32 text-center transition-colors duration-300",
                                        isActive
                                            ? "text-foreground"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {isRejectedStep
                                        ? status === "ESTIMATION_REJECTED"
                                            ? "Estimasi Ditolak"
                                            : "Penyelesaian Ditolak (Revisi)"
                                        : step.label}
                                </span>
                            </div>

                            {idx < STATUS_STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "h-0.5 flex-1 mx-2 -mt-6 transition-all duration-500",
                                        isPassed ? "bg-primary" : "bg-muted",
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
