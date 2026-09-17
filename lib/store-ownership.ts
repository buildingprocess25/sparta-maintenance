import type { StoreOwnershipType } from "@prisma/client";

export type StoreOwnershipFormValue = Extract<
    StoreOwnershipType,
    "REGULAR" | "FRANCHISE"
>;

export const STORE_OWNERSHIP_OPTIONS: {
    value: StoreOwnershipFormValue;
    label: string;
}[] = [
    { value: "REGULAR", label: "Regular" },
    { value: "FRANCHISE", label: "Franchise" },
];

export function normalizeStoreBrandKey(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    if (normalized === "ALFAMART" || normalized === "LAWSON") {
        return normalized;
    }
    return "OTHER";
}

export function shouldShowStoreOwnershipSelect(value?: string | null) {
    return normalizeStoreBrandKey(value) === "ALFAMART";
}

export function getStoreOwnershipFormValue(
    value?: StoreOwnershipType | null,
): StoreOwnershipFormValue {
    return value === "FRANCHISE" ? "FRANCHISE" : "REGULAR";
}

export function normalizeStoreOwnershipForBrand(
    brand: string | null | undefined,
    ownershipType:
        | StoreOwnershipFormValue
        | StoreOwnershipType
        | null
        | undefined,
): StoreOwnershipType {
    const brandKey = normalizeStoreBrandKey(brand);
    if (brandKey === "ALFAMART") {
        return ownershipType === "FRANCHISE" ? "FRANCHISE" : "REGULAR";
    }
    if (brandKey === "LAWSON") {
        return "REGULAR";
    }
    return "UNKNOWN";
}
