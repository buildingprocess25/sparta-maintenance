import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Store, Calendar } from "lucide-react";
import { LogoutButton } from "../../logout-button";
import { capitalizeEachWord } from "@/lib/utils";
import type { AuthUser } from "@/lib/authorization";

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
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Dashboard"
                showBackButton={false}
                backHref="/"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-7xl space-y-8">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
                            Selamat Datang, {capitalizeEachWord(user.name)}
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Store className="h-3 w-3 md:h-4 md:w-4" />
                            {user.branchNames.join(", ") || "No Branch"}
                            <span className="hidden md:inline text-muted-foreground/50">
                                |
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] md:text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                {roleLabel}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Badge
                            variant="outline"
                            className="flex px-3 py-1.5 gap-2 items-center text-xs font-normal"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date().toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </Badge>
                        <LogoutButton />
                    </div>
                </div>

                {children}
            </main>

            <Footer />
        </div>
    );
}
