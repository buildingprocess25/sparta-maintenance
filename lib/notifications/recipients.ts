import { UserRole } from "@prisma/client";
import type { NotificationRecipient } from "./types";

type BranchUser = {
    NIK: string;
    role: UserRole;
    branchNames: string[];
    deletedAt: Date | null;
};

async function getPrisma() {
    const mod = await import("@/lib/prisma");
    return mod.default;
}

export function filterUsersByBranchAndRole(
    users: BranchUser[],
    branchName: string,
    role: UserRole,
): NotificationRecipient[] {
    return users
        .filter((user) => user.role === role)
        .filter((user) => user.deletedAt === null)
        .filter((user) => user.branchNames.includes(branchName))
        .map((user) => ({ NIK: user.NIK, role: user.role }));
}

export async function getBmsRecipient(
    NIK: string,
): Promise<NotificationRecipient[]> {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
        where: { NIK },
        select: { NIK: true, role: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.role !== UserRole.BMS) return [];
    return [{ NIK: user.NIK, role: user.role }];
}

export async function getBranchRecipients(params: {
    branchName: string;
    role: UserRole;
}): Promise<NotificationRecipient[]> {
    const prisma = await getPrisma();
    const users = await prisma.user.findMany({
        where: {
            role: params.role,
            branchNames: { has: params.branchName },
            deletedAt: null,
        },
        select: { NIK: true, role: true },
    });

    return users.map((user) => ({ NIK: user.NIK, role: user.role }));
}
