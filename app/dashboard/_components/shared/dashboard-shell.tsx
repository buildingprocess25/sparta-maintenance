import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Store } from "lucide-react";
import { LogoutButton } from "../../logout-button";
import { capitalizeEachWord } from "@/lib/utils";
import type { AuthUser } from "@/lib/authorization";
import { ROLE_LABEL_OVERRIDES } from "@/lib/role-overrides";

const ROLE_LABELS: Record<string, string> = {
    BMS: "Branch Maintenance Support",
    BMC: "Branch Maintenance Coordinator",
    BNM_MANAGER: "BNM Manager",
    ADMIN: "Admin",
};

type Props = {
    user: AuthUser;
    children: React.ReactNode;
};

export function DashboardShell({ user, children }: Props) {
    const roleLabel =
        ROLE_LABEL_OVERRIDES[user.NIK] ?? ROLE_LABELS[user.role] ?? user.role;
    const now = new Date();
    const dayNum = now.getDate().toString().padStart(2, "0");
    const monthYear = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
    });
    const weekday = now.toLocaleDateString("id-ID", { weekday: "long" });

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Dashboard"
                showBackButton={false}
                backHref="/"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl space-y-6 md:space-y-8">
                {/* Welcome Section */}
                <div className="md:rounded-xl md:border-l-4 md:border-l-primary md:border md:border-border md:bg-card md:shadow-sm">
                    <div className="flex-1 md:px-6 md:py-5">
                        {/* Mobile layout */}
                        <div className="flex items-start justify-between gap-3 md:hidden">
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                                    {capitalizeEachWord(user.name)}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {roleLabel}
                                    </span>
                                    <span className="text-muted-foreground/40 select-none text-xs">
                                        ·
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                        <Store className="h-3 w-3 shrink-0" />
                                        <span className="truncate">
                                            {user.branchNames.join(", ") || "—"}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <LogoutButton />
                                <p className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                    {weekday},{" "}
                                    {now.toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden md:flex md:items-center justify-between gap-4">
                            {/* Identity */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                                    Selamat datang kembali
                                </p>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {capitalizeEachWord(user.name)}
                                </h1>
                                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Store className="h-3.5 w-3.5 shrink-0" />
                                        {user.branchNames.join(", ") || "—"}
                                    </span>
                                    <span className="text-muted-foreground/40 select-none">
                                        ·
                                    </span>
                                    <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Date + Logout */}
                            <div className="flex items-center gap-5 shrink-0">
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold tabular-nums leading-none text-foreground">
                                        {dayNum}
                                    </span>
                                    <div className="mb-0.5">
                                        <p className="text-sm font-semibold leading-tight text-foreground">
                                            {monthYear}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-tight">
                                            {weekday}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-border" />
                                <LogoutButton />
                            </div>
                        </div>
                    </div>
                </div>

                {children}
            </main>

            <Footer />
        </div>
    );
}
