import Link from "next/link";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import {
    ClipboardCheck,
    ArrowRight,
    Clock,
    CheckCircle2,
    MapPin,
} from "lucide-react";
import { BmcApprovalFilters } from "./bmc-approval-filters";

type ApprovalUser = {
    role: string;
    branchNames: string[];
};

type Props = {
    user: ApprovalUser;
    q?: string;
    status?: string;
    dateRange?: string;
};

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 border-yellow-200 shadow-none whitespace-nowrap">
                    Menunggu Persetujuan Estimasi
                </Badge>
            );
        case "PENDING_REVIEW":
            return (
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100/80 border-purple-200 shadow-none whitespace-nowrap">
                    Menunggu Review Penyelesaian
                </Badge>
            );
        case "APPROVED_BMC":
            return (
                <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100/80 border-teal-200 shadow-none whitespace-nowrap">
                    Penyelesaian Disetujui
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

function getActionLabel(status: string) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return "Review Estimasi";
        case "PENDING_REVIEW":
            return "Review Pekerjaan";
        case "APPROVED_BMC":
            return "Setujui Final";
        default:
            return "Lihat";
    }
}

export async function BmcApprovalList({
    user,
    q,
    status: statusParam,
    dateRange,
}: Props) {
    const search = q?.trim().toLowerCase();

    // Build status filter based on role
    const roleStatuses =
        user.role === "BNM_MANAGER"
            ? (["APPROVED_BMC"] as const)
            : (["PENDING_ESTIMATION", "PENDING_REVIEW"] as const);

    // Narrow by selected status within allowed role statuses
    const activeStatuses =
        statusParam && statusParam !== "all"
            ? roleStatuses.filter((s) => s === statusParam.toUpperCase())
            : [...roleStatuses];

    // Build branch filter for BMC
    const branchFilter =
        user.role === "BMC" && user.branchNames.length > 0
            ? { branchName: { in: user.branchNames } }
            : {};

    // Build date range filter
    const now = new Date();
    let dateFilter: Record<string, unknown> = {};
    switch (dateRange) {
        case "this_month":
            dateFilter = {
                updatedAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1),
                },
            };
            break;
        case "last_month":
            dateFilter = {
                updatedAt: {
                    gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    lt: new Date(now.getFullYear(), now.getMonth(), 1),
                },
            };
            break;
        case "last_3_months":
            dateFilter = {
                updatedAt: {
                    gte: new Date(now.getFullYear(), now.getMonth() - 3, 1),
                },
            };
            break;
        case "last_6_months":
            dateFilter = {
                updatedAt: {
                    gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
                },
            };
            break;
        case "this_year":
            dateFilter = {
                updatedAt: { gte: new Date(now.getFullYear(), 0, 1) },
            };
            break;
        case "last_year":
            dateFilter = {
                updatedAt: {
                    gte: new Date(now.getFullYear() - 1, 0, 1),
                    lt: new Date(now.getFullYear(), 0, 1),
                },
            };
            break;
    }

    const reports = await prisma.report.findMany({
        where: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: { in: activeStatuses as any },
            ...branchFilter,
            ...dateFilter,
        },
        orderBy: { updatedAt: "desc" },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            branchName: true,
            status: true,
            totalEstimation: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
                select: { name: true },
            },
        },
    });

    // Server-side search filter
    const filtered = search
        ? reports.filter(
              (r) =>
                  r.reportNumber.toLowerCase().includes(search) ||
                  r.storeName.toLowerCase().includes(search) ||
                  r.branchName.toLowerCase().includes(search) ||
                  r.createdBy.name.toLowerCase().includes(search),
          )
        : reports;

    const pageTitle =
        user.role === "BNM_MANAGER"
            ? "Persetujuan Final"
            : "Persetujuan Laporan";

    const pageDescription =
        user.role === "BNM_MANAGER"
            ? "Laporan yang telah disetujui BMC dan menunggu persetujuan final Anda."
            : "Laporan dari toko-toko di area Anda yang membutuhkan tindakan.";

    const formatCurrency = (amount: number | { toString(): string }) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(amount));

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const storeDisplay = (storeName: string, storeCode: string | null) =>
        storeCode ? `${storeCode} - ${storeName}` : storeName || "—";

    const pendingEstimation = reports.filter(
        (r) => r.status === "PENDING_ESTIMATION",
    ).length;
    const pendingReview = reports.filter(
        (r) => r.status === "PENDING_REVIEW",
    ).length;
    const pendingFinal = reports.filter(
        (r) => r.status === "APPROVED_BMC",
    ).length;

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title={pageTitle}
                description={pageDescription}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">
                {/* Summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {user.role !== "BNM_MANAGER" && (
                        <Card className="border-yellow-200/60 bg-yellow-50/40">
                            <CardContent className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">
                                        {pendingEstimation}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                        Menunggu Persetujuan Estimasi
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {user.role !== "BNM_MANAGER" && (
                        <Card className="border-purple-200/60 bg-purple-50/40">
                            <CardContent className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                    <ClipboardCheck className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">
                                        {pendingReview}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                        Menunggu Review Penyelesaian
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {user.role === "BNM_MANAGER" && (
                        <Card className="border-teal-200/60 bg-teal-50/40">
                            <CardContent className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">
                                        {pendingFinal}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                        Perlu Persetujuan Final
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Main table card */}
                <Card className="shadow-sm border-border/60">
                    <CardHeader className="border-b">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-primary" />
                                    Daftar Laporan
                                </CardTitle>
                                <CardDescription>
                                    {filtered.length} laporan
                                </CardDescription>
                            </div>
                            <BmcApprovalFilters role={user.role} />
                        </div>
                    </CardHeader>

                    <CardContent>
                        {filtered.length === 0 ? (
                            <div className="py-16">
                                <Empty>
                                    <EmptyMedia>
                                        <ClipboardCheck className="h-10 w-10 text-muted-foreground/30" />
                                    </EmptyMedia>
                                    <EmptyHeader>
                                        <EmptyTitle>
                                            Tidak Ada Laporan
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {search ||
                                            (statusParam &&
                                                statusParam !== "all") ||
                                            (dateRange && dateRange !== "all")
                                                ? "Tidak ada laporan yang cocok dengan filter yang dipilih."
                                                : "Tidak ada laporan yang membutuhkan tindakan saat ini."}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30 uppercase">
                                                <TableHead className="text-sm">
                                                    No. Laporan
                                                </TableHead>
                                                <TableHead className="text-sm">
                                                    Toko
                                                </TableHead>
                                                <TableHead className="text-sm">
                                                    Dilaporkan Oleh
                                                </TableHead>
                                                <TableHead className="text-sm">
                                                    Status
                                                </TableHead>
                                                <TableHead className="text-sm text-right">
                                                    Estimasi
                                                </TableHead>
                                                <TableHead className="text-sm">
                                                    Diperbarui
                                                </TableHead>
                                                <TableHead className="text-sm">
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map((report) => (
                                                <TableRow
                                                    key={report.reportNumber}
                                                    className="hover:bg-muted/20 group"
                                                >
                                                    <TableCell className="font-mono font-semibold text-sm">
                                                        {report.reportNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-sm leading-tight">
                                                            {storeDisplay(
                                                                report.storeName,
                                                                report.storeCode,
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            {report.branchName}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {report.createdBy.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(
                                                            report.status,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono text-right">
                                                        {formatCurrency(
                                                            report.totalEstimation,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            report.updatedAt,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link
                                                            href={`/reports/${report.reportNumber}`}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                className="gap-1.5 h-8"
                                                            >
                                                                {getActionLabel(
                                                                    report.status,
                                                                )}
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden divide-y divide-border/60">
                                    {filtered.map((report) => (
                                        <div
                                            key={report.reportNumber}
                                            className="p-4 space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-mono font-semibold text-sm">
                                                        {report.reportNumber}
                                                    </p>
                                                    <p className="text-sm font-medium mt-0.5 truncate">
                                                        {storeDisplay(
                                                            report.storeName,
                                                            report.storeCode,
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        {report.branchName}
                                                    </p>
                                                </div>
                                                {getStatusBadge(report.status)}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>
                                                    {report.createdBy.name}
                                                </span>
                                                <span>
                                                    {formatDate(
                                                        report.updatedAt,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-sm font-mono font-semibold">
                                                    {formatCurrency(
                                                        report.totalEstimation,
                                                    )}
                                                </span>
                                                <Link
                                                    href={`/reports/${report.reportNumber}`}
                                                >
                                                    <Button
                                                        size="sm"
                                                        className="gap-1.5 h-8"
                                                    >
                                                        {getActionLabel(
                                                            report.status,
                                                        )}
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
