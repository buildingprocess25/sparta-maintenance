import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
    getPreventiveMatrixExportData,
    type PreventiveMatrixBranchSummary,
    type PreventiveMatrixExportFilters,
    type PreventiveMatrixExportQuarter,
    type PreventiveMatrixExportStatus,
    type PreventiveMatrixQuarterCell,
} from "@/app/dashboard/preventive/annual-matrix-export";
import { logger } from "@/lib/logger";
import { formatJakartaDate, getJakartaYear } from "@/lib/time";
import {
    type StoreBrandFilter,
    parseStoreBrandFilter,
} from "@/lib/store-brand-filter";

type RequestBody = {
    branchName?: string;
    brand?: StoreBrandFilter;
    year?: number;
    quarter?: PreventiveMatrixExportQuarter;
    status?: PreventiveMatrixExportStatus;
};

const CONTENT_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const QUARTER_HEADERS = [
    { key: "q1", label: "Triwulan 1 Jan-Mar", nominal: "Nominal Triwulan 1" },
    { key: "q2", label: "Triwulan 2 Apr-Jun", nominal: "Nominal Triwulan 2" },
    { key: "q3", label: "Triwulan 3 Jul-Sep", nominal: "Nominal Triwulan 3" },
    { key: "q4", label: "Triwulan 4 Okt-Des", nominal: "Nominal Triwulan 4" },
] as const;

function textCell(value: string | null | undefined): XLSX.CellObject {
    return { t: "s", v: value ?? "" };
}

function numCell(value: number): XLSX.CellObject {
    return { t: "n", v: value };
}

function moneyCell(value: number | null | undefined): XLSX.CellObject {
    if (value === null || value === undefined) return { t: "s", v: "" };
    return { t: "n", v: value, z: '"Rp"#,##0' };
}

function percentCell(value: number): XLSX.CellObject {
    return { t: "n", v: value / 100, z: "0%" };
}

function formatQuarterCell(cell: PreventiveMatrixQuarterCell | null) {
    if (!cell) return "Belum";

    const bms = cell.bmsName || cell.bmsNIK || "-";
    return `${formatJakartaDate(cell.doneAt.toISOString())}\n${bms}`;
}

function buildSheet(
    data: XLSX.CellObject[][],
    colCount: number,
): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {};

    data.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
            const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            ws[addr] = cell;
        });
    });

    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(data.length - 1, 0), c: colCount - 1 },
    });
    ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
        const maxLen = data.reduce((max, row) => {
            const cell = row[i];
            const len = cell?.v !== undefined ? String(cell.v).length : 0;
            return Math.max(max, len);
        }, 10);
        return { wch: Math.min(maxLen + 2, 42) };
    });

    return ws;
}

function buildMatrixSheet(
    data: Awaited<ReturnType<typeof getPreventiveMatrixExportData>>,
): XLSX.WorkSheet {
    const headers = [
        "No",
        "Kode Toko",
        "Nama Toko",
        "Cabang",
        ...QUARTER_HEADERS.flatMap((quarter) => [
            quarter.label,
            quarter.nominal,
        ]),
    ];

    const rows = data.rows.map((row, index) => [
        numCell(index + 1),
        textCell(row.storeCode),
        textCell(row.storeName),
        textCell(row.branchName),
        ...QUARTER_HEADERS.flatMap((quarter) => {
            const cell = row[quarter.key];
            return [
                textCell(formatQuarterCell(cell)),
                moneyCell(cell?.totalReal),
            ];
        }),
    ]);

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function summaryRow(summary: PreventiveMatrixBranchSummary) {
    return [
        textCell(summary.branchName),
        numCell(summary.totalStores),
        numCell(summary.completed),
        numCell(summary.pending),
        percentCell(summary.coverage),
        moneyCell(summary.q1Total),
        moneyCell(summary.q2Total),
        moneyCell(summary.q3Total),
        moneyCell(summary.q4Total),
        moneyCell(summary.yearTotal),
    ];
}

function buildBranchSummarySheet(
    data: Awaited<ReturnType<typeof getPreventiveMatrixExportData>>,
): XLSX.WorkSheet {
    const headers = [
        "Cabang",
        "Target Toko",
        "Sudah Checklist",
        "Belum Checklist",
        "Coverage",
        "Total Nominal Triwulan 1",
        "Total Nominal Triwulan 2",
        "Total Nominal Triwulan 3",
        "Total Nominal Triwulan 4",
        "Total Nominal Tahun",
    ];
    const rows = [
        ...data.branchSummaries.map(summaryRow),
        summaryRow(data.grandTotal),
    ];

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function isQuarter(value: unknown): value is PreventiveMatrixExportQuarter {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

function isStatus(value: unknown): value is PreventiveMatrixExportStatus {
    return value === "all" || value === "completed" || value === "pending";
}

function sanitizeFileSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function parseFilters(body: RequestBody): PreventiveMatrixExportFilters | null {
    const year = body.year ?? getJakartaYear();
    const quarter = body.quarter;
    const status = body.status ?? "all";
    const brand = parseStoreBrandFilter(body.brand);

    if (!Number.isInteger(year) || year < 2000 || year > 2200) return null;
    if (!isQuarter(quarter)) return null;
    if (!isStatus(status)) return null;
    if (brand === null) return null;
    if (
        body.branchName !== undefined &&
        (typeof body.branchName !== "string" || body.branchName.trim() === "")
    ) {
        return null;
    }

    return {
        branchName: body.branchName,
        brand,
        year,
        quarter,
        status,
    };
}

export async function POST(request: NextRequest) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    let body: RequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    const filters = parseFilters(body);
    if (!filters) {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    try {
        const data = await getPreventiveMatrixExportData(filters);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
            wb,
            buildMatrixSheet(data),
            "Matriks Tahunan",
        );
        XLSX.utils.book_append_sheet(
            wb,
            buildBranchSummarySheet(data),
            "Ringkasan Cabang",
        );

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const branchSegment = sanitizeFileSegment(
            filters.branchName && filters.branchName !== "all"
                ? filters.branchName
                : "Semua_Cabang",
        );
        const fileName = `Matriks_Preventif_${branchSegment}_TW${filters.quarter}_${filters.year}.xlsx`;

        logger.info(
            {
                operation: "preventiveMatrixExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                rows: data.rows.length,
            },
            "Preventive matrix export completed",
        );

        return new NextResponse(buf, {
            headers: {
                "Content-Type": CONTENT_TYPE,
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const status =
            message === "Unauthorized"
                ? 401
                : message === "Unauthorized branch access"
                  ? 403
                  : 500;

        logger.error(
            {
                operation: "preventiveMatrixExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Preventive matrix export failed",
            error,
        );

        return NextResponse.json(
            {
                error:
                    status === 500
                        ? "Gagal mengekspor matriks preventif. Silakan coba lagi."
                        : "Anda tidak punya akses untuk ekspor ini",
            },
            { status },
        );
    }
}
