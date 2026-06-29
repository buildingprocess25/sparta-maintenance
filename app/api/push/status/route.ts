import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
    const endpoint = body?.endpoint;

    if (!endpoint) {
        return NextResponse.json({ active: false });
    }

    const subscription = await prisma.pushSubscription.findFirst({
        where: {
            endpoint,
            userNIK: user.NIK,
            disabledAt: null,
        },
        select: { id: true },
    });

    return NextResponse.json({ active: Boolean(subscription) });
}
