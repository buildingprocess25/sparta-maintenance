import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { loadRecurringDamage } from "@/app/dashboard/recurring-damage/queries";
import { compareChecklistItemIds } from "@/lib/checklist-data";
import { logger } from "@/lib/logger";
import {
    RECURRING_DAMAGE_HANDLER_LABELS,
    isValidRecurringDamagePeriod,
    type RecurringDamageFilters,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import { getReportStatusLabel } from "@/lib/report-status";
import { describeSignageCondition } from "@/lib/signage";
import { parseStoreBrandFilter } from "@/lib/store-brand-filter";
import { getJakartaYear, toExcelJakartaSerial } from "@/lib/time";

type RequestBody = {
    year?: number;
    quarter?: number;
    month?: number;
    branchName?: string;
    brand?: string;
};

const CONTENT_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DATE_FORMAT = "DD/MM/YYYY HH.mm";

function textCell(value: string | null | undefined): XLSX.CellObject {
    return { t: "s", v: value ?? "" };
}

function numCell(value: number): XLSX.CellObject {
    return { t: "n", v: value };
}

function dateCell(value: string): XLSX.CellObject {
    const serial = toExcelJakartaSerial(value);
    if (serial === null) return { t: "s", v: "" };
    return { t: "n", v: serial, z: DATE_FORMAT };
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

function buildStoreSummarySheet(stores: RecurringDamageStore[]): XLSX.WorkSheet {
    const headers = [
        "No",
        "Cabang",
        "Kode Toko",
        "Nama Toko",
        "Frekuensi Rusak Maks",
        "Item Rusak Tersering",
        "Jumlah Item Rusak Berulang",
    ];
    const rows = stores.map((store, index) => [
        numCell(index + 1),
        textCell(store.branchName),
        textCell(store.storeCode),
        textCell(store.storeName),
        numCell(store.maxFrequency),
        textCell(`${store.topItemId} - ${store.topItemName}`),
        numCell(store.recurringItemCount),
    ]);

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function buildDetectionSheet(stores: RecurringDamageStore[]): XLSX.WorkSheet {
    const headers = [
        "No",
        "Cabang",
        "Kode Toko",
        "Nama Toko",
        "ID Item",
        "Nama Item",
        "Kategori",
        "No. Laporan",
        "Tanggal Laporan",
        "Status",
        "Handler",
        "Kondisi Signage",
        "Catatan",
    ];

    // Sort stabil: urut cabang, urutan ranking toko tetap di dalam cabang.
    const orderedStores = [...stores].sort((a, b) =>
        a.branchName.localeCompare(b.branchName),
    );
    const rows: XLSX.CellObject[][] = [];

    for (const store of orderedStores) {
        const items = [...store.items].sort((a, b) =>
            compareChecklistItemIds(a.itemId, b.itemId),
        );
        for (const item of items) {
            for (const detection of item.detections) {
                rows.push([
                    numCell(rows.length + 1),
                    textCell(store.branchName),
                    textCell(store.storeCode),
                    textCell(store.storeName),
                    textCell(item.itemId),
                    textCell(item.itemName),
                    textCell(item.categoryName),
                    textCell(detection.reportNumber),
                    dateCell(detection.createdAt),
                    textCell(getReportStatusLabel(detection.status)),
                    textCell(
                        detection.handler
                            ? (RECURRING_DAMAGE_HANDLER_LABELS[detection.handler] ?? detection.handler)
                            : "",
                    ),
                    textCell(describeSignageCondition(detection)?.text),
                    textCell(detection.notes),
                ]);
            }
        }
    }

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function sanitizeFileSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function parseFilters(body: RequestBody): RecurringDamageFilters | null {
    const period = {
        year: body.year ?? getJakartaYear(),
        quarter: body.quarter,
        month: body.month,
    };
    if (!isValidRecurringDamagePeriod(period)) return null;

    const brand = parseStoreBrandFilter(body.brand);
    if (brand === null) return null;
    if (
        body.branchName !== undefined &&
        (typeof body.branchName !== "string" || body.branchName.trim() === "")
    ) {
        return null;
    }

    return { ...period, branchName: body.branchName?.trim(), brand };
}

export async function POST(request: NextRequest) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }
    const body = raw as RequestBody;

    const filters = parseFilters(body);
    if (!filters) {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    try {
        const data = await loadRecurringDamage(filters);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
            wb,
            buildStoreSummarySheet(data.stores),
            "Ringkasan Toko",
        );
        XLSX.utils.book_append_sheet(
            wb,
            buildDetectionSheet(data.stores),
            "Detail Deteksi",
        );

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        // Admin memilih "Semua Cabang" (branchName "all") → "Semua_Cabang".
        // Selain itu, satu cabang di data (BMC/BNM, atau brand menyisakan satu cabang)
        // → nama dari data; lalu filter cabang bila ada; terakhir "Semua_Cabang".
        const branchSegment = sanitizeFileSegment(
            filters.branchName === "all"
                ? "Semua_Cabang"
                : data.branches.length === 1
                  ? data.branches[0].branchName
                  : filters.branchName
                    ? filters.branchName
                    : "Semua_Cabang",
        );
        const quarterSegment = filters.quarter ? `_TW${filters.quarter}` : "";
        const monthSegment = filters.month
            ? `_${String(filters.month).padStart(2, "0")}`
            : "";
        const fileName = `Kerusakan_Berulang_${branchSegment}_${filters.year}${quarterSegment}${monthSegment}.xlsx`;

        logger.info(
            {
                operation: "recurringDamageExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                stores: data.stores.length,
            },
            "Recurring damage export completed",
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
        const status = message === "Unauthorized" ? 401 : 500;

        logger.error(
            {
                operation: "recurringDamageExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Recurring damage export failed",
            error,
        );

        return NextResponse.json(
            {
                error:
                    status === 500
                        ? "Gagal mengekspor kerusakan berulang. Silakan coba lagi."
                        : "Anda tidak punya akses untuk ekspor ini",
            },
            { status },
        );
    }
}
