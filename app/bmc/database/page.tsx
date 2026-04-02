import { requireRole } from "@/lib/authorization";
import { getUsersByBranches, getStoresByBranches } from "./queries";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Store } from "lucide-react";
import { UserTable } from "./_components/user-table";
import { StoreTable } from "./_components/store-table";

type SearchParams = {
    tab?: string;

    // User Filters
    userPage?: string;
    uSearch?: string;
    uRole?: string;

    // Store Filters
    storePage?: string;
    sSearch?: string;
    status?: string;
};

export default async function BmcDatabasePage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const user = await requireRole("BMC");
    const resolvedSearchParams = (await searchParams) ?? {};

    const activeTab =
        resolvedSearchParams.tab === "stores" ? "stores" : "users";

    const userPage = Math.max(1, Number(resolvedSearchParams.userPage) || 1);
    const storePage = Math.max(1, Number(resolvedSearchParams.storePage) || 1);

    const [usersResult, storesResult] = await Promise.all([
        getUsersByBranches(user.branchNames, {
            page: userPage,
            limit: 10,
            search: resolvedSearchParams.uSearch,
            role: resolvedSearchParams.uRole,
        }),
        getStoresByBranches(user.branchNames, {
            page: storePage,
            limit: 10,
            search: resolvedSearchParams.sSearch,
            status: resolvedSearchParams.status,
        }),
    ]);

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen BMS & Toko"
                description="Data user dan toko cabang"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground mr-1">
                            Area Anda:
                        </span>
                        {user.branchNames.map((branch) => (
                            <Badge
                                key={branch}
                                variant="outline"
                                className="bg-background"
                            >
                                {branch}
                            </Badge>
                        ))}
                    </div>
                </div>

                <Tabs defaultValue={activeTab} className="w-full">
                    <div className="mb-5">
                        <TabsList className="w-full bg-primary/10">
                            <TabsTrigger
                                value="users"
                                className="rounded-lg px-2 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 sm:gap-2"
                            >
                                <Users className="h-4 w-4 shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">
                                    Manajemen User
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="h-5 min-w-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                >
                                    {usersResult.total}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="stores"
                                className="rounded-lg px-2 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 sm:gap-2"
                            >
                                <Store className="h-4 w-4 shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">
                                    Manajemen Toko
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="h-5 min-w-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                >
                                    {storesResult.total}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="users" className="mt-0 outline-none">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Daftar User Area
                                </CardTitle>
                                <CardDescription>
                                    Kelola user BMS dan Branch Admin di cabang
                                    Anda.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserTable
                                    users={usersResult.users}
                                    branchNames={user.branchNames}
                                    totalCount={usersResult.total}
                                    currentPage={usersResult.page}
                                    totalPages={usersResult.totalPages}
                                    searchParams={{
                                        uSearch: resolvedSearchParams.uSearch,
                                        uRole: resolvedSearchParams.uRole,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stores" className="mt-0 outline-none">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Daftar Toko
                                </CardTitle>
                                <CardDescription>
                                    Daftar seluruh toko yang berada di area
                                    cabang Anda.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StoreTable
                                    stores={storesResult.stores}
                                    branchNames={user.branchNames}
                                    totalCount={storesResult.total}
                                    currentPage={storesResult.page}
                                    totalPages={storesResult.totalPages}
                                    searchParams={{
                                        sSearch: resolvedSearchParams.sSearch,
                                        status: resolvedSearchParams.status,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <Footer />
        </div>
    );
}
