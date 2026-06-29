import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [items, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { recipientNIK: user.NIK },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                type: true,
                title: true,
                body: true,
                href: true,
                readAt: true,
                createdAt: true,
            },
        }),
        prisma.notification.count({
            where: { recipientNIK: user.NIK, readAt: null },
        }),
    ]);

    return NextResponse.json({
        items: items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            readAt: item.readAt?.toISOString() ?? null,
        })),
        unreadCount,
    });
}
