import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    buildRecurringDamageStores,
    filterRecurringDamageByItem,
    getRecurringDamageWindow,
    rankDamagedItems,
    summarizeRecurringDamageBranches,
    type DamageDetection,
    type DamagedItemRank,
    type RecurringDamageData,
    type RecurringDamagePeriod,
} from "@/lib/recurring-damage";
import {
    getStoreBrandWhere,
    type StoreBrandFilter,
} from "@/lib/store-brand-filter";

/** Cakupan toko yang sudah diresolusi; `branchName: null` = semua cabang. */
export type RecurringDamageScope = {
    branchName: string | null;
    brand: StoreBrandFilter;
};

export type DetectionStoreRef = {
    code: string;
    name: string;
    branchName: string;
};

type DetectionRow = {
    reportNumber: string;
    storeCode: string;
    createdAt: Date;
    status: string;
    itemId: string | null;
    condition: string | null;
    preventiveCondition: string | null;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

/**
 * Entri item rusak dari laporan yang dihitung, untuk toko dan rentang
 * `createdAt` yang diberikan. Tidak mengecek akses; pemanggil wajib
 * membatasi `stores` ke cakupan user.
 */
export async function fetchDamageDetections(input: {
    stores: readonly DetectionStoreRef[];
    start: Date;
    endExclusive: Date;
}): Promise<DamageDetection[]> {
    if (input.stores.length === 0) return [];

    const storeByCode = new Map(input.stores.map((store) => [store.code, store]));

    const rows = await prisma.$queryRaw<DetectionRow[]>`
        SELECT
            r."reportNumber",
            r."storeCode",
            r."createdAt",
            r."status"::text AS "status",
            item->>'itemId' AS "itemId",
            item->>'condition' AS "condition",
            item->>'preventiveCondition' AS "preventiveCondition",
            item->>'handler' AS "handler",
            item->>'notes' AS "notes",
            item->>'signageCondition' AS "signageCondition",
            item->>'signageMaterial' AS "signageMaterial"
        FROM "Report" r
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(r."items") = 'array' THEN r."items"
                ELSE '[]'::jsonb
            END
        ) AS item
        WHERE r."storeCode" = ANY(${input.stores.map((store) => store.code)}::text[])
          AND r."createdAt" >= ${input.start}
          AND r."createdAt" < ${input.endExclusive}
          AND r."status"::text NOT IN (${Prisma.join([...RECURRING_DAMAGE_EXCLUDED_STATUSES])})
          AND (
            item->>'condition' = 'RUSAK'
            OR item->>'preventiveCondition' = 'NOT_OK'
          )
    `;

    return rows.flatMap((row) => {
        const store = storeByCode.get(row.storeCode);
        if (!store || !row.itemId) return [];

        return [
            {
                branchName: store.branchName,
                storeCode: row.storeCode,
                storeName: store.name,
                reportNumber: row.reportNumber,
                createdAt: row.createdAt.toISOString(),
                status: row.status,
                itemId: row.itemId,
                condition: row.condition,
                preventiveCondition: row.preventiveCondition,
                handler: row.handler,
                notes: row.notes,
                signageCondition: row.signageCondition,
                signageMaterial: row.signageMaterial,
            },
        ];
    });
}

/** Toko aktif dalam cakupan beserta deteksi rusaknya pada periode. */
async function loadScopeDetections(
    scope: RecurringDamageScope,
    period: RecurringDamagePeriod,
): Promise<{ stores: DetectionStoreRef[]; detections: DamageDetection[] }> {
    const stores = await prisma.store.findMany({
        where: {
            isActive: true,
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
                ...(scope.branchName ? { equals: scope.branchName } : {}),
            },
            ...(getStoreBrandWhere(scope.brand) ?? {}),
        },
        select: { code: true, name: true, branchName: true },
    });

    const { start, endExclusive } = getRecurringDamageWindow(period);
    const detections = await fetchDamageDetections({
        stores,
        start,
        endExclusive,
    });
    return { stores, detections };
}

/**
 * Hitung toko rusak berulang untuk cakupan dan periode yang sudah diresolusi,
 * opsional dibatasi ke satu item. Tidak mengecek akses dan tidak di-cache;
 * pemanggil wajib meresolusi cakupan sesuai user.
 */
export async function computeRecurringDamage(
    scope: RecurringDamageScope,
    period: RecurringDamagePeriod,
    itemId: string | null = null,
): Promise<RecurringDamageData> {
    const { stores, detections } = await loadScopeDetections(scope, period);
    const recurringStores = buildRecurringDamageStores(detections);
    const visibleStores = itemId
        ? filterRecurringDamageByItem(recurringStores, itemId)
        : recurringStores;
    const branchNames = [...new Set(stores.map((store) => store.branchName))];

    return {
        branches: summarizeRecurringDamageBranches(branchNames, visibleStores),
        stores: visibleStores,
    };
}

/**
 * Item dengan kejadian rusak terbanyak untuk cakupan dan periode. Tidak
 * mengecek akses dan tidak di-cache.
 */
export async function computeDamagedItemRanking(
    scope: RecurringDamageScope,
    period: RecurringDamagePeriod,
    limit: number,
): Promise<DamagedItemRank[]> {
    const { detections } = await loadScopeDetections(scope, period);
    return rankDamagedItems(
        detections,
        buildRecurringDamageStores(detections),
        limit,
    );
}
