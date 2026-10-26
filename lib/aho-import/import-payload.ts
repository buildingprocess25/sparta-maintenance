// Kontrak data import tiket AHO yang dikirim browser → server action.
// Dipakai di dua sisi: parser XLSX (client) dan adminImportAhoTickets (server).

import { z } from "zod";

export const AHO_ACTIVE_STATUSES = ["New", "Progress"] as const;
export type AhoActiveStatus = (typeof AHO_ACTIVE_STATUSES)[number];

// Snapshot YTD Oktober 2026 berisi ~246k baris; batas ini jauh di atasnya
// tapi tetap mencegah payload liar.
export const AHO_IMPORT_MAX_ROWS = 500_000;

/** "progress" / "PROGRESS " → "Progress"; status selain New/Progress → null. */
export function normalizeAhoStatus(raw: string): AhoActiveStatus | null {
    const trimmed = raw.trim();
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    return (AHO_ACTIVE_STATUSES as readonly string[]).includes(normalized)
        ? (normalized as AhoActiveStatus)
        : null;
}

const ahoImportRowSchema = z.object({
    storeCode: z.string().trim().toUpperCase().min(1).max(50),
    problemNo: z.string().trim().min(1).max(100),
    status: z.string().trim().min(1).max(50),
    branchCode: z.string().trim().max(100),
    branchName: z.string().trim().max(200),
});

export const ahoImportPayloadSchema = z.object({
    printDate: z.iso.datetime().nullable(),
    totalRows: z.number().int().min(0),
    skippedNonActive: z.number().int().min(0),
    rows: z.array(ahoImportRowSchema).max(AHO_IMPORT_MAX_ROWS),
});

export type AhoImportPayload = z.infer<typeof ahoImportPayloadSchema>;
export type AhoImportRow = AhoImportPayload["rows"][number];
