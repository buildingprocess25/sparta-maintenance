"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateTicketNumber } from "@/lib/report-helpers";
import { revalidatePath } from "next/cache";

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
    branchCode?: string;
    branchName?: string;
    contactNumber?: string;
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
// STORE ACTIONS
// =========================================

/**
 * Ambil daftar toko sesuai cabang user
 */
export async function getStoresByBranch(branchName: string) {
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
    const session = await getSession();
    if (!session) return null;

    const draft = await prisma.report.findFirst({
        where: {
            createdById: session.userId,
            status: "DRAFT",
        },
        include: {
            items: {
                include: {
                    estimations: true,
                },
            },
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
    const session = await getSession();
    if (!session) return { error: "Sesi tidak valid" };

    try {
        // Cari draft yang sudah ada
        const existingDraft = await prisma.report.findFirst({
            where: {
                createdById: session.userId,
                status: "DRAFT",
            },
        });

        if (existingDraft) {
            // Update draft yang ada
            // Hapus items lama lalu buat ulang
            await prisma.reportItem.deleteMany({
                where: { reportId: existingDraft.id },
            });

            const updatedReport = await prisma.report.update({
                where: { id: existingDraft.id },
                data: {
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchCode: data.branchCode || "",
                    branchName: data.branchName || "",
                    contactNumber: data.contactNumber || "",
                    totalEstimation: data.totalEstimation || 0,
                    items: {
                        create: data.checklistItems
                            .filter(
                                (item) =>
                                    item.condition || item.preventiveCondition,
                            )
                            .map((item) => ({
                                itemId: item.itemId,
                                itemName: item.itemName,
                                categoryName: item.categoryName,
                                condition: item.condition || null,
                                preventiveCondition:
                                    item.preventiveCondition || null,
                                handler: item.handler || null,
                                photoUrl: item.photoUrl || null,
                                estimations: {
                                    create: (
                                        data.bmsEstimations[item.itemId] || []
                                    ).map((est) => ({
                                        itemName: est.itemName,
                                        quantity: est.quantity,
                                        unit: est.unit,
                                        price: est.price,
                                        totalPrice: est.totalPrice,
                                    })),
                                },
                            })),
                    },
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
                    branchCode: data.branchCode || "",
                    branchName: data.branchName || "",
                    contactNumber: data.contactNumber || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "DRAFT",
                    createdById: session.userId,
                    items: {
                        create: data.checklistItems
                            .filter(
                                (item) =>
                                    item.condition || item.preventiveCondition,
                            )
                            .map((item) => ({
                                itemId: item.itemId,
                                itemName: item.itemName,
                                categoryName: item.categoryName,
                                condition: item.condition || null,
                                preventiveCondition:
                                    item.preventiveCondition || null,
                                handler: item.handler || null,
                                photoUrl: item.photoUrl || null,
                                estimations: {
                                    create: (
                                        data.bmsEstimations[item.itemId] || []
                                    ).map((est) => ({
                                        itemName: est.itemName,
                                        quantity: est.quantity,
                                        unit: est.unit,
                                        price: est.price,
                                        totalPrice: est.totalPrice,
                                    })),
                                },
                            })),
                    },
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
    const session = await getSession();
    if (!session) return { error: "Sesi tidak valid" };

    try {
        await prisma.report.delete({
            where: {
                id: reportId,
                createdById: session.userId,
                status: "DRAFT",
            },
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
    const session = await getSession();
    if (!session) return { error: "Sesi tidak valid" };

    try {
        // Cari draft yang sudah ada atau buat baru
        const existingDraft = await prisma.report.findFirst({
            where: {
                createdById: session.userId,
                status: "DRAFT",
            },
        });

        let reportId: string;

        if (existingDraft) {
            // Update dan submit draft
            await prisma.reportItem.deleteMany({
                where: { reportId: existingDraft.id },
            });

            await prisma.report.update({
                where: { id: existingDraft.id },
                data: {
                    storeId: data.storeId || null,
                    storeName: data.storeName || "",
                    branchCode: data.branchCode || "",
                    branchName: data.branchName || "",
                    contactNumber: data.contactNumber || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "PENDING_APPROVAL",
                    items: {
                        create: data.checklistItems
                            .filter(
                                (item) =>
                                    item.condition || item.preventiveCondition,
                            )
                            .map((item) => ({
                                itemId: item.itemId,
                                itemName: item.itemName,
                                categoryName: item.categoryName,
                                condition: item.condition || null,
                                preventiveCondition:
                                    item.preventiveCondition || null,
                                handler: item.handler || null,
                                photoUrl: item.photoUrl || null,
                                estimations: {
                                    create: (
                                        data.bmsEstimations[item.itemId] || []
                                    ).map((est) => ({
                                        itemName: est.itemName,
                                        quantity: est.quantity,
                                        unit: est.unit,
                                        price: est.price,
                                        totalPrice: est.totalPrice,
                                    })),
                                },
                            })),
                    },
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
                    branchCode: data.branchCode || "",
                    branchName: data.branchName || "",
                    contactNumber: data.contactNumber || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "PENDING_APPROVAL",
                    createdById: session.userId,
                    items: {
                        create: data.checklistItems
                            .filter(
                                (item) =>
                                    item.condition || item.preventiveCondition,
                            )
                            .map((item) => ({
                                itemId: item.itemId,
                                itemName: item.itemName,
                                categoryName: item.categoryName,
                                condition: item.condition || null,
                                preventiveCondition:
                                    item.preventiveCondition || null,
                                handler: item.handler || null,
                                photoUrl: item.photoUrl || null,
                                estimations: {
                                    create: (
                                        data.bmsEstimations[item.itemId] || []
                                    ).map((est) => ({
                                        itemName: est.itemName,
                                        quantity: est.quantity,
                                        unit: est.unit,
                                        price: est.price,
                                        totalPrice: est.totalPrice,
                                    })),
                                },
                            })),
                    },
                },
            });

            reportId = newReport.id;
        }

        revalidatePath("/reports");
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
    const session = await getSession();
    if (!session) return { reports: [], total: 0 };

    const { search, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        createdById: session.userId,
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
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.report.count({ where }),
    ]);

    return { reports, total };
}

/**
 * Ambil laporan yang sudah selesai (COMPLETED)
 * Untuk halaman /reports/finished
 */
export async function getFinishedReports(filters: ReportFilters = {}) {
    const session = await getSession();
    if (!session) return { reports: [], total: 0 };

    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        createdById: session.userId,
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
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.report.count({ where }),
    ]);

    return { reports, total };
}

// =========================================
// CATEGORY I — COOLDOWN CHECK
// =========================================

/**
 * Cek tanggal terakhir user melaporkan item Category I (Preventif)
 * Return null jika belum pernah, atau Date terakhir
 */
export async function getLastCategoryIDate() {
    const session = await getSession();
    if (!session) return null;

    const lastReport = await prisma.reportItem.findFirst({
        where: {
            itemId: { startsWith: "I" },
            report: {
                createdById: session.userId,
                status: { not: "DRAFT" },
            },
        },
        orderBy: {
            report: { createdAt: "desc" },
        },
        select: {
            report: {
                select: { createdAt: true },
            },
        },
    });

    return lastReport?.report?.createdAt || null;
}
