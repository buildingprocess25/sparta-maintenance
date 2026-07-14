import type {
    MaterialEstimationJson,
    MaterialStoreJson,
    RealisasiItemJson,
    ReportItemJson,
} from "@/types/report";
import { calculateItemRealisasiTotal, requiresPjum } from "@/lib/realisasi";
import {
    normalizePhotoUrl,
    normalizePhotoUrls,
    resolvePhotoUrl,
} from "@/lib/storage/photo-url";
import { resolveChecklistItemMeta } from "@/lib/checklist-data";

export type ConditionTone = "good" | "bad" | "neutral" | "unknown";

export type DetailPhoto = {
    id: string;
    url: string;
    label: string;
    source: string;
    conditionLabel?: string;
    conditionTone?: ConditionTone;
    itemId?: string;
    itemName?: string;
    categoryName?: string;
};

export type ChecklistRow = {
    itemId: string;
    itemName: string;
    categoryName: string;
    conditionLabel: string;
    conditionTone: ConditionTone;
    handler: string | null;
    notes: string | null;
    ahoTicketNumber: string | null;
    beforePhotos: DetailPhoto[];
    estimationTotal: number;
    realisasiTotal: number;
    hasEstimation: boolean;
    hasRealisasi: boolean;
    hasDetails: boolean;
    isIssue: boolean;
};

export type ChecklistGroup = {
    categoryName: string;
    totalCount: number;
    issueCount: number;
    photoCount: number;
    rows: ChecklistRow[];
};

export type WorkItem = {
    itemId: string;
    itemName: string;
    categoryName: string;
    conditionLabel: string;
    conditionTone: ConditionTone;
    handler: string | null;
    notes: string | null;
    completionNotes: string | null;
    estimations: MaterialEstimationJson[];
    realisasiItems: RealisasiItemJson[];
    discountAmount: number;
    materialStores: MaterialStoreJson[];
    beforePhotos: DetailPhoto[];
    afterPhotos: DetailPhoto[];
    receiptPhotos: DetailPhoto[];
    estimationTotal: number;
    realisasiSubtotal: number;
    realisasiTotal: number;
    delta: number;
};

export type DetailActivity = {
    id: string;
    action: string;
    notes: string | null;
    createdAt: string;
    actorName: string;
    actorNik: string;
    actorRole: string;
};

export type DetailApprovalLog = {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    approverName: string;
    approverNik: string;
    approverRole: string;
};

export type DetailPjumExport = {
    id: string;
    status: string;
    weekNumber: number;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
    pjumFinalDriveUrl: string | null;
    pjumPdfPath: string | null;
} | null;

export type RawReportDetailInput = {
    reportNumber: string;
    storeName: string;
    storeCode: string;
    branchName: string;
    status: string;
    totalEstimation: number;
    totalReal: number | null;
    createdAt: string;
    updatedAt: string;
    lastActivityAt: string;
    finishedAt: string | null;
    pjumExportedAt: string | null;
    submittedBy: {
        name: string;
        nik: string;
    };
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    startSelfieUrls: string[];
    startReceiptUrls: string[];
    startMaterialStores: MaterialStoreJson[];
    completionAdditionalPhotos: string[];
    completionAdditionalNote: string | null;
    completedPdfPath: string | null;
    reportFinalDriveUrl: string | null;
    revisedPdfDriveUrl: string | null;
    revisedPdfFolderUrl: string | null;
    approvalLogs: DetailApprovalLog[];
    activities: DetailActivity[];
    pjumExport: DetailPjumExport;
};

export type ReportDocument = {
    label: string;
    url: string;
    tone: "default" | "primary" | "warning";
};

export type ReportDetailModel = RawReportDetailInput & {
    requiresPjum: boolean;
    checklistGroups: ChecklistGroup[];
    workItems: WorkItem[];
    photos: DetailPhoto[];
    documents: ReportDocument[];
    totals: {
        estimation: number;
        realization: number;
        difference: number;
    };
    summary: {
        checklistCount: number;
        issueCount: number;
        workItemCount: number;
        photoCount: number;
    };
};

export function parseUrlList(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return normalizePhotoUrls(raw);

    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];

    if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
        try {
            return parseUrlList(JSON.parse(trimmed));
        } catch {
            return [];
        }
    }

    const normalized = normalizePhotoUrl(trimmed);
    return normalized ? [normalized] : [];
}

export function buildReportDetailModel(
    input: RawReportDetailInput,
): ReportDetailModel {
    const estimationsByItem = groupEstimations(input.estimations);
    const sortedItems = [...input.items].sort(compareReportItems);
    const checklistRows = sortedItems.map((item) => {
        const itemMeta = resolveChecklistItemMeta(item);
        const estimations = estimationsByItem.get(item.itemId) ?? [];
        const condition = getConditionMeta(item);
        const beforePhotos = makeItemPhotos(
            collectBeforePhotoUrls(item),
            item,
            "Checklist awal",
            condition,
        );
        const estimationTotal = sumEstimation(estimations);
        const hasEstimation = estimations.length > 0;
        const hasRealisasi = (item.realisasiItems?.length ?? 0) > 0;
        const realisasiTotal = calculateItemRealisasiTotal(item);
        const hasDetails =
            beforePhotos.length > 0 ||
            Boolean(item.handler) ||
            Boolean(item.notes?.trim()) ||
            Boolean(item.ahoTicketNumber?.trim()) ||
            hasEstimation ||
            hasRealisasi ||
            Boolean(item.completionNotes?.trim());

        return {
            itemId: item.itemId,
            itemName: itemMeta.itemName,
            categoryName: itemMeta.categoryName,
            conditionLabel: condition.label,
            conditionTone: condition.tone,
            handler: item.handler,
            notes: item.notes ?? null,
            ahoTicketNumber: item.ahoTicketNumber?.trim() || null,
            beforePhotos,
            estimationTotal,
            realisasiTotal,
            hasEstimation,
            hasRealisasi,
            hasDetails,
            isIssue: isIssueItem(item),
        };
    });

    const checklistGroups = groupChecklistRows(checklistRows);
    const workItems = sortedItems
        .map((item) =>
            buildWorkItem(item, estimationsByItem.get(item.itemId) ?? []),
        )
        .filter((item): item is WorkItem => item !== null);
    const photos = buildPhotoGallery({ ...input, items: sortedItems });
    const realization =
        input.totalReal ??
        sortedItems.reduce(
            (total, item) => total + calculateItemRealisasiTotal(item),
            0,
        );

    return {
        ...input,
        requiresPjum: requiresPjum(input.totalReal, sortedItems),
        checklistGroups,
        workItems,
        photos,
        documents: buildDocuments(input),
        totals: {
            estimation: input.totalEstimation,
            realization,
            difference: realization - input.totalEstimation,
        },
        summary: {
            checklistCount: sortedItems.length,
            issueCount: checklistRows.filter((row) => row.isIssue).length,
            workItemCount: workItems.length,
            photoCount: photos.length,
        },
    };
}

function buildWorkItem(
    item: ReportItemJson,
    estimations: MaterialEstimationJson[],
): WorkItem | null {
    const beforePhotos = collectBeforePhotoUrls(item);
    const afterPhotos = normalizePhotoUrls(item.afterImages);
    const receiptPhotos = normalizePhotoUrls(item.receiptImages);
    const realisasiItems = item.realisasiItems ?? [];
    const shouldInclude = isIssueItem(item) && item.handler === "BMS";

    if (!shouldInclude) return null;

    const itemMeta = resolveChecklistItemMeta(item);
    const condition = getConditionMeta(item);
    const repairedCondition = getRepairedConditionMeta();
    const estimationTotal = sumEstimation(estimations);
    const realisasiSubtotal = realisasiItems.reduce(
        (sum, row) => sum + (row.totalPrice ?? row.quantity * row.price),
        0,
    );
    const realisasiTotal = calculateItemRealisasiTotal(item);

    return {
        itemId: item.itemId,
        itemName: itemMeta.itemName,
        categoryName: itemMeta.categoryName,
        conditionLabel: condition.label,
        conditionTone: condition.tone,
        handler: item.handler,
        notes: item.notes ?? null,
        completionNotes: item.completionNotes ?? null,
        estimations,
        realisasiItems,
        discountAmount: Math.max(0, item.discountAmount ?? 0),
        materialStores: collectMaterialStores(item),
        beforePhotos: makeItemPhotos(
            beforePhotos,
            item,
            "Checklist awal",
            condition,
        ),
        afterPhotos: makeItemPhotos(
            afterPhotos,
            item,
            "Foto selesai",
            repairedCondition,
        ),
        receiptPhotos: makeItemPhotos(
            receiptPhotos,
            item,
            "Nota item",
            condition,
        ),
        estimationTotal,
        realisasiSubtotal,
        realisasiTotal,
        delta: realisasiTotal - estimationTotal,
    };
}

function buildPhotoGallery(input: RawReportDetailInput): DetailPhoto[] {
    const photos: DetailPhoto[] = [];
    for (const item of input.items) {
        const condition = getConditionMeta(item);
        const repairedCondition = getRepairedConditionMeta();
        photos.push(
            ...makeItemPhotos(
                collectBeforePhotoUrls(item),
                item,
                "Checklist awal",
                condition,
            ),
            ...makeItemPhotos(
                normalizePhotoUrls(item.afterImages),
                item,
                "Foto selesai",
                repairedCondition,
            ),
            ...makeItemPhotos(
                normalizePhotoUrls(item.receiptImages),
                item,
                "Nota item",
                condition,
            ),
        );
    }

    photos.push(
        ...makeGlobalPhotos(input.startSelfieUrls, "Selfie mulai kerja"),
        ...makeGlobalPhotos(input.startReceiptUrls, "Nota/Struk Belanja"),
        ...input.startMaterialStores.flatMap((store) =>
            makeGlobalPhotos(
                normalizePhotoUrls(store.photoUrls),
                `Toko material: ${store.name}`,
            ),
        ),
        ...makeGlobalPhotos(
            input.completionAdditionalPhotos,
            "Dokumentasi tambahan",
        ),
    );

    return photos;
}

function makeItemPhotos(
    urls: string[],
    item: ReportItemJson,
    source: string,
    condition: { label: string; tone: ConditionTone },
): DetailPhoto[] {
    const itemMeta = resolveChecklistItemMeta(item);
    return urls
        .map(resolvePhotoUrl)
        .filter((url) => url.length > 0)
        .map((url, index) => ({
            id: `${source}-${item.itemId}-${index}-${url}`,
            url,
            label: `${item.itemId} - ${itemMeta.itemName}`,
            source,
            conditionLabel: condition.label,
            conditionTone: condition.tone,
            itemId: item.itemId,
            itemName: itemMeta.itemName,
            categoryName: itemMeta.categoryName,
        }));
}

function makeGlobalPhotos(urls: string[], source: string): DetailPhoto[] {
    return normalizePhotoUrls(urls)
        .map(resolvePhotoUrl)
        .filter((url) => url.length > 0)
        .map((url, index) => ({
            id: `${source}-${index}-${url}`,
            url,
            label: source,
            source,
        }));
}

function collectBeforePhotoUrls(item: ReportItemJson): string[] {
    const urls = normalizePhotoUrls(item.images);
    const legacyPhoto = normalizePhotoUrl(item.photoUrl);
    if (legacyPhoto) urls.push(legacyPhoto);
    return Array.from(new Set(urls));
}

function collectMaterialStores(item: ReportItemJson): MaterialStoreJson[] {
    const stores: MaterialStoreJson[] = [];
    if (Array.isArray(item.materialStores)) {
        stores.push(
            ...item.materialStores
                .filter((store) => store.name?.trim() && store.city?.trim())
                .map((store) => ({
                    name: store.name.trim(),
                    city: store.city.trim(),
                    photoUrls: normalizePhotoUrls(store.photoUrls),
                })),
        );
    }

    if (item.materialStoreName?.trim() || item.materialStoreCity?.trim()) {
        stores.push({
            name: item.materialStoreName?.trim() || "-",
            city: item.materialStoreCity?.trim() || "-",
        });
    }

    return stores;
}

function groupEstimations(estimations: MaterialEstimationJson[]) {
    const map = new Map<string, MaterialEstimationJson[]>();
    for (const estimation of estimations) {
        const current = map.get(estimation.itemId) ?? [];
        current.push(estimation);
        map.set(estimation.itemId, current);
    }
    return map;
}

function groupChecklistRows(rows: ChecklistRow[]): ChecklistGroup[] {
    const map = new Map<string, ChecklistRow[]>();
    for (const row of rows) {
        const current = map.get(row.categoryName) ?? [];
        current.push(row);
        map.set(row.categoryName, current);
    }

    return Array.from(map.entries())
        .map(([categoryName, groupRows]) => ({
            categoryName,
            totalCount: groupRows.length,
            issueCount: groupRows.filter((row) => row.isIssue).length,
            photoCount: groupRows.reduce(
                (sum, row) => sum + row.beforePhotos.length,
                0,
            ),
            rows: groupRows.sort(compareChecklistRows),
        }))
        .sort(compareChecklistGroups);
}

function buildDocuments(input: RawReportDetailInput): ReportDocument[] {
    const candidates: Array<ReportDocument | null> = [
        makeDocument("PDF final Drive", input.reportFinalDriveUrl, "primary"),
        makeDocument("PDF revisi", input.revisedPdfDriveUrl, "warning"),
        makeDocument("Folder revisi", input.revisedPdfFolderUrl, "warning"),
        makeDocument("Snapshot selesai", input.completedPdfPath, "default"),
        makeDocument(
            "PJUM final",
            input.pjumExport?.pjumFinalDriveUrl,
            "primary",
        ),
        makeDocument("PDF PJUM", input.pjumExport?.pjumPdfPath, "default"),
    ];

    return candidates.filter((item): item is ReportDocument => item !== null);
}

function makeDocument(
    label: string,
    rawUrl: string | null | undefined,
    tone: ReportDocument["tone"],
): ReportDocument | null {
    const url = normalizePhotoUrl(rawUrl);
    if (!url || (!url.startsWith("http") && !url.startsWith("/"))) return null;
    return { label, url, tone };
}

function sumEstimation(estimations: MaterialEstimationJson[]): number {
    return estimations.reduce((sum, row) => sum + row.totalPrice, 0);
}

function isIssueItem(item: ReportItemJson): boolean {
    return item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";
}

function getConditionMeta(item: ReportItemJson): {
    label: string;
    tone: ConditionTone;
} {
    if (item.preventiveCondition === "OK") {
        return { label: "OK", tone: "good" };
    }
    if (item.preventiveCondition === "NOT_OK") {
        return { label: "Not OK", tone: "bad" };
    }
    if (item.preventiveCondition === "TIDAK_ADA") {
        return { label: "Tidak ada", tone: "neutral" };
    }
    if (item.condition === "BAIK") {
        return { label: "Baik", tone: "good" };
    }
    if (item.condition === "RUSAK") {
        return { label: "Rusak", tone: "bad" };
    }
    if (item.condition === "TIDAK_ADA") {
        return { label: "Tidak ada", tone: "neutral" };
    }
    return { label: "", tone: "unknown" };
}

function getRepairedConditionMeta(): {
    label: string;
    tone: ConditionTone;
} {
    return { label: "Diperbaiki", tone: "good" };
}

function compareReportItems(a: ReportItemJson, b: ReportItemJson): number {
    return compareItemIds(a.itemId, b.itemId);
}

function compareChecklistRows(a: ChecklistRow, b: ChecklistRow): number {
    return compareItemIds(a.itemId, b.itemId);
}

function compareChecklistGroups(a: ChecklistGroup, b: ChecklistGroup): number {
    return compareItemIds(a.rows[0]?.itemId ?? "", b.rows[0]?.itemId ?? "");
}

function compareItemIds(a: string, b: string): number {
    const parsedA = parseItemId(a);
    const parsedB = parseItemId(b);
    if (parsedA.prefix !== parsedB.prefix) {
        return parsedA.prefix.localeCompare(parsedB.prefix);
    }
    if (parsedA.number !== parsedB.number) {
        return parsedA.number - parsedB.number;
    }
    return a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" });
}

function parseItemId(itemId: string): { prefix: string; number: number } {
    const match = itemId.trim().match(/^([A-Za-z]+)\s*0*(\d+)/);
    if (!match) return { prefix: itemId.trim().toUpperCase(), number: 0 };
    return {
        prefix: match[1].toUpperCase(),
        number: Number(match[2]),
    };
}
