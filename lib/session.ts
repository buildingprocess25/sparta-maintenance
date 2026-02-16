import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "bnm_session";
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 Jam

function getSecretKey() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error("SESSION_SECRET env variable is not set");
    }
    return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, role: string) {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    // Sign session with HMAC-SHA256 via jose
    const token = await new SignJWT({ userId, role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(expiresAt)
        .setIssuedAt()
        .sign(getSecretKey());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        sameSite: "lax",
        path: "/",
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return {
            userId: payload.userId as string,
            role: payload.role as string,
        };
    } catch {
        // Token expired or invalid signature — return null.
        // Do NOT call deleteSession() here: mutating cookies during
        // Server Component render causes an infinite 307 redirect loop.
        return null;
    }
}
