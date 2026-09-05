import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Prisma doesn't have a built-in way to do case-insensitive updateMany easily without raw queries or specific configurations,
    // so we'll find the user(s) first. Usually email is unique but just in case we use findMany.
    const users = await prisma.user.findMany({
      where: {
        email: {
          equals: oldEmail,
          mode: "insensitive",
        },
      },
    });

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SSO Email Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
