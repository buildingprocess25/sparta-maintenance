import type { ChecklistRow, DetailPhoto, ReportDetailModel } from "../_lib/detail-data";

export type ChecklistFilter = "all" | "issue" | "photo" | "bms" | "rekanan";

export type RealizationComparisonRow = {
    id: string;
    itemId: string;
    itemName: string;
    materialName: string;
    quantityLabel: string;
    price: number | null;
    total: number;
    isDiscount?: boolean;
};

export type ReportMaterialStoreRow = {
    id: string;
    name: string;
    city: string;
    photoCount: number;
};

export function matchesChecklistFilter(row: ChecklistRow, filter: ChecklistFilter) {
    if (filter === "issue") return row.isIssue;
    if (filter === "photo") return row.beforePhotos.length > 0;
    if (filter === "bms") return row.handler === "BMS";
    if (filter === "rekanan") return row.handler === "REKANAN";
    return true;
}

export function getFinalDriveDocuments(report: ReportDetailModel) {
    const reportFinalUrl = report.reportFinalDriveUrl?.trim();
    const pjumFinalUrl = report.pjumExport?.pjumFinalDriveUrl?.trim();
    const documents: Array<{
        key: "report" | "pjum";
        label: string;
        url: string;
    }> = [];

    if (reportFinalUrl) {
        documents.push({
            key: "report",
            label: "Laporan Final PDF",
            url: reportFinalUrl,
        });
    }

    if (pjumFinalUrl) {
        documents.push({
            key: "pjum",
            label: "PJUM Final PDF",
            url: pjumFinalUrl,
        });
    }

    return documents;
}

export function getReportMaterialStores(
    report: ReportDetailModel,
): ReportMaterialStoreRow[] {
    const stores = new Map<string, ReportMaterialStoreRow>();

    function addStore(
        name: string | null | undefined,
        city: string | null | undefined,
        photoCount = 0,
    ) {
        const trimmedName = name?.trim();
        const trimmedCity = city?.trim();
        if (!trimmedName && !trimmedCity) return;

        const normalizedName = trimmedName || "";
        const normalizedCity = trimmedCity || "";
        const key = `${normalizedName.toLowerCase()}|${normalizedCity.toLowerCase()}`;
        const current = stores.get(key);

        if (current) {
            current.photoCount += photoCount;
            return;
        }

        stores.set(key, {
            id: key,
            name: normalizedName,
            city: normalizedCity,
            photoCount,
        });
    }

    for (const store of report.startMaterialStores) {
        addStore(store.name, store.city, store.photoUrls?.length ?? 0);
    }

    for (const item of report.workItems) {
        for (const store of item.materialStores) {
            addStore(store.name, store.city, store.photoUrls?.length ?? 0);
        }
    }

    return Array.from(stores.values()).sort((a, b) =>
        `${a.name} ${a.city}`.localeCompare(`${b.name} ${b.city}`, "id-ID", {
            sensitivity: "base",
        }),
    );
}

export function getReceiptPhotos(report: ReportDetailModel) {
    const photos = new Map<string, DetailPhoto>();

    for (const item of report.workItems) {
        for (const photo of item.receiptPhotos) {
            photos.set(photo.id, photo);
        }
    }

    for (const photo of report.photos) {
        if (photo.source === "Nota/Struk Belanja") {
            photos.set(photo.id, photo);
        }
    }

    return Array.from(photos.values());
}

export function getRealizationComparisonRows(
    report: ReportDetailModel,
): RealizationComparisonRow[] {
    return report.workItems.flatMap((item) => {
        const rows: RealizationComparisonRow[] = item.realisasiItems.map(
            (row, index) => ({
                id: `${item.itemId}-real-${index}`,
                itemId: item.itemId,
                itemName: item.itemName,
                materialName: row.materialName,
                quantityLabel: `${row.quantity} ${row.unit}`,
                price: row.price,
                total: row.totalPrice ?? row.quantity * row.price,
            }),
        );

        if (item.discountAmount > 0) {
            rows.push({
                id: `${item.itemId}-discount`,
                itemId: item.itemId,
                itemName: item.itemName,
                materialName: "Potongan",
                quantityLabel: "",
                price: null,
                total: -item.discountAmount,
                isDiscount: true,
            });
        }

        return rows;
    });
}

export function isIssueFollowUpStatus(status: string) {
    return (
        status === "DRAFT" ||
        status === "PENDING_ESTIMATION" ||
        status === "ESTIMATION_APPROVED" ||
        status === "ESTIMATION_REJECTED_REVISION" ||
        status === "IN_PROGRESS" ||
        status === "REVIEW_REJECTED_REVISION"
    );
}

export function isAfterInProgressStatus(status: string) {
    return (
        status === "PENDING_REVIEW" ||
        status === "APPROVED_BMC" ||
        status === "REVIEW_REJECTED_REVISION" ||
        status === "COMPLETED"
    );
}

export function conditionBadgeClass(tone?: "good" | "bad" | "neutral" | "unknown") {
    if (tone === "good") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (tone === "bad") {
        return "border-red-200 bg-red-50 text-red-700";
    }
    if (tone === "neutral") {
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
    return "border-border bg-background text-muted-foreground";
}

export function activityBadgeClass(action: string) {
    if (action.includes("REJECTED")) {
        return "border-red-200 bg-red-50 text-red-700";
    }
    if (action.includes("APPROVED")) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (action.includes("REVISION") || action.includes("REVISED")) {
        return "border-orange-200 bg-orange-50 text-orange-700";
    }
    return "border-slate-200 bg-slate-50 text-slate-700";
}

export function formatActivityAction(action: string) {
    const labels: Record<string, string> = {
        SUBMITTED: "Laporan diajukan",
        RESUBMITTED_ESTIMATION: "Estimasi diajukan ulang",
        RESUBMITTED_WORK: "Pekerjaan diajukan ulang",
        WORK_STARTED: "Pekerjaan dimulai",
        COMPLETION_SUBMITTED: "Pekerjaan diajukan review",
        ESTIMATION_APPROVED: "Estimasi disetujui",
        ESTIMATION_REJECTED_REVISION: "Estimasi perlu revisi",
        ESTIMATION_REJECTED: "Estimasi ditolak",
        WORK_APPROVED: "Pekerjaan disetujui BMC",
        WORK_REJECTED_REVISION: "Pekerjaan perlu revisi",
        FINAL_APPROVED_BNM: "Disetujui final BNM",
        FINAL_REJECTED_REVISION_BNM: "Final perlu revisi",
        ADMIN_REALISASI_REVISED: "Realisasi direvisi admin",
    };
    return labels[action] ?? action;
}

export function formatHandler(handler: string | null) {
    if (!handler) return "";
    return handler === "REKANAN" ? "Rekanan" : handler;
}

export function formatRole(role: string) {
    if (role === "BNM_MANAGER") return "BNM Manager";
    if (role === "BRANCH_ADMIN") return "Branch Admin";
    return role;
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDelta(amount: number) {
    if (amount === 0) return formatCurrency(0);
    const prefix = amount > 0 ? "+" : "-";
    return `${prefix}${formatCurrency(Math.abs(amount))}`;
}

export function formatMoneyCell(amount: number) {
    if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
    return formatCurrency(amount);
}

export function formatHeaderDifference(amount: number) {
    if (amount === 0) return formatCurrency(0);
    if (amount < 0) return `${formatCurrency(Math.abs(amount))} (Sisa)`;
    return `${formatCurrency(amount)} (Lebih)`;
}

export function formatCurrencyIfPresent(amount: number, hasValue: boolean) {
    return hasValue ? formatCurrency(amount) : "";
}

export function formatNullableValue(value: string | number | null | undefined) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    return value.trim();
}

export function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

