import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                variant="dashboard"
                title="Kembali"
                description=""
                showBackButton
                backHref="/login"
            />

            <ForgotPasswordForm />

            <Footer />
        </div>
    );
}
