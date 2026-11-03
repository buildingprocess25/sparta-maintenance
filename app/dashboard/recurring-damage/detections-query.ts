import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    type DamageDetection,
} from "@/lib/recurring-damage";

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
        WHERE r."storeCode" IN (${Prisma.join(input.stores.map((store) => store.code))})
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
