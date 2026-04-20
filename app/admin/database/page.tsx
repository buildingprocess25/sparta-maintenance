import { requireRole } from "@/lib/authorization";
import {
    getAllUsers,
    getAllStores,
    getAllBranchNamesForAdmin,
} from "./queries";
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
import { AdminUserTable } from "./_components/user-table";
import { AdminStoreTable } from "./_components/store-table";

type SearchParams = {
    tab?: string;

    // User filters
    userPage?: string;
    uSearch?: string;
    uRole?: string;
    uBranch?: string;

    // Store filters
    storePage?: string;
    sSearch?: string;
    status?: string;
    sBranch?: string;
};

export default async function AdminDatabasePage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    await requireRole("ADMIN");
    const sp = (await searchParams) ?? {};

    const activeTab = sp.tab === "stores" ? "stores" : "users";
    const userPage = Math.max(1, Number(sp.userPage) || 1);
    const storePage = Math.max(1, Number(sp.storePage) || 1);

    const [usersResult, storesResult, allBranchNames] = await Promise.all([
        getAllUsers({
            page: userPage,
            limit: 10,
            search: sp.uSearch,
            role: sp.uRole,
            branchName: sp.uBranch,
        }),
        getAllStores({
            page: storePage,
            limit: 10,
            search: sp.sSearch,
            status: sp.status,
            branchName: sp.sBranch,
        }),
        getAllBranchNamesForAdmin(),
    ]);

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen User & Toko (Global)"
                description="Kelola seluruh user dan toko lintas cabang"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl space-y-6">
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

                    {/* ── Tab: Users ── */}
                    <TabsContent value="users" className="mt-0 outline-none">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Daftar User Global
                                </CardTitle>
                                <CardDescription>
                                    Kelola semua user dari seluruh cabang dan
                                    role.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AdminUserTable
                                    users={usersResult.users}
                                    allBranchNames={allBranchNames}
                                    totalCount={usersResult.total}
                                    currentPage={usersResult.page}
                                    totalPages={usersResult.totalPages}
                                    searchParams={{
                                        uSearch: sp.uSearch,
                                        uRole: sp.uRole,
                                        uBranch: sp.uBranch,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Tab: Stores ── */}
                    <TabsContent value="stores" className="mt-0 outline-none">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Daftar Toko Global
                                </CardTitle>
                                <CardDescription>
                                    Kelola semua toko dari seluruh cabang.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AdminStoreTable
                                    stores={storesResult.stores}
                                    allBranchNames={allBranchNames}
                                    totalCount={storesResult.total}
                                    currentPage={storesResult.page}
                                    totalPages={storesResult.totalPages}
                                    searchParams={{
                                        sSearch: sp.sSearch,
                                        status: sp.status,
                                        sBranch: sp.sBranch,
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
