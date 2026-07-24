import "server-only";

import { Prisma } from "@prisma/client";
import { PREVENTIVE_ITEM_IDS } from "@/lib/report-preventive";

export function completePreventiveEvidenceSql(input: {
    statusColumn: Prisma.Sql;
    itemsColumn: Prisma.Sql;
}): Prisma.Sql {
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
            WHERE item->>'itemId' IN (${Prisma.join(PREVENTIVE_ITEM_IDS)})
              AND item->>'preventiveCondition' IN ('OK', 'NOT_OK', 'TIDAK_ADA')
        ) = ${PREVENTIVE_ITEM_IDS.length}
    `;
}
