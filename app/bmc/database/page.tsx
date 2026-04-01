import { requireRole } from "@/lib/authorization";
import { getUsersByBranches, getStoresByBranches } from "./queries";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Store } from "lucide-react";
import { UserTable } from "./_components/user-table";
import { StoreTable } from "./_components/store-table";

type SearchParams = {
    tab?: string;
    userPage?: string;
    storePage?: string;
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
        getUsersByBranches(user.branchNames, { page: userPage, limit: 10 }),
        getStoresByBranches(user.branchNames, { page: storePage, limit: 10 }),
    ]);

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen BMS & Toko"
                description="Data user dan toko cabang"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-5xl space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Cabang:</span>
                    {user.branchNames.map((branch) => (
                        <Badge key={branch}>{branch}</Badge>
                    ))}
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
                                    User
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
                                    Toko
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

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Daftar User (BMS & Branch Admin)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <UserTable
                                    users={usersResult.users}
                                    branchNames={user.branchNames}
                                    totalCount={usersResult.total}
                                    currentPage={usersResult.page}
                                    totalPages={usersResult.totalPages}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stores">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Toko</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StoreTable
                                    stores={storesResult.stores}
                                    branchNames={user.branchNames}
                                    totalCount={storesResult.total}
                                    currentPage={storesResult.page}
                                    totalPages={storesResult.totalPages}
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
