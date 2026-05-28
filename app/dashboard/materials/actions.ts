"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";

export type AdminMaterialFilters = {
    search?: string;
    branchName?: string;
};

export type MaterialRow = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
};

type MaterialCursor = {
    updatedAt: string;
    reportNumber: string;
    rowIndex: number;
};

type MaterialRawRow = MaterialRow & {
    updatedAt: Date;
    rowIndex: number | bigint;
};

function encodeMaterialCursor(row: MaterialRawRow): string {
    const cursor: MaterialCursor = {
        updatedAt: row.updatedAt.toISOString(),
        reportNumber: row.reportNumber,
        rowIndex: Number(row.rowIndex),
    };

    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeMaterialCursor(cursor: string | null): MaterialCursor | null {
    if (!cursor) return null;

    try {
        const parsed = JSON.parse(
            Buffer.from(cursor, "base64url").toString("utf8"),
        ) as Partial<MaterialCursor>;

        if (
            typeof parsed.updatedAt !== "string" ||
            typeof parsed.reportNumber !== "string" ||
            typeof parsed.rowIndex !== "number"
        ) {
            return null;
        }

        return {
            updatedAt: parsed.updatedAt,
            reportNumber: parsed.reportNumber,
            rowIndex: parsed.rowIndex,
        };
    } catch {
        return null;
    }
}

function buildMaterialWhereSql(
    filters: AdminMaterialFilters,
    cursor?: MaterialCursor | null,
) {
    const conditions: Prisma.Sql[] = [
        Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`,
        Prisma.sql`r."status" = 'COMPLETED'::"ReportStatus"`,
        Prisma.sql`r."reportFinalDriveUrl" IS NOT NULL`,
        Prisma.sql`jsonb_typeof(r."estimations"::jsonb) = 'array'`,
    ];

    const search = filters.search?.trim();
    if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(Prisma.sql`(
            r."reportNumber" ILIKE ${searchPattern}
            OR r."storeName" ILIKE ${searchPattern}
            OR COALESCE(r."storeCode", '') ILIKE ${searchPattern}
            OR r."createdByNIK" ILIKE ${searchPattern}
            OR u."name" ILIKE ${searchPattern}
            OR COALESCE(material.value->>'materialName', '') ILIKE ${searchPattern}
        )`);
    }

    if (filters.branchName && filters.branchName !== "all") {
        conditions.push(Prisma.sql`r."branchName" = ${filters.branchName}`);
    }

    if (cursor) {
        conditions.push(Prisma.sql`(
            r."updatedAt" < ${new Date(cursor.updatedAt)}
            OR (
                r."updatedAt" = ${new Date(cursor.updatedAt)}
                AND r."reportNumber" < ${cursor.reportNumber}
            )
            OR (
                r."updatedAt" = ${new Date(cursor.updatedAt)}
                AND r."reportNumber" = ${cursor.reportNumber}
                AND material.ordinality::int > ${cursor.rowIndex}
            )
        )`);
    }

    return Prisma.join(conditions, " AND ");
}

export async function getAdminMaterials(
    cursor: string | null,
    limit: number = 20,
    filters: AdminMaterialFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const decodedCursor = decodeMaterialCursor(cursor);
        const whereSql = buildMaterialWhereSql(filters);
        const pageWhereSql = buildMaterialWhereSql(filters, decodedCursor);

        const [countRows, rawRows] = await Promise.all([
            prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(DISTINCT lower(trim(material.value->>'materialName'))) AS count
                FROM "Report" r
                JOIN "User" u ON u."NIK" = r."createdByNIK"
                CROSS JOIN LATERAL jsonb_array_elements(r."estimations"::jsonb)
                    WITH ORDINALITY AS material(value, ordinality)
                WHERE ${whereSql}
                    AND COALESCE(trim(material.value->>'materialName'), '') <> ''
            `,
            prisma.$queryRaw<MaterialRawRow[]>`
                SELECT
                    r."reportNumber" AS "reportNumber",
                    r."storeName" AS "storeName",
                    r."storeCode" AS "storeCode",
                    r."branchName" AS "branchName",
                    r."createdByNIK" AS "bmsNIK",
                    u."name" AS "bmsName",
                    COALESCE(material.value->>'materialName', '') AS "materialName",
                    COALESCE(NULLIF(material.value->>'quantity', '')::numeric, 0)::float8 AS "quantity",
                    COALESCE(material.value->>'unit', '') AS "unit",
                    COALESCE(NULLIF(material.value->>'price', '')::numeric, 0)::float8 AS "price",
                    COALESCE(NULLIF(material.value->>'totalPrice', '')::numeric, 0)::float8 AS "totalPrice",
                    r."updatedAt" AS "updatedAt",
                    material.ordinality::int AS "rowIndex"
                FROM "Report" r
                JOIN "User" u ON u."NIK" = r."createdByNIK"
                CROSS JOIN LATERAL jsonb_array_elements(r."estimations"::jsonb)
                    WITH ORDINALITY AS material(value, ordinality)
                WHERE ${pageWhereSql}
                    AND COALESCE(trim(material.value->>'materialName'), '') <> ''
                ORDER BY r."updatedAt" DESC, r."reportNumber" DESC, material.ordinality::int ASC
                LIMIT ${limit + 1}
            `,
        ]);

        let nextCursor: typeof cursor = null;
        if (rawRows.length > limit) {
            const nextItem = rawRows.pop();
            nextCursor = nextItem ? encodeMaterialCursor(nextItem) : null;
        }

        const materials: MaterialRow[] = rawRows.map((row) => ({
            reportNumber: row.reportNumber,
            storeName: row.storeName,
            storeCode: row.storeCode,
            branchName: row.branchName,
            bmsNIK: row.bmsNIK,
            bmsName: row.bmsName,
            materialName: row.materialName,
            quantity: Number(row.quantity || 0),
            unit: row.unit || "",
            price: Number(row.price || 0),
            totalPrice: Number(row.totalPrice || 0),
        }));
        const totalUniqueCount = Number(countRows[0]?.count ?? 0);

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminMaterials", correlationId, durationMs, count: materials.length },
            "Fetched admin materials successfully"
        );

        return {
            materials,
            nextCursor,
            totalUniqueCount,
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminMaterials", correlationId, durationMs },
            "Failed to fetch admin materials",
            error
        );
        throw new Error("Failed to load materials");
    }
}
