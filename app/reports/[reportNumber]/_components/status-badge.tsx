import { Badge } from "@/components/ui/badge";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
    isReportStatusKey,
} from "@/lib/report-status";

export function StatusBadge({ status }: { status: string }) {
    if (!isReportStatusKey(status)) {
        return <Badge variant="outline">{status}</Badge>;
    }

    return (
        <Badge variant="secondary" className={getReportStatusBadgeClass(status)}>
            {getReportStatusLabel(status)}
        </Badge>
    );
}
