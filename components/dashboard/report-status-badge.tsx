import { Badge } from "@/components/ui/badge";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";

export function ReportStatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="secondary"
            className={cn("h-5 text-[11px]", getReportStatusBadgeClass(status))}
        >
            {getReportStatusLabel(status)}
        </Badge>
    );
}
