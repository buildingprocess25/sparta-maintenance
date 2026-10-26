import {
    REPORT_CHECKLIST_ITEMS,
    type ChecklistCondition,
    type SignageCondition,
    type SignageConfig,
} from "@/lib/checklist-data";

/** Nilai `signageMaterial` di state form saat signage tidak dimiliki toko. */
export const SIGNAGE_NOT_AVAILABLE = "TIDAK_ADA";

export const SIGNAGE_CONDITIONS: readonly SignageCondition[] = [
    "baik",
    "kotor",
    "pudar",
    "rusak",
];

export type SignageConditionJson = "BAIK" | "KOTOR" | "PUDAR" | "RUSAK";

export const SIGNAGE_CONDITION_LABELS: Record<SignageCondition, string> = {
    baik: "Baik",
    kotor: "Kotor",
    pudar: "Pudar",
    rusak: "Rusak",
};

const signageConfigById = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.signage ? [[item.id, item.signage] as const] : [],
    ),
);

export function getSignageConfig(itemId: string): SignageConfig | undefined {
    return signageConfigById.get(itemId);
}

function normalizeSignageCondition(
    condition: string | null | undefined,
): SignageCondition | undefined {
    const normalized = condition?.trim().toLowerCase();
    return SIGNAGE_CONDITIONS.find((value) => value === normalized);
}

export function isSignageDamaged(
    condition: string | null | undefined,
): boolean {
    const normalized = normalizeSignageCondition(condition);
    return normalized === "pudar" || normalized === "rusak";
}

/** Baik/Kotor dihitung "baik", Pudar/Rusak dihitung "rusak". */
export function toChecklistCondition(
    condition: SignageCondition | "",
): ChecklistCondition {
    if (!condition) return "";
    return isSignageDamaged(condition) ? "rusak" : "baik";
}

/** Form → JSON. Hanya diisi untuk item signage yang punya material + kondisi. */
export function toSignageJsonFields(item: {
    id: string;
    signageMaterial?: string;
    signageCondition?: SignageCondition | "";
}): { signageMaterial?: string; signageCondition?: SignageConditionJson } {
    if (!getSignageConfig(item.id)) return {};
    if (
        !item.signageMaterial ||
        item.signageMaterial === SIGNAGE_NOT_AVAILABLE ||
        !item.signageCondition
    ) {
        return {};
    }
    return {
        signageMaterial: item.signageMaterial,
        signageCondition:
            item.signageCondition.toUpperCase() as SignageConditionJson,
    };
}

/** JSON → form. Signage Tidak Ada disimpan sebagai `preventiveCondition: TIDAK_ADA`. */
export function fromSignageJsonFields(item: {
    itemId: string;
    preventiveCondition?: string | null;
    signageMaterial?: string | null;
    signageCondition?: string | null;
}): { signageMaterial?: string; signageCondition?: SignageCondition } {
    if (!getSignageConfig(item.itemId)) return {};
    if (item.preventiveCondition === "TIDAK_ADA") {
        return { signageMaterial: SIGNAGE_NOT_AVAILABLE };
    }
    return {
        signageMaterial: item.signageMaterial || undefined,
        signageCondition: normalizeSignageCondition(item.signageCondition),
    };
}

export type SignageConditionDescription = {
    label: string;
    material?: string;
    /** Label siap tampil, mis. "Rusak · Acrylic". */
    text: string;
    isDamaged: boolean;
};

/**
 * Label kondisi khusus signage. `null` berarti bukan data signage (atau
 * signage Tidak Ada) — pemanggil memakai label kondisi lamanya.
 */
export function describeSignageCondition(item: {
    signageCondition?: string | null;
    signageMaterial?: string | null;
}): SignageConditionDescription | null {
    const condition = normalizeSignageCondition(item.signageCondition);
    if (!condition) return null;

    const label = SIGNAGE_CONDITION_LABELS[condition];
    const material = item.signageMaterial?.trim() || undefined;
    return {
        label,
        material,
        text: material ? `${label} · ${material}` : label,
        isDamaged: isSignageDamaged(condition),
    };
}
