import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { BookOpen, LogIn, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Page() {
    // Check if user already logged in
    const session = await getSession();

    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header variant="default" />

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-12 md:py-20 flex-1 flex items-center">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                        Kelola Maintenance Store dengan{" "}
                        <span className="text-primary">Lebih Efisien</span>
                    </h2>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Sistem terpusat untuk pelaporan kerusakan, monitoring
                        perbaikan, dan pengelolaan SPJ maintenance di seluruh
                        store.
                    </p>

                    {/* CTA Buttons */}
                    <ButtonGroup
                        className="w-full max-w-md mx-auto pt-6"
                        orientation="horizontal"
                    >
                        <Button asChild size="lg" className="text-base flex-1">
                            <Link href="/login">
                                <LogIn className="mr-2 h-5 w-5" />
                                Login
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="text-base flex-1"
                        >
                            <Link href="/user-manual">
                                <BookOpen className="mr-2 h-5 w-5" />
                                User Manual
                            </Link>
                        </Button>
                    </ButtonGroup>
                </div>
            </section>

            <Footer />
        </div>
    );
}
