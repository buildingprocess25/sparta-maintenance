"use server";

import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
    await deleteSession();
    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:5173";
    redirect(ssoUrl);
}
