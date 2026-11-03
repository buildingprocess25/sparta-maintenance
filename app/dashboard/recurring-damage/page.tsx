import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { normalizeRecurringDamagePeriod, type RecurringDamageData } from "@/lib/recurring-damage";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import { getJakartaYear } from "@/lib/time";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getPreventiveBranchOptions, getReportYears } from "../preventive/actions";
import { RecurringDamageView } from "./_components/recurring-damage-view";
import { ExportRecurringDamageButton } from "./_components/export-recurring-damage-button";
import { loadRecurringDamageView } from "./queries";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        year?: string;
        quarter?: string;
        month?: string;
        branch?: string;
        brand?: string;
        store?: string;
    }>;
};

export default async function RecurringDamagePage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const isAdmin = user.role === "ADMIN";
    const params = await searchParams;
    const period = normalizeRecurringDamagePeriod(params, getJakartaYear());
    const brand = isAdmin ? normalizeStoreBrandFilter(params.brand) : "ALL";
    const branchName = isAdmin
        ? params.branch?.trim() || "all"
        : (user.branchNames[0] ?? "");
    const showBranchList = isAdmin && branchName === "all";

    const [branchOptions, availableYears] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve<string[]>([]),
        getReportYears(),
    ]);

    let data: RecurringDamageData | null = null;
    try {
        data = await loadRecurringDamageView({ ...period, branchName, brand });
    } catch {
        // Sudah dicatat oleh loadRecurringDamageView; tampilkan pesan gagal memuat.
        data = null;
    }

    return (
        <AdminDashboardShell
            user={user}
            title="Kerusakan Berulang"
            breadcrumbs={[{ label: "Kerusakan Berulang" }]}
            headerActions={
                <ExportRecurringDamageButton
                    filters={{
                        ...period,
                        branchName: isAdmin ? branchName : undefined,
                        brand,
                    }}
                />
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <RecurringDamageView
                isAdmin={isAdmin}
                branchOptions={branchOptions}
                availableYears={availableYears}
                period={period}
                branchName={branchName}
                brand={brand}
                branches={data?.branches ?? []}
                stores={showBranchList ? [] : (data?.stores ?? [])}
                showBranchList={showBranchList}
                loadError={data === null}
                initialStoreCode={params.store?.trim() || null}
            />
        </AdminDashboardShell>
    );
}
