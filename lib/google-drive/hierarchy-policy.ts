export const MAINTENANCE_FOLDER = "Maintenance";
export const STORE_COLLECTION_FOLDER = "Toko";
export const PJUM_MAINTENANCE_FOLDER = "PJUM Sparta-Maintenance";
export const REPORT_DOCUMENT_FOLDER = "01 - Dokumen";

export type ParsedStoreFolderName = {
  noUlok: string;
  storeName: string;
  storeCode: string;
};

export type EvidenceDestination =
  | { kind: "CHECKLIST"; categoryName: string; itemId: string; itemName: string }
  | { kind: "START_SELFIE" }
  | { kind: "START_RECEIPT" }
  | { kind: "START_MATERIAL_STORE"; entryId: string; index: number; name: string; city: string }
  | { kind: "COMPLETION_RESULT"; categoryName: string; itemId: string; itemName: string }
  | { kind: "COMPLETION_RECEIPT"; itemId: string; itemName: string }
  | { kind: "COMPLETION_ADDITIONAL" };

export function sanitizeDriveSegment(value: string): string {
  return value.replaceAll("/", "-").replaceAll("\\", "-").trim() || "-";
}

export function normalizeStoreIdentity(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export function parseStoreFolderName(name: string): ParsedStoreFolderName | null {
  const parts = name.split(/\s+-\s+/);
  if (parts.length !== 3) {
    return null;
  }

  return {
    noUlok: parts[0]!.trim(),
    storeName: parts[1]!.trim(),
    storeCode: parts[2]!.trim(),
  };
}

export function buildNewStoreFolderName(input: { storeName: string; storeCode: string }): string {
  return `BELUM DIISI - ${sanitizeDriveSegment(input.storeName)} - ${sanitizeDriveSegment(input.storeCode)}`;
}

export function buildReportRelativePath(reportNumber: string): string[] {
  return [sanitizeDriveSegment(reportNumber)];
}

export function buildEvidenceRelativePath(destination: EvidenceDestination): string[] {
  switch (destination.kind) {
    case "CHECKLIST":
      return [
        "02 - Foto Checklist",
        sanitizeDriveSegment(destination.categoryName),
        buildItemFolderName(destination.itemId, destination.itemName),
      ];
    case "START_SELFIE":
      return ["03 - Foto Mulai Pekerjaan", "01 - Selfie BMS"];
    case "START_RECEIPT":
      return ["03 - Foto Mulai Pekerjaan", "02 - Nota Pembelian"];
    case "START_MATERIAL_STORE":
      if (destination.index < 0) {
        throw new Error("Material-store evidence index must be non-negative");
      }
      return [
        "03 - Foto Mulai Pekerjaan",
        "03 - Toko Material",
        `${String(destination.index + 1).padStart(2, "0")} - ${sanitizeDriveSegment(destination.name)} - ${sanitizeDriveSegment(destination.city)}`,
      ];
    case "COMPLETION_RESULT":
      return [
        "04 - Foto Penyelesaian",
        "01 - Hasil Pekerjaan",
        sanitizeDriveSegment(destination.categoryName),
        buildItemFolderName(destination.itemId, destination.itemName),
      ];
    case "COMPLETION_RECEIPT":
      return [
        "04 - Foto Penyelesaian",
        "02 - Nota Realisasi",
        buildItemFolderName(destination.itemId, destination.itemName),
      ];
    case "COMPLETION_ADDITIONAL":
      return ["04 - Foto Penyelesaian", "03 - Dokumentasi Tambahan"];
    default:
      return assertNever(destination);
  }
}

export function buildFinalPdfName(reportNumber: string): string {
  return `${sanitizeDriveSegment(reportNumber)} - Laporan Final.pdf`;
}

export function buildRevisionPdfName(reportNumber: string): string {
  return `${sanitizeDriveSegment(reportNumber)} - Laporan Revisi.pdf`;
}

export function buildPjumRelativePath(input: {
  bmsNIK: string;
  bmsName: string;
  year: number;
  monthName: string;
}): string[] {
  return [
    PJUM_MAINTENANCE_FOLDER,
    `${sanitizeDriveSegment(input.bmsNIK)} - ${sanitizeDriveSegment(input.bmsName)}`,
    String(input.year),
    sanitizeDriveSegment(input.monthName),
  ];
}

function buildItemFolderName(itemId: string, itemName: string): string {
  return `${sanitizeDriveSegment(itemId)} - ${sanitizeDriveSegment(itemName)}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled evidence destination: ${JSON.stringify(value)}`);
}
