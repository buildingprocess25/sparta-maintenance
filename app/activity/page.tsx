import { requireAuth } from "@/lib/authorization";
import {
    getBMSActivity,
    getBranchActivity,
    getGlobalActivity,
} from "@/app/dashboard/queries";
import { ActivityFeed } from "@/app/dashboard/_components/shared/activity-feed";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const PER_PAGE = 10;
const POOL = 200;

type Props = {
    searchParams: Promise<{ page?: string }>;
};

export default async function ActivityPage({ searchParams }: Props) {
    const user = await requireAuth();
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, Number(pageParam) || 1);

    let all;
    switch (user.role) {
        case "BMS":
            all = await getBMSActivity(user.NIK, POOL);
            break;
        case "BMC":
        case "BNM_MANAGER":
            all = await getBranchActivity(user.branchNames, POOL);
            break;
        case "ADMIN":
        default:
            all = await getGlobalActivity(POOL);
            break;
    }

    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const activities = all.slice(
        (safePage - 1) * PER_PAGE,
        safePage * PER_PAGE,
    );

    function pageHref(p: number) {
        return `/activity?page=${p}`;
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Semua Aktivitas"
                showBackButton
                backHref="/dashboard"
            />
            <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-2xl space-y-4">
                <ActivityFeed
                    activities={activities}
                    emptyMessage="Belum ada aktivitas yang tercatat."
                />

                {totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href={pageHref(safePage - 1)}
                                    className={
                                        safePage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }).map((_, i) => {
                                const p = i + 1;
                                if (
                                    totalPages <= 7 ||
                                    p === 1 ||
                                    p === totalPages ||
                                    (p >= safePage - 1 && p <= safePage + 1)
                                ) {
                                    return (
                                        <PaginationItem key={p}>
                                            <PaginationLink
                                                href={pageHref(p)}
                                                isActive={p === safePage}
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                } else if (
                                    (p === safePage - 2 && safePage > 3) ||
                                    (p === safePage + 2 &&
                                        safePage < totalPages - 2)
                                ) {
                                    return (
                                        <PaginationItem key={`ellipsis-${p}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href={pageHref(safePage + 1)}
                                    className={
                                        safePage >= totalPages
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </main>
            <Footer />
        </div>
    );
}
