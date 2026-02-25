import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    BookOpen,
    ClipboardCheck,
    LogIn,
    TrendingDown,
    CheckCircle,
    Wrench,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export default async function Page() {
    // Check if user already logged in
    const session = await getSession();

    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header variant="default" />

            <section className="container mx-auto px-5 justify-center flex-1 flex items-center">
                <div className="max-w-4xl mx-auto text-center space-y-3">
                    <h1 className="text-3xl md:text-6xl font-bold text-foreground tracking-tight leading-snug md:leading-tight">
                        Pusat Pelaporan{" "}
                        <span className="text-primary">
                            Pekerjaan Maintenance
                        </span>{" "}
                        Toko
                    </h1>

                    <div className="flex justify-center gap-4 md:gap-5">
                        <div className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 md:w-36 md:h-36 text-card-foreground">
                            <Wrench className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                            <Badge
                                variant="secondary"
                                className="text-[10px] md:text-xs font-medium leading-tight text-center"
                            >
                                <CheckCircle className="text-primary" /> Laporan
                                Cepat
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 md:w-36 md:h-36 text-card-foreground">
                            <ClipboardCheck className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                            <Badge
                                variant="secondary"
                                className="text-[10px] md:text-xs font-medium leading-tight text-center"
                            >
                                <CheckCircle className="text-primary" />{" "}
                                Tracking Real-time
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2.5 w-28 h-28 md:w-36 md:h-36 text-card-foreground">
                            <TrendingDown className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                            <Badge
                                variant="secondary"
                                className="text-[10px] md:text-xs font-medium leading-tight text-center"
                            >
                                <CheckCircle className="text-primary" />{" "}
                                Efisiensi Biaya
                            </Badge>
                        </div>
                    </div>

                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Dengan atau Tanpa{" "}
                        <span className="text-primary font-semibold">
                            Dana Taktis
                        </span>
                        . Menjaga toko tetap{" "}
                        <span className="text-primary font-semibold">aman</span>
                        ,{" "}
                        <span className="text-primary font-semibold">
                            nyaman
                        </span>
                        ,{" "}
                        <span className="text-primary font-semibold">rapi</span>
                        , dan beroperasi optimal dengan{" "}
                        <span className="text-primary font-semibold">
                            biaya efisien
                        </span>{" "}
                        dan{" "}
                        <span className="text-primary font-semibold">
                            respon cepat
                        </span>
                        .
                    </p>

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
