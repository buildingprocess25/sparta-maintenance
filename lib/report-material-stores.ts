import type { MaterialStoreJson, ReportItemJson } from "@/types/report";

function normalizeMaterialStore(
    value: Partial<MaterialStoreJson> | null | undefined,
): MaterialStoreJson | null {
    const name = value?.name?.trim();
    const city = value?.city?.trim();
    const photoUrls = Array.isArray(value?.photoUrls)
        ? value?.photoUrls
              .map((url) => url?.trim())
              .filter((url): url is string => Boolean(url))
        : [];

    if (!name || !city) return null;
    return photoUrls.length > 0 ? { name, city, photoUrls } : { name, city };
}

function mergePhotoUrls(
    current: string[] | undefined,
    incoming: string[] | undefined,
): string[] | undefined {
    const merged = new Set<string>();
    (current ?? []).forEach((url) => merged.add(url));
    (incoming ?? []).forEach((url) => merged.add(url));
    return merged.size > 0 ? Array.from(merged) : undefined;
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
            continue;
        }

        const existing = uniqueStores.get(key);
        if (!existing) continue;

        const mergedPhotoUrls = mergePhotoUrls(
            existing.photoUrls,
            normalized.photoUrls,
        );
        uniqueStores.set(key, {
            ...existing,
            ...(mergedPhotoUrls ? { photoUrls: mergedPhotoUrls } : {}),
        });
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
