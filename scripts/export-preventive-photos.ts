/**
 * Export preventive checklist photos for one checklist item to XLSX.
 *
 * Usage:
 *   npx tsx scripts/export-preventive-photos.ts --item B4 --year 2026
 *   npx tsx scripts/export-preventive-photos.ts --item B4 --branch PONTIANAK
 *   npx tsx scripts/export-preventive-photos.ts --item B4 --output exports/b4.xlsx
 */

import fs from "fs";
import { createRequire } from "node:module";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "../lib/prisma";
import { checklistCategories } from "../lib/checklist-data";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "../lib/admin-branch-scope";
import { getDriveCdnClient } from "../lib/google-drive/cdn-client";

const require = createRequire(import.meta.url);
const UZIP = require("uzip") as {
    parse: (buffer: ArrayBuffer) => Record<string, Uint8Array>;
    encode: (entries: Record<string, Uint8Array>) => ArrayBuffer;
};

type CliOptions = {
    itemId: string;
    year: number;
    branchName?: string;
    outputPath?: string;
    filledOnly: boolean;
};

type PreventivePhotoRow = {
    branchName: string;
    storeCode: string;
    storeName: string;
    reportNumber: string;
    createdAt: Date;
    quarter: number;
    selectedItem: unknown;
};

type ChecklistItemExportInfo = {
    id: string;
    name: string;
    title: string;
};

type ExportRow = {
    branchName: string;
    storeCode: string;
    storeName: string;
    q1: QuarterExport;
    q2: QuarterExport;
    q3: QuarterExport;
    q4: QuarterExport;
};

type QuarterExport = {
    doneAt: Date | null;
    photoId: string | null;
    conditionLabel: string | null;
};

const BASE_PHOTO_URL = "https://sparta-maintenance.onrender.com/api/photos";
const MISSING_PHOTO_LABEL = "Foto sepertinya sudah dihapus oleh sistem lama.";
const DATA_START_ROW_INDEX = 3; // zero-based: title, spacer, header, then data
const DATA_ROW_HEIGHT_PX = 170;
const QUARTERS = ["q1", "q2", "q3", "q4"] as const;
const DRIVE_CHECK_CONCURRENCY = 10;

type QuarterKey = (typeof QUARTERS)[number];

function usage(): never {
    console.error(`
Usage:
  npx tsx scripts/export-preventive-photos.ts --item B4 [--year 2026] [--branch PONTIANAK] [--output exports/preventive-B4.xlsx]

Options:
  --item, -i     ID item checklist, contoh: B4
  --year, -y     Tahun laporan. Default: tahun berjalan
  --branch, -b   Filter cabang opsional
  --output, -o   Path output XLSX opsional
  --filled-only  Hanya export toko dan kolom kuartal yang punya data item terpilih
`);
    process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        itemId: "",
        year: new Date().getFullYear(),
        filledOnly: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];

        if ((arg === "--item" || arg === "-i") && next) {
            options.itemId = next.trim().toUpperCase();
            i += 1;
        } else if ((arg === "--year" || arg === "-y") && next) {
            const year = Number(next);
            if (!Number.isInteger(year) || year < 2000 || year > 2100) {
                throw new Error(`Invalid year: ${next}`);
            }
            options.year = year;
            i += 1;
        } else if ((arg === "--branch" || arg === "-b") && next) {
            options.branchName = next.trim();
            i += 1;
        } else if ((arg === "--output" || arg === "-o") && next) {
            options.outputPath = next.trim();
            i += 1;
        } else if (arg === "--filled-only" || arg === "--only-filled") {
            options.filledOnly = true;
        } else if (arg === "--help" || arg === "-h") {
            usage();
        } else {
            throw new Error(`Unknown or incomplete argument: ${arg}`);
        }
    }

    if (!options.itemId) {
        throw new Error("Missing required argument: --item");
    }

    return options;
}

function findChecklistItem(itemId: string): ChecklistItemExportInfo {
    for (const category of checklistCategories) {
        const item = category.items.find(
            (candidate) => candidate.id.toUpperCase() === itemId,
        );
        if (item) {
            return {
                id: item.id,
                name: item.name,
                title: `${item.id} - ${item.name}`,
            };
        }
    }

    throw new Error(`Checklist item not found: ${itemId}`);
}

function getQuarter(date: Date): 1 | 2 | 3 | 4 {
    const month = date.getMonth();
    if (month <= 2) return 1;
    if (month <= 5) return 2;
    if (month <= 8) return 3;
    return 4;
}

function getFirstImageUrl(item: unknown): string | null {
    if (!item || typeof item !== "object") return null;

    const record = item as {
        images?: unknown;
        photoUrl?: unknown;
    };

    if (Array.isArray(record.images)) {
        const first = record.images.find(
            (value) => typeof value === "string" && value.trim().length > 0,
        );
        if (typeof first === "string") return first.trim();
    }

    if (typeof record.photoUrl === "string" && record.photoUrl.trim()) {
        return record.photoUrl.trim();
    }

    return null;
}

function getConditionLabel(item: unknown): string | null {
    if (!item || typeof item !== "object") return null;

    const record = item as {
        condition?: unknown;
        preventiveCondition?: unknown;
    };

    const value =
        typeof record.preventiveCondition === "string" &&
        record.preventiveCondition.trim()
            ? record.preventiveCondition
            : typeof record.condition === "string" && record.condition.trim()
              ? record.condition
              : null;

    switch (value?.toUpperCase()) {
        case "OK":
        case "BAIK":
            return "Baik";
        case "NOT_OK":
        case "RUSAK":
            return "Rusak";
        case "TIDAK_ADA":
            return "Tidak ada";
        default:
            return null;
    }
}

function extractPhotoId(url: string | null): string | null {
    if (!url) return null;

    const trimmed = url.trim();

    const proxyMatch = trimmed.match(/\/api\/photos\/([^/?#]+)/);
    if (proxyMatch) return decodeURIComponent(proxyMatch[1]);

    const cdnMatch = trimmed.match(
        /^https:\/\/lh3\.googleusercontent\.com\/d\/([^/?#]+)/,
    );
    if (cdnMatch) return decodeURIComponent(cdnMatch[1]);

    const downloadMatch = trimmed.match(/drive\.google\.com\/uc\?id=([^&]+)/);
    if (downloadMatch) return decodeURIComponent(downloadMatch[1]);

    return null;
}

function photoFormula(photoId: string | null): XLSX.CellObject {
    if (!photoId) return { t: "s", v: "" };

    // return {
    //     t: "s",
    //     v: "",
    //     // IMAGE is stored as a future Excel function. The _xlfn prefix avoids
    //     // Excel rewriting it as =@IMAGE(...) on open.
    //     f: `_xlfn.IMAGE("${BASE_PHOTO_URL}/${encodeURIComponent(photoId)}")`,
    // };
    return textCell(photoId)
}

function textCell(value: string): XLSX.CellObject {
    return { t: "s", v: value };
}

function dateCell(value: Date | null): XLSX.CellObject {
    if (!value) return textCell("");

    return {
        t: "d",
        v: value,
        z: "dd/mm/yyyy",
    };
}

function photoCell(quarter: QuarterExport): XLSX.CellObject {
    if (quarter.conditionLabel === "Tidak ada") return textCell("Tidak ada");
    if (quarter.photoId) return photoFormula(quarter.photoId);
    if (quarter.doneAt && !quarter.conditionLabel) return textCell("Tidak ada");
    if (quarter.doneAt) return textCell(MISSING_PHOTO_LABEL);
    return textCell("");
}

function conditionCell(quarter: QuarterExport): XLSX.CellObject {
    if (!quarter.doneAt) return textCell("");
    return textCell(quarter.conditionLabel ?? "Tidak ada");
}

async function fetchRows(options: CliOptions): Promise<PreventivePhotoRow[]> {
    const yearStart = new Date(options.year, 0, 1);
    const yearEnd = new Date(options.year + 1, 0, 1);
    const branchFilter = options.branchName ? [options.branchName] : null;

    const rows = await prisma.$queryRaw<PreventivePhotoRow[]>`
        WITH preventive_reports AS (
            SELECT
                r."reportNumber",
                r."createdAt",
                r."storeCode",
                r."items",
                s."branchName",
                s."code" AS "storeCodeResolved",
                s."name" AS "storeName"
            FROM "Report" r
            JOIN "Store" s ON s."code" = r."storeCode"
            WHERE r."createdAt" >= ${yearStart}
              AND r."createdAt" < ${yearEnd}
              AND r."status" <> 'DRAFT'::"ReportStatus"
              AND s."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}
              AND (${branchFilter}::text[] IS NULL OR s."branchName" = ANY(${branchFilter}::text[]))
              AND EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(r."items"::jsonb) preventive_item(value)
                  WHERE preventive_item.value->>'itemId' LIKE 'I%'
                    AND COALESCE(preventive_item.value->>'preventiveCondition', '') <> ''
              )
        )
        SELECT
            pr."branchName",
            pr."storeCodeResolved" AS "storeCode",
            pr."storeName",
            pr."reportNumber",
            pr."createdAt",
            (EXTRACT(QUARTER FROM pr."createdAt"))::int AS "quarter",
            selected_item.value AS "selectedItem"
        FROM preventive_reports pr
        LEFT JOIN LATERAL (
            SELECT item.value
            FROM jsonb_array_elements(pr."items"::jsonb) item(value)
            WHERE UPPER(item.value->>'itemId') = ${options.itemId}
            LIMIT 1
        ) selected_item ON true
        ORDER BY pr."branchName" ASC, pr."storeCodeResolved" ASC, pr."createdAt" DESC, pr."reportNumber" DESC
    `;

    return rows;
}

function buildExportRows(rows: PreventivePhotoRow[]): ExportRow[] {
    const byStore = new Map<string, ExportRow>();
    const seenQuarter = new Set<string>();

    for (const row of rows) {
        const key = row.storeCode;
        const quarterKey = `${key}:q${row.quarter}`;

        if (!byStore.has(key)) {
            byStore.set(key, {
                branchName: row.branchName,
                storeCode: row.storeCode,
                storeName: row.storeName,
                q1: { doneAt: null, photoId: null, conditionLabel: null },
                q2: { doneAt: null, photoId: null, conditionLabel: null },
                q3: { doneAt: null, photoId: null, conditionLabel: null },
                q4: { doneAt: null, photoId: null, conditionLabel: null },
            });
        }

        if (seenQuarter.has(quarterKey)) continue;
        seenQuarter.add(quarterKey);

        const imageUrl = getFirstImageUrl(row.selectedItem);
        const photoId = extractPhotoId(imageUrl);
        const conditionLabel = getConditionLabel(row.selectedItem);
        const exportRow = byStore.get(key)!;
        exportRow[`q${getQuarter(row.createdAt)}` as QuarterKey] = {
            doneAt: row.createdAt,
            photoId,
            conditionLabel,
        };
    }

    return Array.from(byStore.values()).sort((a, b) => {
        const branchCompare = a.branchName.localeCompare(b.branchName);
        if (branchCompare !== 0) return branchCompare;
        return a.storeCode.localeCompare(b.storeCode);
    });
}

async function validatePhotoIds(rows: ExportRow[]): Promise<number> {
    const allPhotoIds = new Set<string>();
    for (const row of rows) {
        for (const q of QUARTERS) {
            const photoId = row[q].photoId;
            if (photoId) allPhotoIds.add(photoId);
        }
    }

    if (allPhotoIds.size === 0) return 0;

    const { drive } = getDriveCdnClient();
    const missing = new Set<string>();
    const ids = Array.from(allPhotoIds);

    // Process in batches with concurrency limit
    for (let i = 0; i < ids.length; i += DRIVE_CHECK_CONCURRENCY) {
        const batch = ids.slice(i, i + DRIVE_CHECK_CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map((fileId) =>
                drive.files.get({
                    fileId,
                    fields: "id",
                    supportsAllDrives: true,
                }),
            ),
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (
                result.status === "rejected" &&
                (result.reason as { code?: number })?.code === 404
            ) {
                missing.add(batch[j]);
            }
        }

        if (i + DRIVE_CHECK_CONCURRENCY < ids.length) {
            console.log(
                `  Validating photos: ${Math.min(i + DRIVE_CHECK_CONCURRENCY, ids.length)}/${ids.length}...`,
            );
        }
    }

    // Nullify missing photo IDs
    if (missing.size > 0) {
        for (const row of rows) {
            for (const q of QUARTERS) {
                if (row[q].photoId && missing.has(row[q].photoId!)) {
                    row[q].photoId = null;
                }
            }
        }
    }

    return missing.size;
}

function hasQuarterData(quarter: QuarterExport) {
    return Boolean(quarter.conditionLabel || quarter.photoId);
}

function hasAnyQuarterData(row: ExportRow) {
    return QUARTERS.some((quarter) => hasQuarterData(row[quarter]));
}

function getActiveQuarters(
    rows: ExportRow[],
    filledOnly: boolean,
): QuarterKey[] {
    if (!filledOnly) return [...QUARTERS];

    const active = QUARTERS.filter((quarter) =>
        rows.some((row) => hasQuarterData(row[quarter])),
    );

    return active.length > 0 ? active : [...QUARTERS];
}

function buildWorkbook(
    item: ChecklistItemExportInfo,
    rows: ExportRow[],
    options: Pick<CliOptions, "filledOnly">,
): XLSX.WorkBook {
    const activeQuarters = getActiveQuarters(rows, options.filledOnly);
    const headers = [
        textCell("BRANCH"),
        textCell("KODE TOKO"),
        textCell("NAMA TOKO"),
        ...activeQuarters.flatMap((quarter) => {
            const label = quarter.toUpperCase();
            return [
                textCell(label),
                textCell(`KONDISI ${label}`),
                textCell(`FOTO ${label}`),
            ];
        }),
    ];

    const aoa: XLSX.CellObject[][] = [
        [textCell(`EKSPOR FOTO PREVENTIF: ${item.title}`)],
        [],
        headers,
        ...rows.map((row) => [
            textCell(row.branchName),
            textCell(row.storeCode),
            textCell(row.storeName),
            ...activeQuarters.flatMap((quarter) => [
                dateCell(row[quarter].doneAt),
                conditionCell(row[quarter]),
                photoCell(row[quarter]),
            ]),
        ]),
    ];

    const columnCount = headers.length;
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet["!merges"] = [
        {
            s: { r: 0, c: 0 },
            e: { r: 0, c: columnCount - 1 },
        },
    ];
    worksheet["!cols"] = [
        { wch: 22 },
        { wch: 14 },
        { wch: 32 },
        ...activeQuarters.flatMap(() => [
            { wch: 14 },
            { wch: 16 },
            { wch: 42 },
        ]),
    ];
    worksheet["!rows"] = aoa.map((_, rowIndex) =>
        rowIndex >= DATA_START_ROW_INDEX ? { hpx: DATA_ROW_HEIGHT_PX } : {},
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Foto Preventif");
    return workbook;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const item = findChecklistItem(options.itemId);
    const outputPath =
        options.outputPath ??
        path.join(
            process.cwd(),
            "exports",
            `preventive-photos-${item.id}-${options.year}.xlsx`,
        );

    console.log(`Exporting preventive photos`);
    console.log(`- Item  : ${item.title}`);
    console.log(`- Year  : ${options.year}`);
    console.log(`- Branch: ${options.branchName ?? "ALL"}`);
    console.log(`- Filled only: ${options.filledOnly ? "YES" : "NO"}`);

    const rows = await fetchRows(options);
    const exportRows = buildExportRows(rows).filter((row) =>
        options.filledOnly ? hasAnyQuarterData(row) : true,
    );

    console.log(`Validating ${exportRows.length} stores against Drive...`);
    const removedCount = await validatePhotoIds(exportRows);
    if (removedCount > 0) {
        console.log(`- Removed ${removedCount} missing photo(s) from export`);
    }

    const workbook = buildWorkbook(item, exportRows, options);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    XLSX.writeFile(workbook, outputPath, {
        bookType: "xlsx",
        cellStyles: true,
    });
    patchWorkbookDataRowStyle(outputPath);

    const filledPhotoCount = exportRows.reduce(
        (count, row) =>
            count +
            QUARTERS.map((quarter) => row[quarter]).filter((quarter) =>
                Boolean(quarter.photoId),
            ).length,
        0,
    );

    console.log(`Done`);
    console.log(`- Stores exported : ${exportRows.length}`);
    console.log(`- Photo formulas  : ${filledPhotoCount}`);
    console.log(`- Photos removed  : ${removedCount} (not found in Drive)`);
    console.log(`- Output          : ${outputPath}`);
}

function patchWorkbookDataRowStyle(filePath: string) {
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const entries = UZIP.parse(arrayBuffer);

    const stylesPath = "xl/styles.xml";
    const sheetPath = "xl/worksheets/sheet1.xml";
    const stylesFile = entries[stylesPath];
    const sheetFile = entries[sheetPath];

    if (!stylesFile || !sheetFile) {
        throw new Error("Invalid XLSX structure: missing styles or worksheet");
    }

    const stylesXml = Buffer.from(stylesFile).toString("utf8");
    const cellXfsMatch = stylesXml.match(
        /<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/,
    );
    if (!cellXfsMatch) {
        throw new Error("Invalid XLSX styles: missing cellXfs");
    }

    const dataCellStyleIndex = Number(cellXfsMatch[1]);
    const centeredStyle =
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>';
    const patchedStylesXml = stylesXml.replace(
        /<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/,
        (_match, countValue: string, content: string) =>
            `<cellXfs count="${Number(countValue) + 1}">${content}${centeredStyle}</cellXfs>`,
    );

    const sheetXml = Buffer.from(sheetFile).toString("utf8");
    const patchedSheetXml = sheetXml.replace(
        /<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g,
        (match: string, rowValue: string, attrs: string, content: string) => {
            if (Number(rowValue) < DATA_START_ROW_INDEX + 1) return match;

            const patchedContent = content.replace(
                /<c(?![^>]*\bs=)([^>]*)>/g,
                `<c s="${dataCellStyleIndex}"$1>`,
            );
            return `<row r="${rowValue}"${attrs}>${patchedContent}</row>`;
        },
    );

    entries[stylesPath] = Buffer.from(patchedStylesXml, "utf8");
    entries[sheetPath] = Buffer.from(patchedSheetXml, "utf8");

    fs.writeFileSync(filePath, Buffer.from(UZIP.encode(entries)));
}

main()
    .catch((error) => {
        console.error(
            error instanceof Error ? error.message : "Failed to export",
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
