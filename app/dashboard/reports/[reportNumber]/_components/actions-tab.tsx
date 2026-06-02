import { AlertTriangle, Trash2 } from "lucide-react";

import { getReportStatusLabel } from "@/lib/report-status";
import { getPjumStatusLabel } from "@/lib/pjum-status";
import { Button } from "@/components/ui/button";
import type { ReportDetailModel } from "../_lib/detail-data";
import { InfoPill } from "./shared-ui";

export function ActionsTab({
    report,
    onDeleteClick,
}: {
    report: ReportDetailModel;
    onDeleteClick: () => void;
}) {
    return (
        <section className="rounded-lg border border-destructive/20 bg-background">
            <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle />
                    <h2 className="text-sm font-semibold">Danger zone</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Aksi di bawah memengaruhi data laporan dan relasi audit.
                </p>
            </div>
            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <h3 className="text-sm font-semibold">
                            Hapus laporan operasional
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Menghapus laporan {report.reportNumber}, termasuk
                            checklist, estimasi, realisasi, approval log,
                            riwayat aktivitas, dan relasi PJUM.
                        </p>
                    </div>
                    <Button variant="destructive" onClick={onDeleteClick}>
                        <Trash2 data-icon="inline-start" />
                        Hapus laporan
                    </Button>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <InfoPill
                        label="Nomor laporan"
                        value={report.reportNumber}
                    />
                    <InfoPill
                        label="Status"
                        value={getReportStatusLabel(report.status)}
                    />
                    <InfoPill
                        label="PJUM"
                        value={
                            report.pjumExport
                                ? getPjumStatusLabel(report.pjumExport.status)
                                : "Belum masuk PJUM"
                        }
                    />
                </div>
            </div>
        </section>
    );
}
