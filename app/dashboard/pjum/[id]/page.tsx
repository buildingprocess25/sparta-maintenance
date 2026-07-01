import Link from "next/link";
import type { ElementType } from "react";
import { notFound, redirect } from "next/navigation";
import {
    AlertTriangle,
    ArrowUpRight,
    FileCheck2,
    FileText,
    ReceiptText,
    UserRound,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import {
    getPjumStatusBadgeClass,
    getPjumStatusLabel,
} from "@/lib/pjum-status";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";
import { getPjumPolicySettings } from "@/lib/app-settings";
import { PjumApprovalButton } from "./_components/pjum-approval-button";
import { PjumCancelButton } from "./_components/pjum-cancel-button";
import { formatJakartaDate, formatJakartaDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function AdminPjumDetailPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const { id } = await params;
    const detail = await getPjumDetail(id);
    if (!detail) notFound();
    if (
        user.role !== "ADMIN" &&
        !user.branchNames
            .filter((branchName) => branchName.trim() !== "")
            .includes(detail.pjum.branchName)
    ) {
        notFound();
    }

    const pjumPolicy = await getPjumPolicySettings();
    const pjumUrl =
        detail.pjum.status === "PENDING_APPROVAL"
            ? null
            : buildPjumViewUrl(detail.pjum);
    const isStalePending = isPjumStalePending(
        detail.pjum,
        pjumPolicy.pendingStaleDays,
    );
    const canCancelPjum = user.role === "ADMIN";

    return (
        <AdminDashboardShell
            user={user}
            title={`PJUM Minggu ${detail.pjum.weekNumber}`}
            breadcrumbs={[
                { label: "Dokumen PJUM", href: "/dashboard/pjum" },
                { label: `Minggu ${detail.pjum.weekNumber}` },
            ]}
        >
            <div className="space-y-4">
                <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-semibold">
                                    PJUM Minggu {detail.pjum.weekNumber}
                                </h1>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "font-normal",
                                        getPjumStatusBadgeClass(
                                            detail.pjum.status,
                                        ),
                                    )}
                                >
                                    {getPjumStatusLabel(detail.pjum.status)}
                                </Badge>
                                {isStalePending ? (
                                    <Badge className="gap-1 border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                        <AlertTriangle className="h-3 w-3" />
                                        Pending terlalu lama
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {formatDate(detail.pjum.fromDate)} sampai{" "}
                                {formatDate(detail.pjum.toDate)} ·{" "}
                                {detail.pjum.branchName}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {pjumUrl ? (
                            <Button
                                asChild
                                size="sm"
                                className="gap-1.5 text-xs"
                            >
                                <a
                                    href={pjumUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Lihat PDF PJUM
                                </a>
                            </Button>
                        ) : null}
                        <PjumApprovalButton
                            pjumExportId={detail.pjum.id}
                            status={detail.pjum.status}
                            viewerRole={user.role}
                        />
                        {canCancelPjum ? (
                            <PjumCancelButton
                                pjumExportId={detail.pjum.id}
                                reportCount={detail.reports.length}
                            />
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-4">
                        <section className="rounded-lg border bg-background">
                            <div className="border-b px-4 py-3">
                                <h2 className="text-sm font-semibold">
                                    Informasi PJUM
                                </h2>
                            </div>
                            <div className="grid gap-4 p-4 text-xs md:grid-cols-3">
                                <KeyValueGroup
                                    items={[
                                        ["Cabang", detail.pjum.branchName],
                                        ["BMS", detail.bmsName],
                                        ["NIK BMS", detail.pjum.bmsNIK],
                                    ]}
                                />
                                <KeyValueGroup
                                    className="md:border-l md:pl-4"
                                    items={[
                                        [
                                            "Periode",
                                            `${formatDate(
                                                detail.pjum.fromDate,
                                            )} - ${formatDate(
                                                detail.pjum.toDate,
                                            )}`,
                                        ],
                                        [
                                            "Dibuat",
                                            formatDateTime(
                                                detail.pjum.createdAt,
                                            ),
                                        ],
                                        ["Pembuat", detail.createdByName],
                                    ]}
                                />
                                <KeyValueGroup
                                    className="md:border-l md:pl-4"
                                    items={[
                                        [
                                            "Jumlah laporan",
                                            String(detail.reports.length),
                                        ],
                                        [
                                            "Total realisasi",
                                            formatRp(detail.totalRealization),
                                        ],
                                        [
                                            "Approval BNM",
                                            detail.pjum.approvedAt
                                                ? formatDateTime(
                                                      detail.pjum.approvedAt,
                                                  )
                                                : "Belum disetujui",
                                        ],
                                    ]}
                                />
                            </div>
                        </section>

                        <section className="rounded-lg border bg-background">
                            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        Laporan dalam PJUM
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Semua laporan yang masuk dokumen PJUM
                                        ini.
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {detail.reports.length} laporan
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="min-w-[170px]">
                                                Nomor Laporan
                                            </TableHead>
                                            <TableHead className="min-w-[220px]">
                                                Toko
                                            </TableHead>
                                            <TableHead className="w-[140px]">
                                                Status
                                            </TableHead>
                                            <TableHead className="w-[150px]">
                                                Selesai
                                            </TableHead>
                                            <TableHead className="w-[130px] text-right">
                                                Realisasi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.reports.map((report) => (
                                            <TableRow key={report.reportNumber}>
                                                <TableCell>
                                                    <Link
                                                        href={`/dashboard/reports/${report.reportNumber}`}
                                                        className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {report.reportNumber}
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {report.storeName || "-"}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {report.storeCode ?? "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "font-normal",
                                                            getReportStatusBadgeClass(
                                                                report.status,
                                                            ),
                                                        )}
                                                    >
                                                        {getReportStatusLabel(
                                                            report.status,
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(
                                                        report.finishedAt,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatRp(
                                                        report.totalReal,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <section className="rounded-lg border bg-background">
                            <div className="border-b px-4 py-3">
                                <h2 className="text-sm font-semibold">
                                    Timeline
                                </h2>
                            </div>
                            <div className="space-y-3 p-4 text-xs">
                                <TimelineItem
                                    icon={ReceiptText}
                                    title="PJUM dibuat"
                                    value={formatDateTime(
                                        detail.pjum.createdAt,
                                    )}
                                    description={`oleh ${detail.createdByName}`}
                                />
                                <TimelineItem
                                    icon={UserRound}
                                    title="Review BNM"
                                    value={
                                        detail.pjum.status === "PENDING_APPROVAL"
                                            ? "Menunggu"
                                            : "Selesai"
                                    }
                                    description={
                                        detail.pjum.approvedAt
                                            ? `oleh ${detail.approvedByName}`
                                            : "Belum ada keputusan"
                                    }
                                />
                                {detail.pjum.approvedAt ? (
                                    <TimelineItem
                                        icon={FileCheck2}
                                        title="Disetujui"
                                        value={formatDateTime(
                                            detail.pjum.approvedAt,
                                        )}
                                        description={
                                            detail.approvedByName ??
                                            "BNM Manager"
                                        }
                                    />
                                ) : null}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </AdminDashboardShell>
    );
}

async function getPjumDetail(id: string) {
    const pjum = await prisma.pjumExport.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            bmsNIK: true,
            branchName: true,
            weekNumber: true,
            fromDate: true,
            toDate: true,
            reportNumbers: true,
            createdByNIK: true,
            approvedByNIK: true,
            approvedAt: true,
            pjumFinalDriveUrl: true,
            createdAt: true,
        },
    });

    if (!pjum) return null;

    const users = await prisma.user.findMany({
        where: {
            NIK: {
                in: [
                    pjum.bmsNIK,
                    pjum.createdByNIK,
                    ...(pjum.approvedByNIK ? [pjum.approvedByNIK] : []),
                ],
            },
        },
        select: { NIK: true, name: true },
    });
    const userMap = new Map(users.map((user) => [user.NIK, user.name]));

    const reports = await prisma.report.findMany({
        where: { reportNumber: { in: pjum.reportNumbers } },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            status: true,
            finishedAt: true,
            totalReal: true,
        },
    });

    const reportOrder = new Map(
        pjum.reportNumbers.map((reportNumber, index) => [reportNumber, index]),
    );
    const orderedReports = reports
        .map((report) => ({
            ...report,
            totalReal:
                report.totalReal === null ? null : Number(report.totalReal),
        }))
        .sort(
            (a, b) =>
                (reportOrder.get(a.reportNumber) ?? 0) -
                (reportOrder.get(b.reportNumber) ?? 0),
        );

    return {
        pjum,
        bmsName: userMap.get(pjum.bmsNIK) ?? pjum.bmsNIK,
        createdByName: userMap.get(pjum.createdByNIK) ?? pjum.createdByNIK,
        approvedByName: pjum.approvedByNIK
            ? userMap.get(pjum.approvedByNIK) ?? pjum.approvedByNIK
            : null,
        reports: orderedReports,
        totalRealization: orderedReports.reduce(
            (sum, report) => sum + (report.totalReal ?? 0),
            0,
        ),
    };
}

type PjumDetail = NonNullable<Awaited<ReturnType<typeof getPjumDetail>>>;

function buildPjumViewUrl(pjum: PjumDetail["pjum"]) {
    if (pjum.pjumFinalDriveUrl) return pjum.pjumFinalDriveUrl;

    const search = new URLSearchParams({
        ids: pjum.reportNumbers.join(","),
        bmsNIK: pjum.bmsNIK,
        from: pjum.fromDate.toISOString(),
        to: pjum.toDate.toISOString(),
        week: String(pjum.weekNumber),
    });

    return `/api/reports/pjum-pdf?${search.toString()}`;
}

function isPjumStalePending(pjum: PjumDetail["pjum"], staleDays: number) {
    if (pjum.status !== "PENDING_APPROVAL") return false;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);
    return pjum.createdAt < cutoff;
}

function formatDate(date: Date | string | null) {
    if (!date) return "-";
    return formatJakartaDate(date);
}

function formatDateTime(date: Date | string | null) {
    if (!date) return "-";
    return formatJakartaDateTime(date);
}

function formatRp(value: number | null) {
    if (value === null) return "-";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function KeyValueGroup({
    items,
    className,
}: {
    items: Array<[string, string]>;
    className?: string;
}) {
    return (
        <div className={cn("space-y-2", className)}>
            {items.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                </div>
            ))}
        </div>
    );
}

function TimelineItem({
    icon: Icon,
    title,
    value,
    description,
}: {
    icon: ElementType;
    title: string;
    value: string;
    description: string;
}) {
    return (
        <div className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">{title}</span>
                    <span className="text-muted-foreground">{value}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                    {description}
                </div>
            </div>
        </div>
    );
}
