import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { ReportDetailView } from "./report-detail-view";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { parseMaterialStores } from "@/lib/report-material-stores";
import { normalizePhotoUrl, normalizePhotoUrls } from "@/lib/storage/photo-url";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function ReportDetailPage({ params }: Props) {
    const { reportNumber } = await params;
    const user = await requireAuth(`/reports/${reportNumber}`);

    const report = await prisma.report.findUnique({
        where: { reportNumber },
        include: {
            createdBy: { select: { NIK: true, name: true } },
            activities: {
                orderBy: { createdAt: "asc" },
                include: { actor: { select: { name: true } } },
            },
        },
    });

    if (!report) notFound();

    // TAHAP 3: PENCEGAT (INTERCEPTOR) GOOGLE DRIVE
    // Prioritaskan link folder agar user bisa melihat semua versi dokumen (asli + revisi).
    const driveFileUrl = report.reportFinalDriveUrl || report.completedPdfPath;
    const driveFolderUrl = report.revisedPdfFolderUrl;
    const driveUrl = driveFolderUrl || driveFileUrl;

    if (report.status === "COMPLETED" && driveUrl) {
        const hasFolder = !!driveFolderUrl;
        const hasRevision = !!report.revisedPdfDriveUrl;

        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <div className="bg-background max-w-md w-full border shadow-sm rounded-xl p-8 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Laporan Telah Selesai</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Laporan <strong>{reportNumber}</strong> telah diselesaikan dan diarsipkan di Google Drive.
                        </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 text-left">
                        <strong>Perhatian:</strong> Dokumen hanya dapat diakses menggunakan email internal perusahaan (SAT). Pastikan Anda telah login menggunakan email kantor di browser Anda.
                    </div>

                    {/* Tombol utama: buka folder (jika ada) atau file langsung */}
                    <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        {hasFolder ? "Buka Folder Laporan di Google Drive" : "Buka Laporan di Google Drive"}
                    </a>

                    {/* Jika sudah ada folder, tampilkan juga link langsung ke PDF asli */}
                    {hasFolder && driveFileUrl && (
                        <a
                            href={driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
                        >
                            Buka PDF Asli Langsung
                        </a>
                    )}

                    {/* Badge revisi jika sudah pernah di-revisi */}
                    {hasRevision && report.revisedPdfDriveUrl && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-left space-y-2">
                            <p className="text-xs font-semibold text-orange-800">⚡ Tersedia PDF Revisi</p>
                            <a
                                href={report.revisedPdfDriveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 transition-colors hover:bg-orange-100"
                            >
                                Buka PDF Revisi
                            </a>
                        </div>
                    )}

                    <div className="pt-2">
                        <Link prefetch={false} href="/reports" className="text-sm text-primary hover:underline">
                            Kembali ke Daftar Laporan
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Access control
    if (user.role === "BMS") {
        // BMS can only view their own reports
        if (report.createdByNIK !== user.NIK) redirect("/reports");
    } else if (user.role === "BMC") {
        // BMC can view reports from their branches
        if (!user.branchNames.includes(report.branchName)) redirect("/reports");
    } else if (user.role === "BNM_MANAGER") {
        // BnM Manager can review APPROVED_BMC and view COMPLETED reports
        // (COMPLETED masih diizinkan jika Drive URL kosong sebagai fallback)
        if (report.status !== "APPROVED_BMC" && report.status !== "COMPLETED") {
            redirect("/reports");
        }
    } else if (user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const items = (report.items ?? []) as unknown as ReportItemJson[];
    const estimations = (report.estimations ??
        []) as unknown as MaterialEstimationJson[];

    // Parse selvie URL — stored as plain URL (1 photo) or JSON array (multiple)
    function parseUrlField(raw: string | null | undefined): string[] {
        if (!raw) return [];
        const trimmed = raw.trim();

        if (trimmed === "[]") return [];

        if (trimmed.startsWith("[")) {
            try {
                const parsed = JSON.parse(trimmed);
                return normalizePhotoUrls(parsed);
            } catch {
                return [];
            }
        }

        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
                const parsed = JSON.parse(trimmed);
                const normalized = normalizePhotoUrl(parsed);
                return normalized ? [normalized] : [];
            } catch {
                return [];
            }
        }

        const normalized = normalizePhotoUrl(trimmed);
        return normalized ? [normalized] : [];
    }

    // Parse receipt URLs — stored as JSONB array, but may come back as a JSON
    // string with some DB drivers (e.g. Neon). Handle both forms defensively.
    function parseJsonArray(raw: unknown): string[] {
        if (!raw) return [];
        if (Array.isArray(raw)) return normalizePhotoUrls(raw);
        if (typeof raw === "string" && raw.startsWith("[")) {
            try {
                const parsed = JSON.parse(raw);
                return normalizePhotoUrls(parsed);
            } catch {
                return [];
            }
        }
        return [];
    }

    return (
        <ReportDetailView
            report={{
                reportNumber: report.reportNumber,
                storeName: report.storeName,
                storeCode: report.storeCode || "",
                branchName: report.branchName,
                status: report.status as string,
                totalEstimation: Number(report.totalEstimation),
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                submittedBy: report.createdBy.name,
                items,
                estimations,
                activities: report.activities.map((a) => ({
                    action: a.action as string,
                    notes: a.notes ?? null,
                    actorName: a.actor.name,
                    createdAt: a.createdAt,
                })),
                startSelfieUrls: parseUrlField(report.startSelfieUrl),
                startReceiptUrls: parseJsonArray(report.startReceiptUrls),
                startMaterialStores: parseMaterialStores(
                    report.startMaterialStores,
                ),
                completionAdditionalPhotos: parseJsonArray(
                    report.completionAdditionalPhotos,
                ),
                completionAdditionalNote: report.completionAdditionalNote,
                pendingEstimationPdfPath: report.pendingEstimationPdfPath,
                estimationApprovedPdfPath: report.estimationApprovedPdfPath,
                approvedBmcPdfPath: report.approvedBmcPdfPath,
                completedPdfPath: report.completedPdfPath,
            }}
            viewer={{ role: user.role, nik: user.NIK }}
        />
    );
}
