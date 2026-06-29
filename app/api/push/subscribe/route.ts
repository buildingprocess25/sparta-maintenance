import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = subscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent");

    await prisma.pushSubscription.upsert({
        where: { endpoint: parsed.data.endpoint },
        update: {
            userNIK: user.NIK,
            p256dh: parsed.data.keys.p256dh,
            auth: parsed.data.keys.auth,
            userAgent,
            disabledAt: null,
            lastUsedAt: new Date(),
        },
        create: {
            userNIK: user.NIK,
            endpoint: parsed.data.endpoint,
            p256dh: parsed.data.keys.p256dh,
            auth: parsed.data.keys.auth,
            userAgent,
            lastUsedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true });
}
