import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import {
    fetchReportExportRows,
    fetchMaterialExportRows,
    fetchPjumExportRows,
    type ExportFilter,
} from "@/app/admin/export/queries";

// ─── XLSX cell type constants ─────────────────────────────────────────────────

/** Format number Excel untuk tanggal dd/MM/yyyy HH.mm */
const DATE_FORMAT = "DD/MM/YYYY HH.mm";

/** Epoch offset antara Excel (1 Jan 1900) dan JS (1 Jan 1970) dalam hari */
const EXCEL_DATE_OFFSET = 25569;

/**
 * Konversi JS Date ke serial number Excel.
 * Excel menyimpan tanggal sebagai jumlah hari sejak 1 Januari 1900.
 */
function toExcelDate(date: Date | null | undefined): number | null {
    if (!date) return null;
    // miliseconds → hari + offset, kompensasi timezone lokal
    const msPerDay = 86400000;
    const utcDays = date.getTime() / msPerDay;
    return EXCEL_DATE_OFFSET + utcDays;
}

/** Buat cell teks */
function textCell(value: string | null | undefined): XLSX.CellObject {
    return { t: "s", v: value ?? "" };
}

/** Buat cell number */
function numCell(value: number | null | undefined): XLSX.CellObject {
    if (value === null || value === undefined) return { t: "n", v: 0 };
    return { t: "n", v: value };
}

/** Buat cell tanggal dengan custom format */
function dateCell(date: Date | null | undefined): XLSX.CellObject {
    const serial = toExcelDate(date);
    if (serial === null) return { t: "s", v: "" };
    return { t: "n", v: serial, z: DATE_FORMAT };
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildReportSheet(
    rows: Awaited<ReturnType<typeof fetchReportExportRows>>,
): XLSX.WorkSheet {
    const headers = [
        "No. Laporan",
        "Tanggal Dibuat",
        "Branch",
        "Kode Toko",
        "Nama Toko",
        "NIK BMS",
        "Nama BMS",
        "Status",
        "Total Estimasi (Rp)",
        "Total Realisasi (Rp)",
        "Tanggal Selesai",
        "Tanggal PJUM",
    ];

    const data: XLSX.CellObject[][] = [
        headers.map((h) => textCell(h)),
        ...rows.map((r) => [
            textCell(r.reportNumber),
            dateCell(r.createdAt),
            textCell(r.branchName),
            textCell(r.storeCode),
            textCell(r.storeName),
            textCell(r.bmsNIK),
            textCell(r.bmsName),
            textCell(r.status),
            numCell(r.totalEstimation),
            numCell(r.totalReal),
            dateCell(r.finishedAt),
            dateCell(r.pjumExportedAt),
        ]),
    ];

    return buildSheet(data, headers.length);
}

function buildMaterialSheet(
    rows: Awaited<ReturnType<typeof fetchMaterialExportRows>>,
): XLSX.WorkSheet {
    const headers = [
        "No. Laporan",
        "Nama Toko",
        "Branch",
        "NIK BMS",
        "Nama BMS",
        "Nama Material",
        "Jumlah",
        "Satuan",
        "Harga Satuan (Rp)",
        "Total Harga (Rp)",
    ];

    const data: XLSX.CellObject[][] = [
        headers.map((h) => textCell(h)),
        ...rows.map((r) => [
            textCell(r.reportNumber),
            textCell(r.storeName),
            textCell(r.branchName),
            textCell(r.bmsNIK),
            textCell(r.bmsName),
            textCell(r.materialName),
            numCell(r.quantity),
            textCell(r.unit),
            numCell(r.price),
            numCell(r.totalPrice),
        ]),
    ];

    return buildSheet(data, headers.length);
}

function buildPjumSheet(
    rows: Awaited<ReturnType<typeof fetchPjumExportRows>>,
): XLSX.WorkSheet {
    const headers = [
        "Branch",
        "NIK BMS",
        "Nama BMS",
        "Minggu ke-",
        "Dari Tanggal",
        "Sampai Tanggal",
        "Status",
        "Jumlah Laporan",
        "Dibuat Oleh",
        "Tanggal Dibuat",
        "Disetujui Oleh",
        "Tanggal Disetujui",
    ];

    const data: XLSX.CellObject[][] = [
        headers.map((h) => textCell(h)),
        ...rows.map((r) => [
            textCell(r.branchName),
            textCell(r.bmsNIK),
            textCell(r.bmsName),
            numCell(r.weekNumber),
            dateCell(r.fromDate),
            dateCell(r.toDate),
            textCell(r.status),
            numCell(r.reportCount),
            textCell(r.createdByName),
            dateCell(r.createdAt),
            textCell(r.approvedByName),
            dateCell(r.approvedAt),
        ]),
    ];

    return buildSheet(data, headers.length);
}

/**
 * Konversi array-of-arrays ke WorkSheet dan set auto column width.
 */
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
        e: { r: data.length - 1, c: colCount - 1 },
    });

    // Auto-width: 20 chars default, header row drives minimum
    ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
        const maxLen = data.reduce((max, row) => {
            const cell = row[i];
            const len = cell?.v !== undefined ? String(cell.v).length : 0;
            return Math.max(max, len);
        }, 10);
        return { wch: Math.min(maxLen + 2, 50) };
    });

    return ws;
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    logger.info(
        { operation: "adminExportXlsx", correlationId },
        "Export XLSX started",
    );

    // ─ Auth: only ADMIN ──────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
        logger.warn(
            { operation: "adminExportXlsx", correlationId, userId: user.NIK, role: user.role },
            "Non-admin attempted export",
        );
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─ Parse & validate body ─────────────────────────────────────────────────
    let body: {
        filter?: ExportFilter;
        sheets?: ("reports" | "materials" | "pjum")[];
        splitFiles?: boolean;
        fileName?: string;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const filter: ExportFilter = body.filter ?? {};
    const requestedSheets = body.sheets ?? ["reports", "materials", "pjum"];
    const splitFiles = body.splitFiles ?? false;
    const baseFileName = body.fileName ?? `sparta-export-${new Date().toISOString().slice(0, 10)}`;

    // ─ Fetch data ────────────────────────────────────────────────────────────
    try {
        const [reportRows, materialRows, pjumRows] = await Promise.all([
            requestedSheets.includes("reports")
                ? fetchReportExportRows(filter)
                : Promise.resolve([]),
            requestedSheets.includes("materials")
                ? fetchMaterialExportRows(filter)
                : Promise.resolve([]),
            requestedSheets.includes("pjum")
                ? fetchPjumExportRows(filter)
                : Promise.resolve([]),
        ]);

        // ─ Build workbook(s) ─────────────────────────────────────────────────

        if (splitFiles) {
            // Return JSON with base64-encoded files so client can trigger multiple downloads
            const files: { name: string; data: string }[] = [];

            if (requestedSheets.includes("reports") && reportRows.length > 0) {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, buildReportSheet(reportRows), "Rekap Laporan");
                const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                files.push({
                    name: `${baseFileName}-laporan.xlsx`,
                    data: Buffer.from(buf).toString("base64"),
                });
            }

            if (requestedSheets.includes("materials") && materialRows.length > 0) {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, buildMaterialSheet(materialRows), "Rekap Material");
                const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                files.push({
                    name: `${baseFileName}-material.xlsx`,
                    data: Buffer.from(buf).toString("base64"),
                });
            }

            if (requestedSheets.includes("pjum") && pjumRows.length > 0) {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, buildPjumSheet(pjumRows), "Rekap PJUM");
                const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                files.push({
                    name: `${baseFileName}-pjum.xlsx`,
                    data: Buffer.from(buf).toString("base64"),
                });
            }

            const durationMs = Math.round(performance.now() - start);
            logger.info(
                { operation: "adminExportXlsx", correlationId, userId: user.NIK, durationMs, fileCount: files.length },
                "Export XLSX (split) completed",
            );

            return NextResponse.json({ files });
        }

        // ─ Gabungan: single workbook ─────────────────────────────────────────
        const wb = XLSX.utils.book_new();

        if (requestedSheets.includes("reports")) {
            XLSX.utils.book_append_sheet(wb, buildReportSheet(reportRows), "Rekap Laporan");
        }
        if (requestedSheets.includes("materials")) {
            XLSX.utils.book_append_sheet(wb, buildMaterialSheet(materialRows), "Rekap Material");
        }
        if (requestedSheets.includes("pjum")) {
            XLSX.utils.book_append_sheet(wb, buildPjumSheet(pjumRows), "Rekap PJUM");
        }

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "adminExportXlsx", correlationId, userId: user.NIK, durationMs, rows: reportRows.length + materialRows.length + pjumRows.length },
            "Export XLSX (combined) completed",
        );

        return new NextResponse(buf, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${baseFileName}.xlsx"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "adminExportXlsx", correlationId, userId: user.NIK, durationMs },
            "Export XLSX failed",
            error,
        );
        return NextResponse.json(
            { error: "Gagal mengekspor data. Silakan coba lagi." },
            { status: 500 },
        );
    }
}
