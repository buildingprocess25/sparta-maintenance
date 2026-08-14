import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { isChecklistOnlyReport } from "@/lib/report-utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { DetailActivity, ReportDetailModel } from "../_lib/detail-data";
import { EmptyState } from "./shared-ui";
import {
    activityBadgeClass,
    formatActivityAction,
    formatDateTime,
    formatRole,
} from "./report-detail-utils";

export function HistoryTab({ report }: { report: ReportDetailModel }) {
    const isChecklistOnly = isChecklistOnlyReport(report.items);

    if (report.activities.length === 0) {
        return (
            <EmptyState
                icon={History}
                title="Belum ada aktivitas"
                description="Riwayat aktivitas pengguna belum tercatat."
            />
        );
    }

    return (
        <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b bg-muted/30 px-3 py-2">
                <h2 className="text-sm font-semibold">
                    Riwayat aktivitas sistem
                </h2>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-background hover:bg-background">
                        <TableHead className="h-8 w-40">Waktu</TableHead>
                        <TableHead className="h-8 w-44">User</TableHead>
                        <TableHead className="h-8 w-32">Role</TableHead>
                        <TableHead className="h-8 w-52">Aksi</TableHead>
                        <TableHead className="h-8 min-w-96">Catatan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {report.activities.map((activity) => (
                        <ActivityRow
                            key={activity.id}
                            activity={activity}
                            isChecklistOnly={isChecklistOnly}
                        />
                    ))}
                </TableBody>
            </Table>
        </section>
    );
}

function ActivityRow({
    activity,
    isChecklistOnly,
}: {
    activity: DetailActivity;
    isChecklistOnly: boolean;
}) {
    return (
        <TableRow>
            <TableCell className="py-2 font-mono text-xs">
                {formatDateTime(activity.createdAt)}
            </TableCell>
            <TableCell className="py-2 text-xs font-medium">
                {activity.actorName}
            </TableCell>
            <TableCell className="py-2 text-xs">
                {formatRole(activity.actorRole)}
            </TableCell>
            <TableCell className="py-2">
                <Badge
                    variant="outline"
                    className={activityBadgeClass(activity.action)}
                >
                    {formatActivityAction(activity.action, isChecklistOnly)}
                </Badge>
            </TableCell>
            <TableCell className="max-w-2xl whitespace-normal py-2 text-xs text-muted-foreground">
                {activity.notes || "-"}
            </TableCell>
        </TableRow>
    );
}
