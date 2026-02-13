import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
    // Check if user already logged in
    const session = await getSession();

    if (session) {
        redirect("/dashboard");
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

            <LoginForm />

            <Footer />
        </div>
    );
}
