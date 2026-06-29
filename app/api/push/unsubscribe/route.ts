import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
        where: {
            endpoint: parsed.data.endpoint,
            userNIK: user.NIK,
            disabledAt: null,
        },
        data: { disabledAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
