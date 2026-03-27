import type { MaterialStoreJson, ReportItemJson } from "@/types/report";

function normalizeMaterialStore(
    value: Partial<MaterialStoreJson> | null | undefined,
): MaterialStoreJson | null {
    const name = value?.name?.trim();
    const city = value?.city?.trim();

    if (!name || !city) return null;
    return { name, city };
}

export function dedupeMaterialStores(
    stores: Array<Partial<MaterialStoreJson> | null | undefined>,
): MaterialStoreJson[] {
    const uniqueStores = new Map<string, MaterialStoreJson>();

    for (const store of stores) {
        const normalized = normalizeMaterialStore(store);
        if (!normalized) continue;

        const key = `${normalized.name.toLowerCase()}::${normalized.city.toLowerCase()}`;
        if (!uniqueStores.has(key)) {
            uniqueStores.set(key, normalized);
        }
    }

    return Array.from(uniqueStores.values());
}

export function parseMaterialStores(value: unknown): MaterialStoreJson[] {
    if (Array.isArray(value)) {
        return dedupeMaterialStores(value);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];

        try {
            return parseMaterialStores(JSON.parse(trimmed));
        } catch {
            return [];
        }
    }

    return [];
}

export function extractMaterialStoresFromItems(
    items: ReportItemJson[],
): MaterialStoreJson[] {
    const stores: Array<Partial<MaterialStoreJson> | null> = [];

    for (const item of items) {
        if (item.materialStores?.length) {
            stores.push(...item.materialStores);
            continue;
        }

        if (item.materialStoreName || item.materialStoreCity) {
            stores.push({
                name: item.materialStoreName ?? "",
                city: item.materialStoreCity ?? "",
            });
        }
    }

    return dedupeMaterialStores(stores);
}
