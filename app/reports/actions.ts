"use server";

import prisma from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/report-helpers";
import { revalidatePath } from "next/cache";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import type { Prisma } from "@prisma/client";
import {
    requireAuth,
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { sendReportNotification } from "@/lib/email/send-report-notification";

// =========================================
// TYPES
// =========================================

export type ChecklistItemData = {
    itemId: string;
    itemName: string;
    categoryName: string;
    condition?: "BAIK" | "RUSAK" | "TIDAK_ADA";
    preventiveCondition?: "OK" | "NOT_OK";
    handler?: "BMS" | "REKANAN";
    photoUrl?: string;
};

export type BmsEstimationData = {
    itemName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
};

export type DraftData = {
    storeId?: string;
    storeName?: string;
    branchName?: string;
    checklistItems: ChecklistItemData[];
    bmsEstimations: Record<string, BmsEstimationData[]>;
    totalEstimation?: number;
};

export type ReportFilters = {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
};

// =========================================
// HELPERS — Convert DraftData to JSON structures
// =========================================

function buildItemsJson(data: DraftData): Prisma.InputJsonValue {
    return data.checklistItems
        .filter((item) => item.condition || item.preventiveCondition)
        .map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName,
            condition: item.condition || null,
            preventiveCondition: item.preventiveCondition || null,
            handler: item.handler || null,
            photoUrl: item.photoUrl || null,
        })) as unknown as Prisma.InputJsonValue;
}

function buildEstimationsJson(data: DraftData): Prisma.InputJsonValue {
    const estimations: MaterialEstimationJson[] = [];
    for (const [itemId, ests] of Object.entries(data.bmsEstimations)) {
        for (const est of ests) {
            estimations.push({
                itemId,
                materialName: est.itemName,
                quantity: est.quantity,
                unit: est.unit,
                price: est.price,
                totalPrice: est.totalPrice,
            });
        }
    }
    return estimations as unknown as Prisma.InputJsonValue;
}

// =========================================
// STORE ACTIONS
// =========================================

/**
 * Ambil daftar toko sesuai cabang user
 */
export async function getStoresByBranch(branchName: string) {
    // Authorization: User must be authenticated and from the same branch
    const user = await requireAuth();

    // ADMIN can access all branches, others only their own
    if (user.role !== "ADMIN" && user.branchName !== branchName) {
        throw new Error(
            "Anda hanya bisa mengakses toko dari cabang Anda sendiri",
        );
    }

    const stores = await prisma.store.findMany({
        where: { branchName },
        orderBy: { name: "asc" },
        select: {
            id: true,
            code: true,
            name: true,
            address: true,
        },
    });

    return stores;
}

// =========================================
// DRAFT ACTIONS
// =========================================

/**
 * Ambil DRAFT report milik user (max 1)
 */
export async function getDraft() {
    // Authorization: Only BMS can create/view drafts
    const user = await requireRole("BMS");

    const draft = await prisma.report.findFirst({
        where: {
            createdById: user.id,
            status: "DRAFT",
        },
        include: {
            store: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return draft;
}

/**
 * Simpan/update DRAFT report (upsert — max 1 draft per user)
 */
export async function saveDraft(data: DraftData) {
    // Authorization: Only BMS can save drafts
    const user = await requireRole("BMS");

    // CSRF Protection
    const headersList = await headers();
    await validateCSRF(headersList);

    const itemsJson = buildItemsJson(data);
    const estimationsJson = buildEstimationsJson(data);

    try {
        // Cari draft yang sudah ada
        const existingDraft = await prisma.report.findFirst({
            where: {
                createdById: user.id,
                status: "DRAFT",
            },
        });

        if (existingDraft) {
            // Update draft yang ada — langsung set JSON columns
            const updatedReport = await prisma.report.update({
                where: { id: existingDraft.id },
                data: {
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            return { reportId: updatedReport.id };
        } else {
            // Buat draft baru
            const ticketNumber = await generateTicketNumber();

            const newReport = await prisma.report.create({
                data: {
                    ticketNumber,
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "DRAFT",
                    createdById: user.id,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            return { reportId: newReport.id };
        }
    } catch (error) {
        console.error("Error saving draft:", error);
        return { error: "Gagal menyimpan draft" };
    }
}

/**
 * Hapus DRAFT report
 */
export async function deleteDraft(reportId: string) {
    // Authorization: Only BMS can delete drafts
    await requireRole("BMS");

    // CSRF Protection
    const headersList = await headers();
    await validateCSRF(headersList);

    try {
        // Verify ownership before deletion
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            select: { createdById: true, status: true },
        });

        if (!report) {
            return { error: "Draft tidak ditemukan" };
        }

        if (report.status !== "DRAFT") {
            return { error: "Hanya draft yang bisa dihapus" };
        }

        await requireOwnership(report.createdById);

        await prisma.report.delete({
            where: { id: reportId },
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting draft:", error);
        return { error: "Gagal menghapus draft" };
    }
}

// =========================================
// SUBMIT ACTION
// =========================================

/**
 * Submit report — ubah status dari DRAFT ke PENDING_APPROVAL
 */
export async function submitReport(data: DraftData) {
    // Authorization: Only BMS can submit reports
    const user = await requireRole("BMS");

    // CSRF Protection
    const headersList = await headers();
    await validateCSRF(headersList);

    const itemsJson = buildItemsJson(data);
    const estimationsJson = buildEstimationsJson(data);

    try {
        // Cari draft yang sudah ada atau buat baru
        const existingDraft = await prisma.report.findFirst({
            where: {
                createdById: user.id,
                status: "DRAFT",
            },
        });

        let reportId: string;

        if (existingDraft) {
            // Update dan submit draft
            await prisma.report.update({
                where: { id: existingDraft.id },
                data: {
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "PENDING_APPROVAL",
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            reportId = existingDraft.id;
        } else {
            // Buat baru langsung submit
            const ticketNumber = await generateTicketNumber();

            const newReport = await prisma.report.create({
                data: {
                    ticketNumber,
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "PENDING_APPROVAL",
                    createdById: user.id,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            reportId = newReport.id;
        }

        revalidatePath("/reports");

        // Kirim notifikasi email ke BMC dengan lampiran PDF (graceful — tidak gagalkan submit)
        sendReportNotification(reportId).catch((err) => {
            console.error(
                "[submitReport] Gagal mengirim email notifikasi:",
                err,
            );
        });

        return { success: true, reportId };
    } catch (error) {
        console.error("Error submitting report:", error);
        return { error: "Gagal mengirim laporan" };
    }
}

// =========================================
// FETCH REPORTS
// =========================================

/**
 * Ambil laporan milik user dengan filter dan pagination
 * Untuk halaman /reports (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED)
 */
export async function getMyReports(filters: ReportFilters = {}) {
    // Authorization: Only BMS can view their own reports
    const user = await requireRole("BMS");

    const { search, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        createdById: user.id,
        status: {
            in: status
                ? [status]
                : ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"],
        },
    };

    if (search) {
        where.OR = [
            { ticketNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
            { branchName: { contains: search, mode: "insensitive" } },
        ];
    }

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.report.count({ where }),
    ]);

    // Hitung jumlah items dari JSON array
    const reportsWithCount = reports.map((report) => ({
        ...report,
        _count: {
            items: Array.isArray(report.items)
                ? (report.items as unknown[]).length
                : 0,
        },
    }));

    return { reports: reportsWithCount, total };
}

/**
 * Ambil laporan yang sudah selesai (COMPLETED)
 * Untuk halaman /reports/finished
 */
export async function getFinishedReports(filters: ReportFilters = {}) {
    // Authorization: Only BMS can view their finished reports
    const user = await requireRole("BMS");

    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        createdById: user.id,
        status: "COMPLETED",
    };

    if (search) {
        where.OR = [
            { ticketNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
        ];
    }

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.report.count({ where }),
    ]);

    // Hitung jumlah items dari JSON array
    const reportsWithCount = reports.map((report) => ({
        ...report,
        _count: {
            items: Array.isArray(report.items)
                ? (report.items as unknown[]).length
                : 0,
        },
    }));

    return { reports: reportsWithCount, total };
}

// =========================================
// CATEGORY I — COOLDOWN CHECK
// =========================================

/**
 * Cek tanggal terakhir toko tertentu melaporkan item Category I (Preventif)
 * Sekarang baca dari kolom JSON `items` di Report
 * Return null jika belum pernah, atau ISO string tanggal terakhir
 */
export async function getLastCategoryIDate(storeId: string) {
    // Authorization: Only authenticated users can check cooldown
    await requireAuth();

    // Cari report terbaru untuk toko ini yang mengandung item Category I
    // Gunakan Prisma raw query untuk filter JSON array
    const reports = await prisma.report.findMany({
        where: {
            storeId: storeId,
            status: { not: "DRAFT" },
        },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            items: true,
        },
        take: 10, // Ambil 10 terbaru, filter di app layer
    });

    // Cek apakah ada report yang mengandung item dengan itemId dimulai "I"
    for (const report of reports) {
        const items = report.items as ReportItemJson[] | null;
        if (items && Array.isArray(items)) {
            const hasCategoryI = items.some((item) =>
                item.itemId.startsWith("I"),
            );
            if (hasCategoryI) {
                return report.createdAt.toISOString();
            }
        }
    }

    return null;
}
