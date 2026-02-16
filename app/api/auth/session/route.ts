import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "bnm_session";

function getSecretKey() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    return new TextEncoder().encode(secret);
}

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({ expired: true });
    }

    try {
        const key = getSecretKey();
        if (!key) {
            return NextResponse.json({ expired: true });
        }
        await jwtVerify(token, key);
        return NextResponse.json({ expired: false });
    } catch {
        // Token expired or invalid
        return NextResponse.json({ expired: true });
    }
}
