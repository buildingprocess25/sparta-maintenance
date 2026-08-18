import {
    getStoreAreaOptions,
    normalizeAreaName,
    type AreaNamesByBranch,
} from "./store-area-options";

export type StoreAreaResolution =
    | { valid: true; areaName: string | null }
    | { valid: false; error: "Cabang lama tidak valid untuk cabang ini" };

export function resolveStoreAreaName(
    areaNamesByBranch: AreaNamesByBranch,
    branchName: string,
    areaName: string | null | undefined,
    currentAreaName?: string | null,
): StoreAreaResolution {
    const normalizedAreaName = normalizeAreaName(areaName);
    if (!normalizedAreaName) return { valid: true, areaName: null };

    const options = getStoreAreaOptions(
        areaNamesByBranch,
        branchName,
        currentAreaName,
    );

    if (!options.includes(normalizedAreaName)) {
        return { valid: false, error: "Cabang lama tidak valid untuk cabang ini" };
    }

    return { valid: true, areaName: normalizedAreaName };
}
