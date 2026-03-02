import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/authorization";
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
import { ClipboardCheck, ArrowRight, Clock, CheckCircle2 } from "lucide-react";

type SearchParams = Promise<{ q?: string }>;

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return (
                <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 whitespace-nowrap"
                >
                    Menunggu Persetujuan Estimasi
                </Badge>
            );
        case "PENDING_REVIEW":
            return (
                <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 hover:bg-purple-100/80 whitespace-nowrap"
                >
                    Menunggu Review
                </Badge>
            );
        case "APPROVED_BMC":
            return (
                <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-800 hover:bg-teal-100/80 whitespace-nowrap"
                >
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

export default async function ApprovalReportsPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const user = await requireAuth();

    if (!["BMC", "BNM_MANAGER", "ADMIN"].includes(user.role)) {
        redirect("/reports");
    }

    const { q } = await searchParams;
    const search = q?.trim().toLowerCase();

    // Build status filter based on role
    const statusFilter =
        user.role === "BNM_MANAGER"
            ? (["APPROVED_BMC"] as const)
            : (["PENDING_ESTIMATION", "PENDING_REVIEW"] as const);

    // Build branch filter for BMC
    const branchFilter =
        user.role === "BMC" && user.branchNames.length > 0
            ? { branchName: { in: user.branchNames } }
            : {};

    const reports = await prisma.report.findMany({
        where: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: { in: statusFilter as any },
            ...branchFilter,
        },
        orderBy: { updatedAt: "desc" },
        select: {
            reportNumber: true,
            storeName: true,
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
        user.role === "BNM_MANAGER" ? "Persetujuan Final" : "Persetujuan Laporan";

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

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title={pageTitle}
                description={pageDescription}
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Card className="border-yellow-200 bg-yellow-50/50">
                        <CardContent className="pt-5 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{reports.length}</p>
                                <p className="text-sm text-muted-foreground">
                                    Total Menunggu Tindakan
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="pt-5 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {user.role === "BNM_MANAGER"
                                        ? "BNM Manager"
                                        : `${user.branchNames.length} Cabang`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {user.role === "BNM_MANAGER"
                                        ? "Semua Cabang"
                                        : "Area Anda"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-sm">
                    <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4 flex-wrap">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-primary" />
                                Daftar Laporan
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {filtered.length} laporan membutuhkan tindakan
                            </CardDescription>
                        </div>
                        <form method="GET" className="flex gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                name="q"
                                defaultValue={q}
                                placeholder="Cari no. laporan, toko..."
                                className="border rounded-md px-3 py-2 text-sm flex-1 sm:w-64 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <Button type="submit" variant="outline" size="sm">
                                Cari
                            </Button>
                        </form>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <div className="py-16">
                                <Empty>
                                    <EmptyMedia>
                                        <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
                                    </EmptyMedia>
                                    <EmptyHeader>
                                        <EmptyTitle>Tidak Ada Laporan</EmptyTitle>
                                        <EmptyDescription>
                                            {search
                                                ? `Tidak ada laporan yang cocok dengan "${search}".`
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
                                            <TableRow className="bg-muted/30">
                                                <TableHead>No. Laporan</TableHead>
                                                <TableHead>Toko / Cabang</TableHead>
                                                <TableHead>Dilaporkan Oleh</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Estimasi</TableHead>
                                                <TableHead>Diperbarui</TableHead>
                                                <TableHead className="text-right">
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map((report) => (
                                                <TableRow
                                                    key={report.reportNumber}
                                                    className="hover:bg-muted/20"
                                                >
                                                    <TableCell className="font-mono font-semibold text-sm">
                                                        {report.reportNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">
                                                            {report.storeName || "—"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {report.branchName}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {report.createdBy.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(report.status)}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono">
                                                        {formatCurrency(
                                                            report.totalEstimation,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(report.updatedAt)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link
                                                            href={`/reports/${report.reportNumber}`}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                className="gap-1.5"
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

                                {/* Mobile List */}
                                <div className="md:hidden divide-y">
                                    {filtered.map((report) => (
                                        <div
                                            key={report.reportNumber}
                                            className="p-4 space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-mono font-semibold text-sm">
                                                        {report.reportNumber}
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        {report.storeName || "—"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {report.branchName}
                                                    </p>
                                                </div>
                                                {getStatusBadge(report.status)}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{report.createdBy.name}</span>
                                                <span>
                                                    {formatDate(report.updatedAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-mono font-medium">
                                                    {formatCurrency(
                                                        report.totalEstimation,
                                                    )}
                                                </span>
                                                <Link
                                                    href={`/reports/${report.reportNumber}`}
                                                >
                                                    <Button size="sm" className="gap-1.5">
                                                        {getActionLabel(report.status)}
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
