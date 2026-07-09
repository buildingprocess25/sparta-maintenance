export function SummaryMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg bg-muted/50 px-2 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold">{value}</p>
        </div>
    );
}
