import "server-only";

import { Prisma } from "@prisma/client";
import { PREVENTIVE_REQUIRED_ITEM_IDS } from "@/lib/report-preventive";
import { SIGNAGE_ITEM_IDS } from "@/lib/signage";

type EvidenceColumns = {
    statusColumn: Prisma.Sql;
    itemsColumn: Prisma.Sql;
};

/** Laporan non-DRAFT yang berisi seluruh `itemIds` dengan kondisi preventif. */
function itemGroupEvidenceSql(
    input: EvidenceColumns,
    itemIds: readonly string[],
): Prisma.Sql {
    return Prisma.sql`
        ${input.statusColumn} <> 'DRAFT'::"ReportStatus"
        AND (
            SELECT COUNT(DISTINCT item->>'itemId')
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(${input.itemsColumn}) = 'array'
                    THEN ${input.itemsColumn}
                    ELSE '[]'::jsonb
                END
            ) AS item
            WHERE item->>'itemId' IN (${Prisma.join([...itemIds])})
              AND item->>'preventiveCondition' IN ('OK', 'NOT_OK', 'TIDAK_ADA')
        ) = ${itemIds.length}
    `;
}

export function completePreventiveEvidenceSql(input: EvidenceColumns): Prisma.Sql {
    return itemGroupEvidenceSql(input, PREVENTIVE_REQUIRED_ITEM_IDS);
}

/** Masa jeda signage: laporan non-DRAFT dengan I11–I13 lengkap. */
export function completeSignageEvidenceSql(input: EvidenceColumns): Prisma.Sql {
    return itemGroupEvidenceSql(input, SIGNAGE_ITEM_IDS);
}
