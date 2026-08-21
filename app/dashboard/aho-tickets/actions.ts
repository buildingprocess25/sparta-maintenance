"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { getAuthUser, requireRole } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { SETTING_KEYS } from "@/lib/app-settings";

export type AdminAhoTicketFilters = {
    search?: string;
    branchName?: string;
    status?: string;
};

// ─── List (cursor-based infinite scroll) ─────────────────────────────────────

export async function getAdminAhoTickets(
    cursor: string | null,
    limit: number = 20,
    filters: AdminAhoTicketFilters,
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    try {
        const where: Prisma.MasterAhoTicketWhereInput = {};

        if (filters.search) {
            where.OR = [
                { storeCode: { contains: filters.search, mode: "insensitive" } },
                { problemNo: { contains: filters.search, mode: "insensitive" } },
                { branchName: { contains: filters.search, mode: "insensitive" } },
                { status: { contains: filters.search, mode: "insensitive" } },
                { store: { name: { contains: filters.search, mode: "insensitive" } } },
            ];
        }

        if (filters.branchName) {
            where.branchName = { contains: filters.branchName, mode: "insensitive" };
        }

        if (filters.status && filters.status !== "all") {
            where.status = { equals: filters.status, mode: "insensitive" };
        }

        const totalCount = await prisma.masterAhoTicket.count({ where });

        const tickets = await prisma.masterAhoTicket.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: [{ storeCode: "asc" }, { problemNo: "asc" }],
            include: {
                store: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        let nextCursor: string | null = null;
        if (tickets.length > limit) {
            const next = tickets.pop();
            nextCursor = next!.id;
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminAhoTickets", correlationId, durationMs, count: tickets.length },
            "Fetched admin aho tickets successfully",
        );

        return { tickets, nextCursor, totalCount };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminAhoTickets", correlationId, durationMs },
            "Failed to fetch admin aho tickets",
            error,
        );
        throw new Error("Gagal memuat data tiket AHO");
    }
}

export async function adminImportAhoTickets(formData: FormData): Promise<
    | { jobId: string; error?: never }
    | { error: string; jobId?: never }
> {
    try {
        const admin = await requireRole(["ADMIN"]);
        const headersList = await headers();

        // CSRF validation
        const origin = headersList.get("origin") ?? "";
        const host = headersList.get("host") ?? "";
        const isValid =
            origin === "" ||
            origin.includes(host) ||
            process.env.NODE_ENV === "development";
        if (!isValid) {
            return { error: "Request tidak valid" };
        }

        const file = formData.get("file") as File | null;
        if (!file || !(file instanceof File)) {
            return { error: "File tidak ditemukan" };
        }
        if (!file.name.endsWith(".xlsx")) {
            return { error: "Hanya menerima file .xlsx" };
        }

        // Simpan ke DB dan dapatkan jobId
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const job = await prisma.ahoImportJob.create({
            data: {
                requestedByNIK: admin.NIK,
                fileBuffer: buffer,
            },
        });

        logger.info(
            { operation: "adminImportAhoTickets", jobId: job.id, userId: admin.NIK },
            "AHO import job enqueued via Server Action",
        );

        // Fire-and-forget: proses di background
        // Import dinamis untuk menghindari bundling XLSX di server action response
        import("@/lib/jobs/aho-import").then(({ processAhoImportJob }) => {
            processAhoImportJob(job.id).catch((err) => {
                logger.error(
                    { operation: "adminImportAhoTickets", jobId: job.id },
                    "Background process failed",
                    err,
                );
            });
        });

        return { jobId: job.id };
    } catch (error) {
        logger.error(
            { operation: "adminImportAhoTickets" },
            "Failed to sync AHO tickets",
            error,
        );
        return {
            ...result,
            errors: [...result.errors, "Gagal melakukan sinkronisasi (Kesalahan server)"],
        };
    }
}

// ─── Fetch Active Tickets for Store (Client Form) ────────────────────────────────

export async function getActiveAhoTickets(storeCode: string) {
    try {
        const user = await getAuthUser();
        if (!user) return [];

        const tickets = await prisma.masterAhoTicket.findMany({
            where: {
                storeCode: storeCode,
                status: { in: ["New", "Progress"] },
            },
            select: { problemNo: true },
            orderBy: { problemNo: "asc" },
        });

        return tickets.map(t => t.problemNo);
    } catch (error) {
        logger.error({ operation: "getActiveAhoTickets", storeCode }, "Failed to fetch tickets", error);
        return [];
    }
}

// ─── CRUD Actions for Manual Management ──────────────────────────────────────

export async function adminCreateAhoTicket(data: {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode?: string;
    branchName?: string;
}) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        let normalizedBranchName = data.branchName?.trim() || null;
        if (normalizedBranchName && normalizedBranchName.toUpperCase().startsWith("DC ")) {
            normalizedBranchName = normalizedBranchName.substring(3).trim();
        }

        const ticket = await prisma.masterAhoTicket.create({
            data: {
                storeCode: data.storeCode.trim().toUpperCase(),
                problemNo: data.problemNo.trim(),
                status: data.status,
                branchCode: data.branchCode?.trim() || null,
                branchName: normalizedBranchName,
            }
        });
        revalidatePath("/dashboard/aho-tickets");
        return { ticket };
    } catch (e: any) {
        if (e.code === "P2002") return { error: "Tiket dengan toko dan nomor problem ini sudah ada." };
        if (e.code === "P2003") return { error: "Toko dengan kode tersebut tidak ditemukan." };
        return { error: "Gagal menyimpan tiket AHO." };
    }
}

export async function adminUpdateAhoTicket(id: string, data: {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode?: string;
    branchName?: string;
}) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        let normalizedBranchName = data.branchName?.trim() || null;
        if (normalizedBranchName && normalizedBranchName.toUpperCase().startsWith("DC ")) {
            normalizedBranchName = normalizedBranchName.substring(3).trim();
        }

        const ticket = await prisma.masterAhoTicket.update({
            where: { id },
            data: {
                storeCode: data.storeCode.trim().toUpperCase(),
                problemNo: data.problemNo.trim(),
                status: data.status,
                branchCode: data.branchCode?.trim() || null,
                branchName: normalizedBranchName,
            }
        });
        revalidatePath("/dashboard/aho-tickets");
        return { ticket };
    } catch (e: any) {
        if (e.code === "P2002") return { error: "Tiket dengan toko dan nomor problem ini sudah ada." };
        if (e.code === "P2003") return { error: "Toko dengan kode tersebut tidak ditemukan." };
        return { error: "Gagal mengupdate tiket AHO." };
    }
}

export async function adminDeleteAhoTicket(id: string) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        await prisma.masterAhoTicket.delete({ where: { id } });
        revalidatePath("/dashboard/aho-tickets");
        return { success: true };
    } catch (e: any) {
        return { error: "Gagal menghapus tiket AHO." };
    }
}
