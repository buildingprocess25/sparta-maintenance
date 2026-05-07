// loading.tsx di /dashboard bisa async karena ini Server Component.
// Kita decode JWT dari cookie untuk mengetahui role — tanpa DB query —
// lalu render skeleton yang sesuai untuk ADMIN (sidebar) vs role lain (shell).

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { AdminDashboardSkeleton } from "./_components/admin/admin-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

async function getRoleFromCookie(): Promise<string | null> {
    try {
        const secret = process.env.SESSION_SECRET;
        if (!secret) return null;

        const cookieStore = await cookies();
        const token = cookieStore.get("app_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret),
        );
        return (payload.role as string) ?? null;
    } catch {
        return null;
    }
}

// ─── BMS/BMC/BNM skeleton — mirrors DashboardShell layout ────────────────────
function UserDashboardSkeleton() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl h-14 flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-20 hidden sm:block" />
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl space-y-6 md:space-y-8">
                {/* Welcome card */}
                <div className="md:rounded-xl md:border-l-4 md:border-l-primary md:border md:border-border md:bg-card md:shadow-sm">
                    <div className="flex-1 md:px-6 md:py-5">
                        <div className="md:hidden space-y-3">
                            <Skeleton className="h-6 w-44" />
                            <Skeleton className="h-5 w-56 rounded-full" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="hidden md:flex md:items-center justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-5 w-80 rounded-full" />
                            </div>
                            <div className="flex items-center gap-5 shrink-0">
                                <Skeleton className="h-12 w-28" />
                                <div className="w-px h-10 bg-border" />
                                <Skeleton className="h-9 w-24 rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                    {/* Menu buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 shrink-0">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 rounded-md" />
                        ))}
                    </div>

                    {/* Stats + activity */}
                    <div className="space-y-4">
                        <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row bg-card">
                            <div className="lg:w-52 p-4 lg:p-5 bg-muted/50 space-y-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-12 w-20" />
                            </div>
                            <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 bg-card">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="p-4 space-y-3">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-8 w-12" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border shadow-sm bg-card">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
                                    <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                                    <Skeleton className="h-5 w-32 rounded-full" />
                                    <Skeleton className="h-3 w-40" />
                                    <Skeleton className="h-3 w-24 ml-auto" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-background py-4">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl flex items-center justify-between">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </footer>
        </div>
    );
}

export default async function DashboardLoading() {
    const role = await getRoleFromCookie();

    if (role === "ADMIN") {
        return <AdminDashboardSkeleton />;
    }

    return <UserDashboardSkeleton />;
}
