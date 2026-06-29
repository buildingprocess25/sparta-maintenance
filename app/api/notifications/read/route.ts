import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const schema = z.object({
    id: z.string().uuid().optional(),
    all: z.boolean().optional(),
});

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const now = new Date();

    if (parsed.data.all) {
        await prisma.notification.updateMany({
            where: { recipientNIK: user.NIK, readAt: null },
            data: { readAt: now },
        });
        return NextResponse.json({ ok: true });
    }

    if (parsed.data.id) {
        await prisma.notification.updateMany({
            where: { id: parsed.data.id, recipientNIK: user.NIK },
            data: { readAt: now },
        });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "No notification selected" }, { status: 400 });
}
