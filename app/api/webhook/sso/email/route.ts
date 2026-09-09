import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const internalKey = req.headers.get("x-sparta-internal-key");
    const expectedKey = process.env.SPARTA_INTERNAL_API_KEY || "sparta-internal-sync-key-2026";

    if (internalKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldEmail, newEmail } = await req.json();

    if (!oldEmail || !newEmail) {
      return NextResponse.json({ error: "Missing oldEmail or newEmail" }, { status: 400 });
    }

    await prisma.user.updateMany({
      where: {
        email: {
          equals: oldEmail,
          mode: "insensitive",
        },
      },
      data: { email: newEmail },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SSO Email Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
