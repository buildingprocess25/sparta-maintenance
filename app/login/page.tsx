import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect?: string; logout?: string }>;
}) {
    // Check if user already logged in
    const session = await getSession();
    const { redirect: callbackUrl } = await searchParams;

    if (session) {
        redirect(
            callbackUrl && callbackUrl.startsWith("/")
                ? callbackUrl
                : "/dashboard",
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                variant="dashboard"
                title="Kembali"
                description=""
                showBackButton
                backHref="/"
            />

            <LoginForm callbackUrl={callbackUrl} />

            <Footer />
        </div>
    );
}
