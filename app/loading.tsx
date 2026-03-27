import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function HomeLoading() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header variant="default" />

            <section className="w-full mx-auto px-4 md:px-12 lg:px-20 justify-center flex-1 flex items-center">
                <div className="max-w-4xl mx-auto text-center space-y-6 w-full">
                    <div className="space-y-3">
                        <div className="h-8 md:h-14 w-3/4 mx-auto rounded-md bg-muted animate-pulse" />
                        <div className="h-8 md:h-14 w-1/2 mx-auto rounded-md bg-muted animate-pulse" />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 md:gap-5">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="min-w-20 flex-1 max-w-36 h-28 md:h-36 rounded-xl border bg-card p-3 md:p-4 space-y-3"
                            >
                                <div className="h-6 w-6 md:h-8 md:w-8 mx-auto rounded bg-muted animate-pulse" />
                                <div className="h-5 w-full rounded-full bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 max-w-2xl mx-auto">
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="h-4 w-11/12 mx-auto rounded bg-muted animate-pulse" />
                        <div className="h-4 w-3/4 mx-auto rounded bg-muted animate-pulse" />
                    </div>

                    <div className="w-full max-w-md mx-auto pt-6 grid grid-cols-2 gap-3">
                        <div className="h-11 rounded-md bg-muted animate-pulse" />
                        <div className="h-11 rounded-md bg-muted animate-pulse" />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
