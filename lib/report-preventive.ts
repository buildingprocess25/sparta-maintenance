import { checklistCategories } from "@/lib/checklist-data";

const VALID_PREVENTIVE_CONDITIONS = new Set([
    "OK",
    "NOT_OK",
    "TIDAK_ADA",
]);

export const PREVENTIVE_ITEM_IDS = checklistCategories
    .filter((category) => category.isPreventive)
    .flatMap((category) => category.items.map((item) => item.id));

// Set item yang menentukan laporan "preventif lengkap". Sengaja dibekukan ke
// I1–I10: laporan sebelum I11–I13 ada tetap harus dihitung lengkap (cooldown,
// KPI, coverage, matriks, export). Item preventif baru diwajibkan lewat
// validasi submit, bukan lewat set ini. Jangan diganti menjadi turunan katalog.
export const PREVENTIVE_REQUIRED_ITEM_IDS: readonly string[] = [
    "I1",
    "I2",
    "I3",
    "I4",
    "I5",
    "I6",
    "I7",
    "I8",
    "I9",
    "I10",
];

export function hasCompletePreventiveEvidence(items: unknown): boolean {
    if (!Array.isArray(items)) return false;

    return PREVENTIVE_REQUIRED_ITEM_IDS.every((requiredId) =>
        items.some(
            (item) =>
                typeof item === "object" &&
                item !== null &&
                "itemId" in item &&
                "preventiveCondition" in item &&
                item.itemId === requiredId &&
                VALID_PREVENTIVE_CONDITIONS.has(
                    String(item.preventiveCondition),
                ),
        ),
    );
}

export function isRecordedPreventiveReport(input: {
    status: string;
    items: unknown;
}): boolean {
    return input.status !== "DRAFT" && hasCompletePreventiveEvidence(input.items);
}
