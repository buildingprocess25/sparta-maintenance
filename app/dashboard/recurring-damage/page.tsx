import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { getChecklistItemMeta } from "@/lib/checklist-data";
import {
    isChecklistItemId,
    normalizeRecurringDamagePeriod,
    resolveRecurringDamageViewMode,
    type DamagedItemSummary,
    type RecurringDamageData,
} from "@/lib/recurring-damage";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import { getJakartaYear } from "@/lib/time";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getPreventiveBranchOptions, getReportYears } from "../preventive/actions";
import { RecurringDamageView } from "./_components/recurring-damage-view";
import { ExportRecurringDamageButton } from "./_components/export-recurring-damage-button";
import { loadDamagedItemSummary, loadRecurringDamageView } from "./queries";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        year?: string;
        quarter?: string;
        month?: string;
        branch?: string;
        brand?: string;
        store?: string;
        item?: string;
        view?: string;
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
    const view = resolveRecurringDamageViewMode(params);
    const showBranchList = view === "store" && isAdmin && branchName === "all";
    const rawItemId = params.item?.trim().toUpperCase() ?? "";
    const itemId = isChecklistItemId(rawItemId) ? rawItemId : undefined;
    const itemMeta = itemId ? getChecklistItemMeta(itemId) : undefined;

    const [branchOptions, availableYears] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve<string[]>([]),
        getReportYears(),
    ]);

    // Hanya data tab yang aktif yang dimuat. Error sudah dicatat oleh loader;
    // halaman menampilkan pesan gagal memuat.
    let data: RecurringDamageData | null = null;
    let itemSummary: DamagedItemSummary | null = null;
    let loadError = false;
    try {
        if (view === "item") {
            itemSummary = await loadDamagedItemSummary({ ...period, branchName, brand });
        } else {
            data = await loadRecurringDamageView({
                ...period,
                branchName,
                brand,
                itemId,
            });
        }
    } catch {
        loadError = true;
    }

    return (
        <AdminDashboardShell
            user={user}
            title="Analisa Kerusakan"
            breadcrumbs={[{ label: "Analisa Kerusakan" }]}
            headerActions={
                <ExportRecurringDamageButton
                    view={view}
                    filters={{
                        ...period,
                        branchName: isAdmin ? branchName : undefined,
                        brand,
                        itemId: view === "store" ? itemId : undefined,
                    }}
                />
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <RecurringDamageView
                view={view}
                itemSummary={itemSummary}
                isAdmin={isAdmin}
                branchOptions={branchOptions}
                availableYears={availableYears}
                period={period}
                branchName={branchName}
                brand={brand}
                branches={data?.branches ?? []}
                stores={showBranchList ? [] : (data?.stores ?? [])}
                showBranchList={showBranchList}
                focusItem={
                    view === "store" && itemId && itemMeta
                        ? { itemId, itemName: itemMeta.itemName }
                        : null
                }
                loadError={loadError}
                initialStoreCode={params.store?.trim() || null}
            />
        </AdminDashboardShell>
    );
}
