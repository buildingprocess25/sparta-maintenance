import "server-only";
import { getSession } from "./session";
import prisma from "./prisma";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
    const session = await getSession();

    if (!session || !session.userId) {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                branchName: true,
                createdAt: true,
            },
        });

        return user;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

export async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return user;
}

export async function getUserStats(userId: string) {
    try {
        const [totalReports, pendingReports, approvedReports, rejectedReports] =
            await Promise.all([
                prisma.report.count({
                    where: { createdById: userId },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "PENDING_APPROVAL",
                    },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "APPROVED",
                    },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "REJECTED",
                    },
                }),
            ]);

        return {
            totalReports,
            pendingReports,
            approvedReports,
            rejectedReports,
        };
    } catch (error) {
        console.error("Error fetching user stats:", error);
        return {
            totalReports: 0,
            pendingReports: 0,
            approvedReports: 0,
            rejectedReports: 0,
        };
    }
}
