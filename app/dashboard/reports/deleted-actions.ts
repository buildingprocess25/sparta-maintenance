"use server";

import { getAuthUser } from "@/lib/authorization";
import prisma from "@/lib/prisma";

export async function getDeletedReports() {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }
    
    const reports = await prisma.deletedReport.findMany({
        orderBy: { deletedAt: "desc" },
        take: 100, // Batasi 100 data terbaru untuk performa awal
    });
    
    return reports;
}
