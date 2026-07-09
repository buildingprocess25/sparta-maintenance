import type {
    MaterialEstimationJson,
    RealisasiItemJson,
    ReportItemJson,
} from "@/types/report";
import type { ReportForCompletion } from "./queries";
import {
    createInitialItemState,
    hasActualPrice,
    type CompletionItemState,
    type LocalPhoto,
} from "./types";

export type CompletionReport = NonNullable<ReportForCompletion>;

export function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatNumber(value: number) {
    return Number.isFinite(value) ? value.toLocaleString("id-ID") : "";
}

export function genId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function toRemotePhoto(url: string, idx: number): LocalPhoto {
    return { id: `remote-${idx}-${url}`, previewUrl: url };
}

export function getDamagedBmsItems(report: CompletionReport) {
    return report.items.filter(
        (item) =>
            (item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK") &&
            item.handler === "BMS",
    );
}

export function getTotalEstimation(report: CompletionReport) {
    if (Number.isFinite(report.totalEstimation)) return report.totalEstimation;

    return report.estimations.reduce(
        (sum, estimation) => sum + estimation.totalPrice,
        0,
    );
}

export function isCompletionItemComplete(state: CompletionItemState) {
    return (
        state.afterPhotos.length > 0 &&
        state.realisasiEntries.length > 0 &&
        state.realisasiEntries.every(
            (entry) =>
                entry.materialName.trim().length > 0 &&
                hasActualPrice(entry) &&
                typeof entry.quantity === "number" &&
                entry.quantity > 0,
        )
    );
}

export function buildItemStates(report: CompletionReport) {
    const estimationMap = new Map<string, MaterialEstimationJson[]>();
    for (const estimation of report.estimations) {
        if (!estimationMap.has(estimation.itemId)) {
            estimationMap.set(estimation.itemId, []);
        }
        estimationMap.get(estimation.itemId)!.push(estimation);
    }

    const map = new Map<string, CompletionItemState>();

    for (const item of getDamagedBmsItems(report)) {
        const baseState = createInitialItemState(
            estimationMap.get(item.itemId) ?? [],
        );
        const existingAfterImages = Array.isArray(item.afterImages)
            ? item.afterImages
            : [];
        const existingRealisasi = Array.isArray(item.realisasiItems)
            ? item.realisasiItems
            : [];

        map.set(item.itemId, {
            ...baseState,
            afterPhotos:
                existingAfterImages.length > 0
                    ? existingAfterImages.map((url, idx) =>
                          toRemotePhoto(url, idx),
                      )
                    : baseState.afterPhotos,
            realisasiEntries:
                existingRealisasi.length > 0
                    ? toRealisasiEntries(item.itemId, existingRealisasi)
                    : baseState.realisasiEntries,
            discountAmount:
                typeof item.discountAmount === "number"
                    ? Math.max(0, item.discountAmount)
                    : baseState.discountAmount,
            notes: item.completionNotes?.trim() || "",
        });
    }

    return map;
}

export function getEstimationMap(report: CompletionReport) {
    const map = new Map<string, MaterialEstimationJson[]>();
    for (const estimation of report.estimations) {
        if (!map.has(estimation.itemId)) map.set(estimation.itemId, []);
        map.get(estimation.itemId)!.push(estimation);
    }
    return map;
}

export function getBeforeImages(item: ReportItemJson) {
    if (Array.isArray(item.images) && item.images.length > 0) {
        return item.images;
    }
    return item.photoUrl ? [item.photoUrl] : [];
}

function toRealisasiEntries(
    itemId: string,
    realisasiItems: RealisasiItemJson[],
): CompletionItemState["realisasiEntries"] {
    return realisasiItems.map((entry, idx) => ({
        id: `db-${itemId}-${idx}-${Date.now()}`,
        materialName: entry.materialName,
        quantity: entry.quantity,
        unit: entry.unit,
        price: entry.price,
    }));
}
