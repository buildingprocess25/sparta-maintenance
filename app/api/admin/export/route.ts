import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import {
  fetchReportExportRows,
  fetchMaterialExportRows,
  fetchPjumExportRows,
  fetchPreventiveExportRows,
  type ExportFilter,
} from "@/app/admin/export/queries";
import { toExcelJakartaSerial } from "@/lib/time";

// ─── XLSX cell type constants ─────────────────────────────────────────────────

/** Format number Excel untuk tanggal dd/MM/yyyy HH.mm */
const DATE_FORMAT = "DD/MM/YYYY HH.mm";

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
  const serial = toExcelJakartaSerial(date);
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
    "Timestamp Laporan Diajukan",
    "Timestamp Revisi Estimasi Diajukan",
    "Timestamp Estimasi Disetujui",
    "Timestamp Estimasi Perlu Revisi",
    "Timestamp Estimasi Ditolak",
    "Timestamp Pekerjaan Dimulai",
    "Timestamp Penyelesaian Diajukan",
    "Timestamp Revisi Pekerjaan Diajukan",
    "Timestamp Pekerjaan Disetujui BMC",
    "Timestamp Pekerjaan Perlu Revisi",
    "Timestamp Final Disetujui BNM",
    "Timestamp Final Perlu Revisi BNM",
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
      dateCell(r.submittedAt),
      dateCell(r.resubmittedEstimationAt),
      dateCell(r.estimationApprovedAt),
      dateCell(r.estimationRejectedRevisionAt),
      dateCell(r.estimationRejectedAt),
      dateCell(r.workStartedAt),
      dateCell(r.completionSubmittedAt),
      dateCell(r.resubmittedWorkAt),
      dateCell(r.workApprovedAt),
      dateCell(r.workRejectedRevisionAt),
      dateCell(r.finalApprovedBnmAt),
      dateCell(r.finalRejectedRevisionBnmAt),
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
    "Kode Toko",
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
      textCell(r.storeCode),
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

type PreventiveExportQuarter = "all" | 1 | 2 | 3 | 4;

function normalizePreventiveQuarter(
  value: ExportFilter["preventiveQuarter"],
): PreventiveExportQuarter {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  return "all";
}

const PREVENTIVE_QUARTER_COLUMNS = {
  1: {
    by: "q1By",
    date: "q1Date",
    bmsHeader: "TW1 BMS",
    dateHeader: "TW1 TGL",
  },
  2: {
    by: "q2By",
    date: "q2Date",
    bmsHeader: "TW2 BMS",
    dateHeader: "TW2 TGL",
  },
  3: {
    by: "q3By",
    date: "q3Date",
    bmsHeader: "TW3 BMS",
    dateHeader: "TW3 TGL",
  },
  4: {
    by: "q4By",
    date: "q4Date",
    bmsHeader: "TW4 BMS",
    dateHeader: "TW4 TGL",
  },
} as const;

function buildPreventiveSheet(
  rows: Awaited<ReturnType<typeof fetchPreventiveExportRows>>,
  quarter: PreventiveExportQuarter = "all",
): XLSX.WorkSheet {
  const baseHeaders = ["Kode Toko", "Nama Toko", "Branch"];
  const quarters = quarter === "all" ? ([1, 2, 3, 4] as const) : [quarter];
  const quarterHeaders = quarters.flatMap((q) => [
    PREVENTIVE_QUARTER_COLUMNS[q].bmsHeader,
    PREVENTIVE_QUARTER_COLUMNS[q].dateHeader,
  ]);
  const headers = [...baseHeaders, ...quarterHeaders];

  const data: XLSX.CellObject[][] = [
    headers.map((h) => textCell(h)),
    ...rows.map((r) => {
      const quarterCells = quarters.flatMap((q) => {
        const config = PREVENTIVE_QUARTER_COLUMNS[q];
        return [textCell(r[config.by]), dateCell(r[config.date])];
      });

      return [
        textCell(r.storeCode),
        textCell(r.storeName),
        textCell(r.branchName),
        ...quarterCells,
      ];
    }),
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

  // ─ Auth: ADMIN, or scoped dashboard roles for limited exports ───────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    user.role !== "ADMIN" &&
    user.role !== "BMC" &&
    user.role !== "BNM_MANAGER"
  ) {
    logger.warn(
      {
        operation: "adminExportXlsx",
        correlationId,
        userId: user.NIK,
        role: user.role,
      },
      "Unauthorized role attempted export",
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─ Parse & validate body ─────────────────────────────────────────────────
  let body: {
    filter?: ExportFilter;
    sheets?: ("reports" | "materials" | "pjum" | "preventive")[];
    splitFiles?: boolean;
    fileName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filter: ExportFilter = body.filter ?? {};
  const preventiveQuarter = normalizePreventiveQuarter(
    filter.preventiveQuarter,
  );
  const requestedSheets = body.sheets ?? [
    "reports",
    "materials",
    "pjum",
    "preventive",
  ];
  const splitFiles = body.splitFiles ?? false;
  const baseFileName =
    body.fileName ?? `sparta-export-${new Date().toISOString().slice(0, 10)}`;

  if (user.role === "BMC" || user.role === "BNM_MANAGER") {
    const isReportsOnly =
      requestedSheets.length === 1 && requestedSheets[0] === "reports";
    const isBmcPreventiveOnly =
      user.role === "BMC" &&
      requestedSheets.length === 1 &&
      requestedSheets[0] === "preventive";

    if (!isReportsOnly && !isBmcPreventiveOnly) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const selectedBranches = Array.isArray(filter.branchName)
      ? filter.branchName
      : filter.branchName
        ? [filter.branchName]
        : [];

    if (isBmcPreventiveOnly && selectedBranches.length !== 1) {
      return NextResponse.json(
        { error: "Pilih satu cabang untuk ekspor preventif" },
        { status: 400 },
      );
    }

    const requestedBranches =
      selectedBranches.length > 0
        ? selectedBranches
        : user.branchNames.filter((branchName) => branchName.trim());

    const unauthorizedBranch = requestedBranches.find(
      (branchName) => !user.branchNames.includes(branchName),
    );
    if (unauthorizedBranch) {
      return NextResponse.json(
        { error: "Anda tidak punya akses ke cabang ini" },
        { status: 403 },
      );
    }

    filter.branchName = requestedBranches;
  }

  // ─ Fetch data ────────────────────────────────────────────────────────────
  try {
    const [reportRows, materialRows, pjumRows, preventiveRows] =
      await Promise.all([
        requestedSheets.includes("reports")
          ? fetchReportExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("materials")
          ? fetchMaterialExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("pjum")
          ? fetchPjumExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("preventive")
          ? fetchPreventiveExportRows(filter)
          : Promise.resolve([]),
      ]);

    // ─ Build workbook(s) ─────────────────────────────────────────────────

    if (splitFiles) {
      // Return JSON with base64-encoded files so client can trigger multiple downloads
      const files: { name: string; data: string }[] = [];

      if (requestedSheets.includes("reports") && reportRows.length > 0) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          buildReportSheet(reportRows),
          "Rekap Laporan",
        );
        const buf = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsx",
        });
        files.push({
          name: `${baseFileName}-laporan.xlsx`,
          data: Buffer.from(buf).toString("base64"),
        });
      }

      if (requestedSheets.includes("materials") && materialRows.length > 0) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          buildMaterialSheet(materialRows),
          "Rekap Material",
        );
        const buf = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsx",
        });
        files.push({
          name: `${baseFileName}-material.xlsx`,
          data: Buffer.from(buf).toString("base64"),
        });
      }

      if (requestedSheets.includes("pjum") && pjumRows.length > 0) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          buildPjumSheet(pjumRows),
          "Rekap PJUM",
        );
        const buf = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsx",
        });
        files.push({
          name: `${baseFileName}-pjum.xlsx`,
          data: Buffer.from(buf).toString("base64"),
        });
      }

      if (requestedSheets.includes("preventive") && preventiveRows.length > 0) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          buildPreventiveSheet(preventiveRows, preventiveQuarter),
          "Rekap Preventif",
        );
        const buf = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsx",
        });
        files.push({
          name: `${baseFileName}-preventif.xlsx`,
          data: Buffer.from(buf).toString("base64"),
        });
      }

      const durationMs = Math.round(performance.now() - start);
      logger.info(
        {
          operation: "adminExportXlsx",
          correlationId,
          userId: user.NIK,
          durationMs,
          fileCount: files.length,
        },
        "Export XLSX (split) completed",
      );

      return NextResponse.json({ files });
    }

    // ─ Gabungan: single workbook ─────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    if (requestedSheets.includes("reports")) {
      XLSX.utils.book_append_sheet(
        wb,
        buildReportSheet(reportRows),
        "Rekap Laporan",
      );
    }
    if (requestedSheets.includes("materials")) {
      XLSX.utils.book_append_sheet(
        wb,
        buildMaterialSheet(materialRows),
        "Rekap Material",
      );
    }
    if (requestedSheets.includes("pjum")) {
      XLSX.utils.book_append_sheet(wb, buildPjumSheet(pjumRows), "Rekap PJUM");
    }
    if (requestedSheets.includes("preventive")) {
      XLSX.utils.book_append_sheet(
        wb,
        buildPreventiveSheet(preventiveRows, preventiveQuarter),
        "Rekap Preventif",
      );
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const durationMs = Math.round(performance.now() - start);
    logger.info(
      {
        operation: "adminExportXlsx",
        correlationId,
        userId: user.NIK,
        durationMs,
        rows:
          reportRows.length +
          materialRows.length +
          pjumRows.length +
          preventiveRows.length,
      },
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
      {
        operation: "adminExportXlsx",
        correlationId,
        userId: user.NIK,
        durationMs,
      },
      "Export XLSX failed",
      error,
    );
    return NextResponse.json(
      { error: "Gagal mengekspor data. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
