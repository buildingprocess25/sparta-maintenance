import "server-only";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "bnm_session";

export async function createSession(userId: string, role: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Jam
    const session = JSON.stringify({ userId, role, expiresAt });

    // Enkripsi session jika perlu, untuk sekarang kita simpan simple string/JSON
    // Di production sebaiknya gunakan library seperti 'jose' atau 'jsonwebtoken'

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session, {
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
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!session) return null;

    try {
        const data = JSON.parse(session);
        // Check if session expired
        if (new Date(data.expiresAt) < new Date()) {
            await deleteSession();
            return null;
        }
        return data;
    } catch {
        return null;
    }
}
