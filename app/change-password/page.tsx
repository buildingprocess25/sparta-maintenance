import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSession } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
    const session = await getSession();

    // Not logged in → redirect to login
    if (!session?.userId) {
        redirect("/login");
    }

    // Already changed password → redirect to dashboard
    if (!session.mustChangePassword) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                variant="dashboard"
                title="Ganti Password"
                description=""
                showBackButton={false}
            />

            <ChangePasswordForm />

            <Footer />
        </div>
    );
}
