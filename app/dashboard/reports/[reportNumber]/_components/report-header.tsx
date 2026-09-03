import type { ReactNode } from "react";
import {
    AlertTriangle,
    Check,
    FileCheck,
    Handshake,
    ReceiptText,
} from "lucide-react";
import Link from "next/link";

import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { getPjumStatusLabel } from "@/lib/pjum-status";
import { isRekananZeroCost } from "@/lib/report-utils";
import { UNEXPECTED_COST_REASON_SHORT_LABEL } from "@/lib/unexpected-cost";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportDetailModel } from "../_lib/detail-data";
import { ReportInterventionAction } from "./report-intervention-action";
import {
    formatCurrency,
    formatDateTime,
    formatHeaderDifference,
    formatNullableValue,
    getFinalDriveDocuments,
    isIssueFollowUpStatus,
} from "./report-detail-utils";

export function ReportHeader({
    report,
    viewerRole,
}: {
    report: ReportDetailModel;
    viewerRole: string;
}) {
    const statusLabel = getReportStatusLabel(report.status);
    const issueCountLabel = `${report.summary.issueCount} item`;
    const isIssueFollowUp = isIssueFollowUpStatus(report.status);
    const isRekananWithoutBmsCost = isRekananZeroCost(
        report.items,
        report.estimations,
    );
    const hasOverTacticalBalanceReason =
        Boolean(report.unexpectedCostNotes?.trim());
    const finalDocuments = getFinalDriveDocuments(report);
    const canIntervene =
        viewerRole === "ADMIN" && report.status === "COMPLETED";
    const pjumStatusLabel = !report.requiresPjum
        ? "Tidak perlu PJUM"
        : report.pjumExport
        ? getPjumStatusLabel(report.pjumExport.status)
        : "Belum masuk PJUM";
    const pjumExportLabel = !report.requiresPjum
        ? "-"
        : report.pjumExportedAt
        ? formatDateTime(report.pjumExportedAt)
        : "Belum diekspor";
    const pjumWeekLabel = !report.requiresPjum
        ? "-"
        : report.pjumExport
        ? `Minggu ${report.pjumExport.weekNumber}`
        : "Belum ada";
    const pjumApprovalLabel = !report.requiresPjum
        ? "-"
        : report.pjumExport?.approvedAt
        ? formatDateTime(report.pjumExport.approvedAt)
        : report.pjumExport
          ? "Belum disetujui"
          : "Belum ada";

    return (
        <header className="border-b bg-background">
            <div className="flex flex-col gap-3 px-3 py-3 lg:px-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1 className="truncate text-xl font-semibold text-foreground">
                            {report.reportNumber}
                        </h1>
                        <Badge
                            className={cn(
                                "h-6",
                                getReportStatusBadgeClass(report.status),
                            )}
                        >
                            {statusLabel}
                        </Badge>
                        {isRekananWithoutBmsCost ? (
                            <Badge
                                variant="outline"
                                className="h-6 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50"
                                title="Semua item rusak ditangani rekanan dan tidak ada biaya BMS."
                            >
                                <Handshake data-icon="inline-start" />
                                Rekanan tanpa biaya BMS
                            </Badge>
                        ) : null}
                        {report.summary.issueCount > 0 ? (
                            <Badge
                                variant={
                                    isIssueFollowUp ? "destructive" : "outline"
                                }
                                className={cn(
                                    "h-6",
                                    !isIssueFollowUp &&
                                        "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
                                )}
                            >
                                <AlertTriangle data-icon="inline-start" />
                                {isIssueFollowUp
                                    ? `${report.summary.issueCount} perlu tindak lanjut`
                                    : `${report.summary.issueCount} item diperbaiki`}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="h-6">
                                <Check data-icon="inline-start" />
                                Tidak ada item bermasalah
                            </Badge>
                        )}
                        {hasOverTacticalBalanceReason ? (
                            <Badge
                                variant="outline"
                                className="h-6 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50"
                                title="Nilai realisasi laporan ini lebih besar dari sisa saldo dana taktis BMS saat penyelesaian diajukan."
                            >
                                <AlertTriangle data-icon="inline-start" />
                                {UNEXPECTED_COST_REASON_SHORT_LABEL}
                            </Badge>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {finalDocuments.map((document) => (
                            <Button
                                key={document.key}
                                asChild
                                variant={
                                    document.key === "report"
                                        ? "default"
                                        : "outline"
                                }
                                className={
                                    document.key === "revised_report"
                                        ? "border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-500"
                                        : ""
                                }
                                size="sm"
                            >
                                <Link
                                    href={document.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {document.key === "report" ? (
                                        <FileCheck data-icon="inline-start" />
                                    ) : document.key === "revised_report" ? (
                                        <AlertTriangle data-icon="inline-start" className="size-4" />
                                    ) : (
                                        <ReceiptText data-icon="inline-start" />
                                    )}
                                    {document.label}
                                </Link>
                            </Button>
                        ))}
                        {canIntervene ? (
                            <ReportInterventionAction
                                reportNumber={report.reportNumber}
                            />
                        ) : null}
                    </div>
                </div>

                <div className="space-y-3 border-t pt-3 text-xs">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                        <SummaryField
                            label="Kode Toko"
                            value={formatNullableValue(report.storeCode)}
                        />
                        <SummaryField
                            label="Nama Toko"
                            value={formatNullableValue(report.storeName)}
                        />
                        <SummaryField
                            label="NIK BMS"
                            value={formatNullableValue(report.submittedBy.nik)}
                        />
                        <SummaryField
                            label="Nama BMS"
                            value={formatNullableValue(report.submittedBy.name)}
                        />
                        <SummaryField
                            label="Cabang"
                            value={formatNullableValue(report.branchName)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryColumn title="Laporan">
                            <SummaryRow label="Status:" value={statusLabel} />
                            <SummaryRow
                                label={
                                    isIssueFollowUp
                                        ? "Tindak lanjut:"
                                        : "Item bermasalah:"
                                }
                                value={issueCountLabel}
                            />
                            <SummaryRow
                                label="Pekerjaan BMS:"
                                value={`${report.summary.workItemCount} item`}
                            />
                        </SummaryColumn>
                        <SummaryColumn title="Waktu" withDivider>
                            <SummaryRow
                                label="Dibuat:"
                                value={formatDateTime(report.createdAt)}
                            />
                            <SummaryRow
                                label="Update laporan:"
                                value={formatDateTime(report.lastActivityAt)}
                            />
                            <SummaryRow
                                label="Selesai final:"
                                value={
                                    report.finishedAt
                                        ? formatDateTime(report.finishedAt)
                                        : "Belum selesai"
                                }
                                muted={!report.finishedAt}
                            />
                        </SummaryColumn>
                        <SummaryColumn title="Biaya" withDivider>
                            <SummaryRow
                                label="Estimasi:"
                                value={formatCurrency(report.totals.estimation)}
                                valueClassName="text-orange-600"
                            />
                            <SummaryRow
                                label="Realisasi:"
                                value={
                                    report.totalReal === null
                                        ? ""
                                        : formatCurrency(report.totalReal)
                                }
                                valueClassName="text-emerald-600"
                            />
                            <SummaryRow
                                label="Selisih:"
                                value={
                                    report.totalReal === null
                                        ? ""
                                        : formatHeaderDifference(
                                              report.totalReal -
                                                  report.totals.estimation,
                                          )
                                }
                                valueClassName={cn(
                                    report.totals.difference > 0
                                        ? "text-red-600"
                                        : "text-blue-600",
                                )}
                            />
                        </SummaryColumn>
                        <SummaryColumn title="PJUM" withDivider>
                            <SummaryRow
                                label="Status:"
                                value={pjumStatusLabel}
                                muted={!report.pjumExport || !report.requiresPjum}
                            />
                            <SummaryRow
                                label="Masuk PJUM:"
                                value={pjumExportLabel}
                                muted={!report.pjumExportedAt || !report.requiresPjum}
                            />
                            <SummaryRow
                                label="Minggu:"
                                value={pjumWeekLabel}
                                muted={!report.pjumExport || !report.requiresPjum}
                            />
                            <SummaryRow
                                label="Approval:"
                                value={pjumApprovalLabel}
                                muted={
                                    !report.pjumExport?.approvedAt ||
                                    !report.requiresPjum
                                }
                            />
                        </SummaryColumn>
                    </div>
                </div>
            </div>
        </header>
    );
}

function SummaryColumn({
    children,
    title,
    withDivider = false,
}: {
    children: ReactNode;
    title: string;
    withDivider?: boolean;
}) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-col gap-1",
                withDivider && "xl:border-l xl:border-border xl:pl-4",
            )}
        >
            <p className="mb-1 font-semibold text-muted-foreground">{title}</p>
            {children}
        </div>
    );
}

function SummaryField({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-muted-foreground">{label}</p>
            <p className="truncate font-medium text-foreground">{value}</p>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    valueClassName,
    muted = false,
    italic = false,
}: {
    label: string;
    value: string;
    valueClassName?: string;
    muted?: boolean;
    italic?: boolean;
}) {
    return (
        <div className="flex min-w-0 justify-between gap-3">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span
                className={cn(
                    "truncate text-right font-medium text-foreground",
                    muted && "text-muted-foreground",
                    italic && "italic",
                    valueClassName,
                )}
            >
                {value}
            </span>
        </div>
    );
}
