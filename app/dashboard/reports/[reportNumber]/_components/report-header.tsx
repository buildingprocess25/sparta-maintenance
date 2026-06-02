import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Check, FileCheck, ReceiptText } from "lucide-react";

import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { getPjumStatusLabel } from "@/lib/pjum-status";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportDetailModel } from "../_lib/detail-data";
import {
    formatCurrency,
    formatDateTime,
    formatHeaderDifference,
    formatNullableValue,
    getFinalDriveDocuments,
    isIssueFollowUpStatus,
} from "./report-detail-utils";

export function ReportHeader({ report }: { report: ReportDetailModel }) {
    const statusLabel = getReportStatusLabel(report.status);
    const issueCountLabel = `${report.summary.issueCount} item`;
    const isIssueFollowUp = isIssueFollowUpStatus(report.status);
    const finalDocuments = getFinalDriveDocuments(report);
    const pjumStatusLabel = report.pjumExport
        ? getPjumStatusLabel(report.pjumExport.status)
        : "Belum masuk PJUM";
    const pjumExportLabel = report.pjumExportedAt
        ? formatDateTime(report.pjumExportedAt)
        : "Belum diekspor";
    const pjumWeekLabel = report.pjumExport
        ? `Minggu ${report.pjumExport.weekNumber}`
        : "Belum ada";
    const pjumApprovalLabel = report.pjumExport?.approvedAt
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {finalDocuments.map((document) => (
                            <Button
                                key={document.key}
                                asChild
                                variant={
                                    document.key === "report"
                                        ? "default"
                                        : "outline"
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
                                    ) : (
                                        <ReceiptText data-icon="inline-start" />
                                    )}
                                    {document.label}
                                </Link>
                            </Button>
                        ))}
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
                                label="Update:"
                                value={formatDateTime(report.updatedAt)}
                            />
                            <SummaryRow
                                label="Selesai:"
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
                                muted={!report.pjumExport}
                            />
                            <SummaryRow
                                label="Export:"
                                value={pjumExportLabel}
                                muted={!report.pjumExportedAt}
                            />
                            <SummaryRow
                                label="Minggu:"
                                value={pjumWeekLabel}
                                muted={!report.pjumExport}
                            />
                            <SummaryRow
                                label="Approval:"
                                value={pjumApprovalLabel}
                                muted={!report.pjumExport?.approvedAt}
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
