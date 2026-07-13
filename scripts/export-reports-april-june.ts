import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import * as fs from "fs";

const DATE_FORMAT = "DD/MM/YYYY HH.mm";

function textCell(value: string | null | undefined): XLSX.CellObject {
  return { t: "s", v: value ?? "" };
}

function numCell(value: number | null | undefined): XLSX.CellObject {
  if (value === null || value === undefined) return { t: "n", v: 0 };
  return { t: "n", v: value };
}

function toExcelJakartaSerial(date: Date | null | undefined): number | null {
  if (!date || isNaN(date.getTime())) return null;
  const jakartaOffset = 7 * 60 * 60 * 1000;
  const targetTime = date.getTime() + jakartaOffset;
  const EXCEL_EPOCH_OFFSET = 25569;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return targetTime / MS_PER_DAY + EXCEL_EPOCH_OFFSET;
}

function dateCell(date: Date | null | undefined): XLSX.CellObject {
  const serial = toExcelJakartaSerial(date);
  if (serial === null) return { t: "s", v: "" };
  return { t: "n", v: serial, z: DATE_FORMAT };
}

async function main() {
  const year = new Date().getFullYear(); // Gunakan tahun saat ini (misal 2026)
  const fromDate = new Date(`${year}-05-01T00:00:00+07:00`);
  const toDate = new Date(`${year}-06-30T00:00:00+07:00`);

  console.log(
    `Fetching reports from ${fromDate.toISOString()} to ${toDate.toISOString()}...`,
  );

  const reports = await prisma.report.findMany({
    where: {
      status: { not: "DRAFT" },
      createdAt: {
        gte: fromDate,
        lt: toDate,
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      reportNumber: true,
      createdAt: true,
      branchName: true,
      areaName: true, // Kolom Branch Lama (Area Name)
      storeCode: true,
      storeName: true,
      createdByNIK: true,
      createdBy: { select: { name: true } },
      status: true,
      totalEstimation: true,
      totalReal: true,
      finishedAt: true,
      pjumExportedAt: true,
      activities: {
        orderBy: { createdAt: "asc" },
        select: {
          action: true,
          createdAt: true,
        },
      },
    },
  });

  console.log(`Found ${reports.length} reports.`);

  const headers = [
    "No. Laporan",
    "Tanggal Dibuat",
    "Branch",
    "Branch Lama", // Kolom baru
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

  const data: XLSX.CellObject[][] = [headers.map((h) => textCell(h))];

  for (const r of reports) {
    const actionTimes = new Map<string, Date>();
    for (const activity of r.activities) {
      if (!actionTimes.has(activity.action)) {
        actionTimes.set(activity.action, activity.createdAt);
      }
    }

    data.push([
      textCell(r.reportNumber),
      dateCell(r.createdAt),
      textCell(r.branchName),
      textCell(r.areaName), // Data Branch Lama
      textCell(r.storeCode),
      textCell(r.storeName),
      textCell(r.createdByNIK),
      textCell(r.createdBy?.name),
      textCell(r.status),
      dateCell(actionTimes.get("SUBMITTED")),
      dateCell(actionTimes.get("RESUBMITTED_ESTIMATION")),
      dateCell(actionTimes.get("ESTIMATION_APPROVED")),
      dateCell(actionTimes.get("ESTIMATION_REJECTED_REVISION")),
      dateCell(actionTimes.get("ESTIMATION_REJECTED")),
      dateCell(actionTimes.get("WORK_STARTED")),
      dateCell(actionTimes.get("COMPLETION_SUBMITTED")),
      dateCell(actionTimes.get("RESUBMITTED_WORK")),
      dateCell(actionTimes.get("WORK_APPROVED")),
      dateCell(actionTimes.get("WORK_REJECTED_REVISION")),
      dateCell(actionTimes.get("FINAL_APPROVED_BNM")),
      dateCell(actionTimes.get("FINAL_REJECTED_REVISION_BNM")),
      numCell(Number(r.totalEstimation)),
      numCell(r.totalReal !== null ? Number(r.totalReal) : null),
      dateCell(r.finishedAt),
      dateCell(r.pjumExportedAt),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Buat width agar rapi
  const colWidths = headers.map(() => ({ wch: 22 }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "reports");

  const fileName = `reports_export_apr_jun_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
  console.log(`Exported successfully to ${fileName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
