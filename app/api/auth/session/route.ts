import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "bnm_session";

export async function GET() {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) {
        return NextResponse.json({ expired: true });
    }

    try {
        const data = JSON.parse(session);
        const isExpired = new Date(data.expiresAt) < new Date();
        return NextResponse.json({ expired: isExpired });
    } catch {
        return NextResponse.json({ expired: true });
    }
}
