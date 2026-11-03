import { cn } from "@/lib/utils";

export type MetricTone = "default" | "good" | "warn" | "bad";

export function MetricColumn({
    label,
    value,
    tone = "default",
}: {
    label: string;
    value: string;
    tone?: MetricTone;
}) {
    return (
        <div className="min-w-0 border-b px-3 py-2 md:border-b-0 md:border-r last:md:border-r-0">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    "mt-0.5 truncate text-lg font-semibold",
                    tone === "good" && "text-emerald-700",
                    tone === "warn" && "text-amber-700",
                    tone === "bad" && "text-red-700",
                )}
            >
                {value}
            </p>
        </div>
    );
}
