"use server";

import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
    await deleteSession();
    const fallbackUrl = process.env.NODE_ENV === 'production' ? 'https://sparta-alfamart.web.id' : 'http://localhost:5173';
    const ssoUrl = process.env.NEXT_PUBLIC_SSO_PORTAL_URL || process.env.NEXT_PUBLIC_SSO_URL || fallbackUrl;
    redirect(ssoUrl);
}
