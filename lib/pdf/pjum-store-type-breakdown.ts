export type PjumStoreTypeKey =
    | "ALFAMART_REGULAR"
    | "ALFAMART_FRANCHISE"
    | "LAWSON"
    | "ALFAMART_UNKNOWN";

export type PjumStoreTypeCategory = {
    key: PjumStoreTypeKey;
    label: string;
};

export type PjumBreakdownInputRow = {
    reportNumber: string;
    brand?: string | null;
    ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null;
    totalRealisasi: number;
};

export type PjumStoreTypeBreakdownGroup<T extends PjumBreakdownInputRow = PjumBreakdownInputRow> =
    PjumStoreTypeCategory & {
        rows: T[];
        subtotal: number;
    };

export type PjumStoreTypeBreakdown<T extends PjumBreakdownInputRow = PjumBreakdownInputRow> = {
    shouldRenderBreakdown: boolean;
    groups: PjumStoreTypeBreakdownGroup<T>[];
};

const CATEGORY_ORDER: PjumStoreTypeCategory[] = [
    { key: "ALFAMART_REGULAR", label: "Alfamart Reguler" },
    { key: "ALFAMART_FRANCHISE", label: "Alfamart Franchise" },
    { key: "LAWSON", label: "Lawson" },
    {
        key: "ALFAMART_UNKNOWN",
        label: "Alfamart - Tipe Toko Belum Diketahui",
    },
];

const CATEGORY_BY_KEY = new Map(
    CATEGORY_ORDER.map((category) => [category.key, category]),
);

function normalizeBrandKey(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    if (normalized === "LAWSON") return "LAWSON";
    if (normalized === "ALFAMART") return "ALFAMART";
    return "UNKNOWN";
}

export function resolvePjumStoreTypeCategory(row: {
    brand?: string | null;
    ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null;
}): PjumStoreTypeCategory {
    const brandKey = normalizeBrandKey(row.brand);

    if (brandKey === "LAWSON") {
        return CATEGORY_BY_KEY.get("LAWSON")!;
    }

    if (brandKey !== "ALFAMART") {
        return CATEGORY_BY_KEY.get("ALFAMART_UNKNOWN")!;
    }

    if (row.ownershipType === "REGULAR") {
        return CATEGORY_BY_KEY.get("ALFAMART_REGULAR")!;
    }

    if (row.ownershipType === "FRANCHISE") {
        return CATEGORY_BY_KEY.get("ALFAMART_FRANCHISE")!;
    }

    return CATEGORY_BY_KEY.get("ALFAMART_UNKNOWN")!;
}

export function getPjumStoreTypeBreakdown<T extends PjumBreakdownInputRow>(
    rows: T[],
): PjumStoreTypeBreakdown<T> {
    const grouped = new Map<PjumStoreTypeKey, PjumStoreTypeBreakdownGroup<T>>();

    for (const row of rows) {
        const category = resolvePjumStoreTypeCategory(row);
        const existing =
            grouped.get(category.key) ??
            ({
                ...category,
                rows: [],
                subtotal: 0,
            } satisfies PjumStoreTypeBreakdownGroup<T>);

        existing.rows.push(row);
        existing.subtotal += row.totalRealisasi;
        grouped.set(category.key, existing);
    }

    const groups = CATEGORY_ORDER.flatMap((category) => {
        const group = grouped.get(category.key);
        return group ? [group] : [];
    });

    return {
        shouldRenderBreakdown: groups.length > 1,
        groups,
    };
}
