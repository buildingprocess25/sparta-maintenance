import "server-only";
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import type {
    ReportItemJson,
    MaterialEstimationJson,
    MaterialStoreJson,
} from "@/types/report";
import { ROLE_LABEL_OVERRIDES } from "@/lib/role-overrides";
import { extractMaterialStoresFromItems } from "@/lib/report-material-stores";

/**
 * Parses pixel dimensions embedded in a Supabase Storage filename.
 * Filenames are written as `{name}_{W}x{H}.{ext}` at upload time,
 * so no HTTP probe is needed at render time.
 * Falls back to 4:3 landscape if the pattern is absent (legacy photos).
 */
function parseDimensionsFromUrl(url: string): {
    width: number;
    height: number;
} {
    const match = url.match(/_([\d]+)x([\d]+)\.\w+/);
    if (match) return { width: parseInt(match[1]), height: parseInt(match[2]) };
    return { width: 4, height: 3 };
}

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 32,
        paddingBottom: 40,
        paddingHorizontal: 36,
        color: "#111827",
    },
    header: {
        marginBottom: 20,
        backgroundColor: "#0069a7",
        padding: "14 20",
        flexDirection: "row",
        alignItems: "center",
    },
    headerLogoAlfamart: {
        width: 60,
        height: 34,
    },
    headerDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 10,
    },
    headerLogoBuilding: {
        width: 24,
        height: 30,
    },
    headerTextGroup: {
        marginLeft: 8,
        flexDirection: "column",
    },
    headerTitle: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
        letterSpacing: 1.5,
    },
    headerSubtitle: {
        fontSize: 7,
        color: "rgba(255,255,255,0.7)",
        fontWeight: 300,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#0069a7",
        marginBottom: 6,
        paddingBottom: 3,
        borderBottom: "1px solid #f5c6c2",
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 0,
    },
    infoRow: {
        flexDirection: "row",
        width: "50%",
        marginBottom: 4,
    },
    infoLabel: {
        width: "45%",
        color: "#6b7280",
        fontSize: 8,
    },
    infoValue: {
        width: "55%",
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#111827",
    },
    table: {
        width: "100%",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0069a7",
        borderRadius: 2,
        marginBottom: 1,
    },
    tableHeaderCell: {
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        padding: "5 6",
    },
    tableRow: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        minHeight: 14,
        alignItems: "center",
        flexWrap: "wrap",
    },
    tableRowAlt: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        backgroundColor: "#f9fafb",
        minHeight: 14,
        alignItems: "center",
        flexWrap: "wrap",
    },
    tableCell: {
        fontSize: 7,
        padding: "3 6",
        color: "#374151",
    },
    tableSubRow: {
        width: "100%",
        flexDirection: "row",
        padding: "2 6 4 6",
        paddingLeft: "15%", // Indent to align with Item column
        backgroundColor: "rgba(253, 242, 242, 0.5)", // Light red tint for notes
        borderTop: "1px dashed #fca5a5",
    },
    tableSubCell: {
        fontSize: 6.5,
        color: "#4b5563",
        marginRight: 10,
    },
    tableSubLabel: {
        fontFamily: "Helvetica-Bold",
        color: "#004b77",
    },
    twoColumnTableContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    halfTableWidth: {
        width: "49%",
    },
    fullTableWidth: {
        width: "100%",
    },
    categoryRow: {
        flexDirection: "row",
        backgroundColor: "#e0f2fe",
        marginTop: 4,
        marginBottom: 1,
    },
    categoryCell: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#0069a7",
        padding: "3 6",
    },
    badgeRusak: {
        color: "#dc2626",
        fontFamily: "Helvetica-Bold",
    },
    badgeBaik: {
        color: "#16a34a",
        fontFamily: "Helvetica-Bold",
    },
    badgeTidakAda: {
        color: "#9ca3af",
    },
    totalRow: {
        flexDirection: "row",
        backgroundColor: "#e0f2fe",
        borderRadius: 2,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#0069a7",
        padding: "6 6",
    },
    totalValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#0069a7",
        padding: "6 6",
        textAlign: "right",
    },
    footer: {
        position: "absolute",
        bottom: 20,
        left: 36,
        right: 36,
        borderTop: "1px solid #e5e7eb",
        paddingTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    footerText: {
        fontSize: 7,
        color: "#9ca3af",
        fontStyle: "italic",
    },
    // Stamp Styles
    stampSectionContent: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "center",
    },
    stampBox: {
        width: 150,
        overflow: "hidden",
    },
    stampBadge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 3,
    },
    stampBadgeText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        color: "#ffffff",
        textAlign: "center",
        letterSpacing: 0.8,
    },
    stampBody: {
        paddingVertical: 7,
        paddingHorizontal: 4,
        alignItems: "center",
        borderBottomWidth: 0.5,
        borderBottomStyle: "solid",
        borderBottomColor: "#d1d5db",
    },
    stampName: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        textAlign: "center",
        color: "#111827",
        marginBottom: 2,
    },
    stampNik: {
        fontSize: 7,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 2,
    },
    stampDate: {
        fontSize: 7,
        color: "#6b7280",
        textAlign: "center",
    },
    stampPendingText: {
        fontSize: 8,
        fontFamily: "Helvetica-Oblique",
        color: "#9ca3af",
        textAlign: "center",
    },
    stampRoleWrapper: {
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    stampRole: {
        fontSize: 7,
        color: "#374151",
        textAlign: "center",
    },
    stampNoteWrapper: {
        paddingTop: 4,
        paddingHorizontal: 4,
    },
    stampNote: {
        fontSize: 7,
        fontFamily: "Helvetica-Oblique",
        color: "#9ca3af",
        textAlign: "center",
    },
    // Completion Section Styles
    completionItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginBottom: 8,
        borderLeft: "3px solid #0069a7",
    },
    completionItemTitle: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#111827",
    },
    completionItemId: {
        fontSize: 7,
        color: "#9ca3af",
        marginLeft: 6,
    },
    completionSubLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#6b7280",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    // 2 photos per row; align-start so photos sit at the top of the row
    photoGrid: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 8,
        alignItems: "flex-start",
        flexWrap: "wrap",
    },
    photoColumns: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12,
    },
    photoColumn: {
        flex: 1,
    },
    completionTable: {
        width: "100%",
        marginBottom: 8,
    },
    completionTableHeader: {
        flexDirection: "row",
        backgroundColor: "#0069a7",
        borderRadius: 2,
        marginBottom: 1,
    },
    completionTableHeaderCell: {
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        padding: "5 6",
    },
    completionTableCell: {
        fontSize: 7.5,
        color: "#374151",
        padding: "4 6",
    },
    completionTableRow: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
    },
    completionTableRowAlt: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        backgroundColor: "#f9fafb",
    },
    completionTotalRow: {
        flexDirection: "row",
        backgroundColor: "#e0f2fe",
        borderRadius: 2,
        marginTop: 4,
    },
    completionNoteBox: {
        backgroundColor: "#fffbeb",
        borderLeft: "3px solid #d97706",
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    completionNoteText: {
        fontSize: 7.5,
        color: "#92400e",
        fontFamily: "Helvetica-Oblique",
    },
    completionStoreRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 8,
    },
    completionStoreBadge: {
        width: "48%",
        backgroundColor: "#f9fafb",
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        paddingVertical: 5,
        paddingHorizontal: 7,
        marginBottom: 6,
    },
    completionStoreName: {
        fontSize: 7.5,
        color: "#111827",
        fontFamily: "Helvetica-Bold",
        marginBottom: 1,
    },
    completionStoreCity: {
        fontSize: 7,
        color: "#6b7280",
    },
    // Nota table: header shows store name + address
    notaTableHeader: {
        backgroundColor: "#fffbeb",
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        paddingVertical: 5,
        paddingHorizontal: 6,
        marginTop: 6,
        marginBottom: 6,
        borderLeft: "3px solid #d97706",
    },
    notaTableStoreName: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#92400e",
    },
    notaTableStoreCity: {
        fontSize: 7,
        color: "#b45309",
    },
    selfieSection: {
        marginTop: 8,
    },
    selfieRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    selfieImage: {
        width: 100,
        height: 75,
        objectFit: "cover",
        borderRadius: 3,
    },
    completionItemBlock: {
        marginBottom: 10,
    },
});

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);

const conditionLabel = (
    condition: string | null,
    preventive: string | null,
): string => {
    if (condition === "BAIK") return "Baik";
    if (condition === "RUSAK") return "Rusak";
    if (condition === "TIDAK_ADA") return "Tidak Ada";
    if (preventive === "OK") return "OK";
    if (preventive === "NOT_OK") return "Not OK";
    if (preventive === "TIDAK_ADA") return "Tidak Ada";
    return "-";
};

const conditionStyle = (
    condition: string | null,
    preventive: string | null,
) => {
    if (condition === "RUSAK" || preventive === "NOT_OK")
        return styles.badgeRusak;
    if (condition === "BAIK" || preventive === "OK") return styles.badgeBaik;
    if (condition === "TIDAK_ADA" || preventive === "TIDAK_ADA")
        return styles.badgeTidakAda;
    return styles.badgeTidakAda;
};

export type ReportStamp = {
    action: string;
    approverName?: string;
    approverNIK?: string;
    approverRole?: string;
    approvedAt?: string;
    notes?: string;
};

export type ReportPdfData = {
    reportNumber: string;
    storeName: string;
    storeCode: string;
    branchName: string;
    submittedBy: string;
    submittedByNIK?: string;
    submittedAt: string;
    finishedAt?: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    alfamartLogoBase64: string;
    buildingLogoBase64: string;
    completionSelfieUrls: string[];
    startReceiptUrls: string[];
    startMaterialStores: MaterialStoreJson[];
    completionNotes?: string;
    completionAdditionalPhotos: string[];
    completionAdditionalNote?: string;
    approval: {
        reportStatus: string;
        stamps: ReportStamp[];
    };
};

function groupItemsByCategory(items: ReportItemJson[]) {
    const groups: Record<string, ReportItemJson[]> = {};
    for (const item of items) {
        if (!groups[item.categoryName]) groups[item.categoryName] = [];
        groups[item.categoryName].push(item);
    }
    return groups;
}

function groupEstimationsByItemId(estimations: MaterialEstimationJson[]) {
    const groups: Record<string, MaterialEstimationJson[]> = {};
    for (const est of estimations) {
        if (!groups[est.itemId]) groups[est.itemId] = [];
        groups[est.itemId].push(est);
    }
    return groups;
}

function getReceiptStores(data: ReportPdfData): MaterialStoreJson[] {
    if (data.startMaterialStores.length > 0) {
        return data.startMaterialStores;
    }

    return extractMaterialStoresFromItems(data.items);
}

function getStampLabelConfig(action: string): { label: string; color: string } {
    switch (action) {
        case "CREATED":
            return { label: "Dibuat", color: "#2563eb" };
        case "ESTIMATION_APPROVED":
            return { label: "Estimasi Disetujui", color: "#16a34a" };
        case "ESTIMATION_REJECTED":
            return { label: "Estimasi Ditolak", color: "#dc2626" };
        case "ESTIMATION_REJECTED_REVISION":
            return { label: "Estimasi Ditolak (Revisi)", color: "#d97706" };
        case "WORK_APPROVED":
            return { label: "Disetujui", color: "#16a34a" };
        case "FINAL_APPROVED_BNM":
            return { label: "Mengetahui", color: "#0369a1" };
        case "WORK_REJECTED_REVISION":
            return { label: "Penyelesaian Ditolak (Revisi)", color: "#d97706" };
        case "FINAL_REJECTED_REVISION_BNM":
            return { label: "Final Review BNM Ditolak", color: "#dc2626" };
        default:
            return { label: action, color: "#6b7280" };
    }
}

function roleLabel(role?: string, nik?: string): string {
    if (nik && ROLE_LABEL_OVERRIDES[nik]) return ROLE_LABEL_OVERRIDES[nik];
    switch (role) {
        case "BMS":
            return "Branch Maintenance Support";
        case "BMC":
            return "Branch Maintenance Coordinator";
        case "BNM_MANAGER":
            return "Building & Maintenance Manager";
        default:
            return role ?? "";
    }
}

function renderStampBox(stamp: ReportStamp, idx: number) {
    const cfg = getStampLabelConfig(stamp.action);
    const hasApprover = !!(stamp.approverName && stamp.approvedAt);
    return React.createElement(
        View,
        {
            key: stamp.action,
            style: {
                ...styles.stampBox,
                marginLeft: idx > 0 ? 16 : 0,
            },
        },
        // Row 1: Colored badge
        React.createElement(
            View,
            { style: { ...styles.stampBadge, backgroundColor: cfg.color } },
            React.createElement(
                Text,
                { style: styles.stampBadgeText },
                cfg.label.toUpperCase(),
            ),
        ),
        // Row 2: Name / NIK / Timestamp (with border-bottom)
        hasApprover
            ? React.createElement(
                  View,
                  { style: styles.stampBody },
                  React.createElement(
                      Text,
                      { style: styles.stampName },
                      stamp.approverName!,
                  ),
                  React.createElement(
                      Text,
                      { style: styles.stampNik },
                      `NIK: ${stamp.approverNIK ?? "—"}`,
                  ),
                  React.createElement(
                      Text,
                      { style: styles.stampDate },
                      stamp.approvedAt!,
                  ),
              )
            : React.createElement(
                  View,
                  { style: styles.stampBody },
                  React.createElement(
                      Text,
                      { style: styles.stampPendingText },
                      "Belum ada penanda tangan",
                  ),
              ),
        // Row 3: Role
        React.createElement(
            View,
            { style: styles.stampRoleWrapper },
            React.createElement(
                Text,
                { style: styles.stampRole },
                roleLabel(stamp.approverRole, stamp.approverNIK),
            ),
        ),
        // Notes (optional)
        stamp.notes
            ? React.createElement(
                  View,
                  { style: styles.stampNoteWrapper },
                  React.createElement(
                      Text,
                      { style: styles.stampNote },
                      stamp.notes,
                  ),
              )
            : null,
    );
}

const BEFORE_AFTER_COL_WIDTH = (595 - 36 * 2 - 8) / 2; // ≈ 257.5pt
const BEFORE_AFTER_MAX_HEIGHT = 260; // pt — increased to comfortably fit square photos without capping

/**
 * Renders a single photo in landscape orientation within a column.
 * - Landscape/square photos: scaled to fit column width, original proportions.
 * - Portrait photos: rotated 90° to landscape; the image’s original height
 *   becomes the visual width (capped at colWidth), and the image’s original
 *   width becomes the visual height.
 */
function renderLandscapePhoto(
    url: string,
    idx: number,
    dimensionMap: Map<string, { width: number; height: number }>,
    colWidth: number,
    maxHeight: number,
    photoMarginBottom = 4,
) {
    const dims = dimensionMap.get(url);
    const nW = dims?.width ?? 4;
    const nH = dims?.height ?? 3;
    const isPortrait = nH > nW;

    if (isPortrait) {
        // After 90° rotation: visual width = nH, visual height = nW.
        // Scale so visual width fits colWidth.
        const scale = Math.min(colWidth / nH, maxHeight / nW);
        const imgW = nW * scale; // pre-rotate width → visual height
        const imgH = nH * scale; // pre-rotate height → visual width
        const visualW = imgH;
        const visualH = imgW;

        const left = -(imgW - imgH) / 2;
        const top = (imgW - imgH) / 2;

        return React.createElement(
            View,
            {
                key: idx,
                style: {
                    width: visualW,
                    height: visualH,
                    overflow: "hidden",
                    borderRadius: 2,
                    marginBottom: 4,
                },
            },
            React.createElement(Image, {
                src: url,
                style: {
                    position: "absolute",
                    left,
                    top,
                    width: imgW,
                    height: imgH,
                    transform: "rotate(90deg)",
                    // the container ratio exactly matches the original photo ratio (nW/nH),
                    // so defaulting to "fill" is perfectly proportional and avoids objectFit bugs.
                },
            }),
        );
    }

    // Landscape / square: fit to column width, cap at maxHeight.
    let w = colWidth;
    let h = colWidth * (nH / nW);
    if (h > maxHeight) {
        h = maxHeight;
        w = maxHeight * (nW / nH);
    }
    return React.createElement(Image, {
        key: idx,
        src: url,
        style: {
            width: w,
            height: h,
            objectFit: "contain",
            borderRadius: 2,
            marginBottom: photoMarginBottom,
        },
    });
}

/**
 * Renders photos in a 2-column grid. Each row contains up to 2 photos.
 * All photos are displayed in landscape orientation (portrait rotated).
 */
function renderPhotoGrid2Col(
    urls: string[],
    label: string,
    dimensionMap: Map<string, { width: number; height: number }>,
    spacing?: {
        containerMarginBottom?: number;
        labelMarginBottom?: number;
        rowMarginBottom?: number;
        photoMarginBottom?: number;
    },
) {
    if (!urls || urls.length === 0) return null;
    const col = BEFORE_AFTER_COL_WIDTH;
    const maxH = BEFORE_AFTER_MAX_HEIGHT;

    const pairs: string[][] = [];
    for (let i = 0; i < urls.length; i += 2) {
        pairs.push(urls.slice(i, i + 2));
    }

    const containerMarginBottom = spacing?.containerMarginBottom ?? 8;
    const labelMarginBottom = spacing?.labelMarginBottom ?? 4;
    const rowMarginBottom = spacing?.rowMarginBottom ?? 4;
    const photoMarginBottom = spacing?.photoMarginBottom ?? 4;

    return React.createElement(
        View,
        { wrap: false, style: { marginBottom: containerMarginBottom } },
        React.createElement(
            Text,
            {
                style: {
                    ...styles.completionSubLabel,
                    marginBottom: labelMarginBottom,
                },
            },
            label,
        ),
        ...pairs.map((pair, rowIdx) =>
            React.createElement(
                View,
                {
                    key: rowIdx,
                    style: {
                        flexDirection: "row",
                        gap: 8,
                        marginBottom: rowMarginBottom,
                    },
                },
                ...pair.map((url, colIdx) =>
                    renderLandscapePhoto(
                        url,
                        rowIdx * 2 + colIdx,
                        dimensionMap,
                        col,
                        maxH,
                        photoMarginBottom,
                    ),
                ),
            ),
        ),
    );
}

/**
 * Renders before & after photos side by side in a two-column layout.
 * All photos are rendered in landscape orientation (portrait rotated 90°).
 */
function renderBeforeAfterRow(
    beforeUrls: string[],
    afterUrls: string[],
    dimensionMap: Map<string, { width: number; height: number }>,
) {
    const hasBefore = beforeUrls.length > 0;
    const hasAfter = afterUrls.length > 0;
    if (!hasBefore && !hasAfter) return null;

    const col = BEFORE_AFTER_COL_WIDTH;
    const maxH = BEFORE_AFTER_MAX_HEIGHT;

    const renderPhoto = (url: string, idx: number) =>
        renderLandscapePhoto(url, idx, dimensionMap, col, maxH);

    return React.createElement(
        View,
        { style: { flexDirection: "row", gap: 8, marginBottom: 8 } },
        // Left: Foto Sebelum
        hasBefore
            ? React.createElement(
                  View,
                  { style: { width: col } },
                  React.createElement(
                      Text,
                      { style: styles.completionSubLabel },
                      "Foto Sebelum",
                  ),
                  ...beforeUrls.map(renderPhoto),
              )
            : null,
        // Right: Foto Sesudah
        hasAfter
            ? React.createElement(
                  View,
                  { style: { width: col } },
                  React.createElement(
                      Text,
                      { style: styles.completionSubLabel },
                      "Foto Sesudah",
                  ),
                  ...afterUrls.map(renderPhoto),
              )
            : null,
    );
}

function buildReportDocument(
    data: ReportPdfData,
    dimensionMap: Map<string, { width: number; height: number }>,
) {
    const itemGroups = groupItemsByCategory(data.items);
    const rusakItems = data.items.filter(
        (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
    );

    return React.createElement(
        Document,
        null,
        React.createElement(
            Page,
            { size: "A4", style: styles.page },

            // Header: Alfamart Red + Logos
            React.createElement(
                View,
                { style: styles.header },
                React.createElement(Image, {
                    src: `data:image/png;base64,${data.alfamartLogoBase64}`,
                    style: styles.headerLogoAlfamart,
                }),
                React.createElement(View, { style: styles.headerDivider }),
                React.createElement(Image, {
                    src: `data:image/png;base64,${data.buildingLogoBase64}`,
                    style: styles.headerLogoBuilding,
                }),
                React.createElement(
                    View,
                    { style: styles.headerTextGroup },
                    React.createElement(
                        Text,
                        { style: styles.headerTitle },
                        "SPARTA",
                    ),
                    React.createElement(
                        Text,
                        { style: styles.headerSubtitle },
                        "Maintenance",
                    ),
                ),
            ),

            // Info Section
            React.createElement(
                View,
                { style: styles.section },
                React.createElement(
                    Text,
                    { style: styles.sectionTitle },
                    "Informasi Laporan",
                ),
                React.createElement(
                    View,
                    { style: styles.infoGrid },
                    ...[
                        ["Nomor Laporan", data.reportNumber],
                        ["Disubmit oleh", data.submittedBy],
                        ["Nama Toko", data.storeName],
                        ["Cabang", data.branchName],
                        ["Kode Toko", data.storeCode],
                        ["Tanggal Submit", data.submittedAt],
                        ["Item Rusak / NOK", `${rusakItems.length} item`],
                        ["Laporan Selesai", data.finishedAt ?? "—"],
                    ].map(([label, value], i) =>
                        React.createElement(
                            View,
                            { key: i, style: styles.infoRow },
                            React.createElement(
                                Text,
                                { style: styles.infoLabel },
                                label,
                            ),
                            React.createElement(
                                Text,
                                { style: styles.infoValue },
                                value,
                            ),
                        ),
                    ),
                ),
            ),

            // Checklist Section
            (() => {
                const totalItems = data.items.length;
                const USE_TWO_COLUMNS = totalItems > 0; // Always split into 2 columns
                const tableContainerStyle = USE_TWO_COLUMNS
                    ? styles.twoColumnTableContainer
                    : { width: "100%" };
                const columnStyle = USE_TWO_COLUMNS
                    ? styles.halfTableWidth
                    : styles.fullTableWidth;

                // Compact style overrides — smaller to fit 2 columns side-by-side
                const ckHeaderCell = {
                    ...styles.tableHeaderCell,
                    fontSize: 6,
                    padding: "3 4",
                };
                const ckCell = {
                    ...styles.tableCell,
                    fontSize: 6,
                    padding: "2 4",
                };
                const ckRow = { ...styles.tableRow, minHeight: 10 };
                const ckRowAlt = { ...styles.tableRowAlt, minHeight: 10 };
                const ckSubRow = {
                    ...styles.tableSubRow,
                    padding: "1 4 3 4",
                    paddingLeft: "15%",
                };
                const ckSubCell = { ...styles.tableSubCell, fontSize: 5.5 };
                const ckCatCell = {
                    ...styles.categoryCell,
                    fontSize: 6.5,
                    padding: "2 4",
                };

                // Create a reusable header component
                const TableHeader = () =>
                    React.createElement(
                        View,
                        { style: styles.tableHeader },
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...ckHeaderCell,
                                    width: "15%",
                                },
                            },
                            "Kode",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...ckHeaderCell,
                                    width: "55%",
                                },
                            },
                            "Item Pekerjaan",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...ckHeaderCell,
                                    width: "30%",
                                },
                            },
                            "Kondisi",
                        ),
                    );

                // Create a reusable item row component
                const ItemRow = ({
                    item,
                    itemIdx,
                }: {
                    item: ReportItemJson;
                    itemIdx: number;
                }) => {
                    const rowStyle = itemIdx % 2 === 0 ? ckRow : ckRowAlt;
                    const cStyle = conditionStyle(
                        item.condition,
                        item.preventiveCondition,
                    );
                    const hasIssue =
                        item.condition === "RUSAK" ||
                        item.preventiveCondition === "NOT_OK";
                    const hasNotes = Boolean(item.handler || item.notes);

                    return React.createElement(
                        View,
                        { key: `item-${item.itemId}`, style: rowStyle },
                        // Main Row
                        React.createElement(
                            View,
                            {
                                style: {
                                    flexDirection: "row",
                                    width: "100%",
                                    alignItems: "center",
                                },
                            },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...ckCell,
                                        width: "15%",
                                        color: "#9ca3af",
                                    },
                                },
                                item.itemId,
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...ckCell,
                                        width: "55%",
                                    },
                                },
                                item.itemName,
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...ckCell,
                                        width: "30%",
                                        ...cStyle,
                                    },
                                },
                                conditionLabel(
                                    item.condition,
                                    item.preventiveCondition,
                                ),
                            ),
                        ),
                        // Sub Row (only shown if there are issues AND handler/notes exist)
                        hasIssue && hasNotes
                            ? React.createElement(
                                  View,
                                  { style: ckSubRow },
                                  item.handler
                                      ? React.createElement(
                                            Text,
                                            { style: ckSubCell },
                                            React.createElement(
                                                Text,
                                                { style: styles.tableSubLabel },
                                                "Handler: ",
                                            ),
                                            item.handler,
                                        )
                                      : null,
                                  item.notes
                                      ? React.createElement(
                                            Text,
                                            {
                                                style: {
                                                    ...ckSubCell,
                                                    flex: 1,
                                                },
                                            },
                                            React.createElement(
                                                Text,
                                                { style: styles.tableSubLabel },
                                                "Catatan: ",
                                            ),
                                            item.notes,
                                        )
                                      : null,
                              )
                            : null,
                    );
                };

                // Split categories into left and right columns if USE_TWO_COLUMNS
                const categories = Object.entries(itemGroups);
                const leftCategories: typeof categories = [];
                const rightCategories: typeof categories = [];

                if (USE_TWO_COLUMNS) {
                    // Split at midpoint of total items so categories read sequentially:
                    // left column = A…mid, right column = mid+1…end
                    const totalItemCount = categories.reduce(
                        (sum, [, items]) => sum + items.length,
                        0,
                    );
                    const half = Math.ceil(totalItemCount / 2);
                    let accumulated = 0;
                    let splitDone = false;
                    categories.forEach(([cat, items]) => {
                        if (!splitDone) {
                            leftCategories.push([cat, items]);
                            accumulated += items.length;
                            if (accumulated >= half) splitDone = true;
                        } else {
                            rightCategories.push([cat, items]);
                        }
                    });
                } else {
                    leftCategories.push(...categories);
                }

                const renderCategoryBlock = (
                    cat: string,
                    items: ReportItemJson[],
                    catIdx: number | string,
                ) => [
                    React.createElement(
                        View,
                        { key: `cat-${catIdx}`, style: styles.categoryRow },
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...ckCatCell,
                                    width: "100%",
                                },
                            },
                            cat,
                        ),
                    ),
                    ...items.map((item, itemIdx) => ItemRow({ item, itemIdx })),
                ];

                return React.createElement(
                    View,
                    { style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Checklist Kondisi Toko",
                    ),
                    React.createElement(
                        View,
                        { style: tableContainerStyle },

                        // Left Column (or full width if not 2-col)
                        React.createElement(
                            View,
                            { style: columnStyle },
                            TableHeader(),
                            ...leftCategories.flatMap(([cat, items], idx) =>
                                renderCategoryBlock(cat, items, `left-${idx}`),
                            ),
                        ),

                        // Right Column (if 2-col)
                        USE_TWO_COLUMNS
                            ? React.createElement(
                                  View,
                                  { style: columnStyle },
                                  TableHeader(),
                                  ...rightCategories.flatMap(
                                      ([cat, items], idx) =>
                                          renderCategoryBlock(
                                              cat,
                                              items,
                                              `right-${idx}`,
                                          ),
                                  ),
                              )
                            : null,
                    ),
                );
            })(),

            // Estimasi BMS Section — only shown BEFORE completion is submitted
            (() => {
                const COMPLETION_STATUSES = [
                    "PENDING_REVIEW",
                    "REVIEW_REJECTED_REVISION",
                    "COMPLETED",
                ];
                const isCompletionSubmitted = COMPLETION_STATUSES.includes(
                    data.approval.reportStatus,
                );

                // After completion: skip this section (Rekap Penyelesaian replaces it below)
                if (isCompletionSubmitted || data.estimations.length === 0)
                    return null;

                return React.createElement(
                    View,
                    { style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Estimasi Biaya BMS",
                    ),
                    React.createElement(
                        View,
                        { style: styles.table },
                        React.createElement(
                            View,
                            { style: styles.tableHeader },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "5%",
                                    },
                                },
                                "No.",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "10%",
                                    },
                                },
                                "Item ID",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "35%",
                                    },
                                },
                                "Material",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "10%",
                                    },
                                },
                                "Jumlah",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "10%",
                                    },
                                },
                                "Satuan",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "15%",
                                    },
                                },
                                "Harga",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.tableHeaderCell,
                                        width: "15%",
                                    },
                                },
                                "Total",
                            ),
                        ),
                        ...data.estimations.map((est, i) =>
                            React.createElement(
                                View,
                                {
                                    key: `est-${i}`,
                                    style:
                                        i % 2 === 0
                                            ? styles.tableRow
                                            : styles.tableRowAlt,
                                },
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "5%",
                                            color: "#9ca3af",
                                        },
                                    },
                                    String(i + 1),
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "10%",
                                        },
                                    },
                                    est.itemId,
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "35%",
                                        },
                                    },
                                    est.materialName,
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "10%",
                                        },
                                    },
                                    String(est.quantity),
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "10%",
                                        },
                                    },
                                    est.unit,
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "15%",
                                        },
                                    },
                                    formatCurrency(est.price),
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.tableCell,
                                            width: "15%",
                                            fontFamily: "Helvetica-Bold",
                                        },
                                    },
                                    formatCurrency(est.totalPrice),
                                ),
                            ),
                        ),
                        // Grand Total Row
                        React.createElement(
                            View,
                            { style: styles.totalRow },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "85%",
                                    },
                                },
                                "Total Keseluruhan",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalValue,
                                        width: "15%",
                                    },
                                },
                                formatCurrency(data.totalEstimation),
                            ),
                        ),
                    ),
                );
            })(),

            // Completion Detail Section — simplified: item header + before/after photos only
            (() => {
                const COMPLETION_STATUSES = [
                    "PENDING_REVIEW",
                    "REVIEW_REJECTED_REVISION",
                    "COMPLETED",
                ];
                const isCompletionSubmitted = COMPLETION_STATUSES.includes(
                    data.approval.reportStatus,
                );
                if (!isCompletionSubmitted) return null;

                const completionItems = data.items.filter(
                    (i) =>
                        i.handler === "BMS" &&
                        (i.condition === "RUSAK" ||
                            i.preventiveCondition === "NOT_OK") &&
                        ((i.images && i.images.length > 0) ||
                            i.photoUrl ||
                            (i.afterImages && i.afterImages.length > 0)),
                );
                if (completionItems.length === 0) return null;

                return React.createElement(
                    View,
                    { break: true, style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Detail Penyelesaian Pekerjaan",
                    ),

                    // Per-item blocks: header + before/after photos only
                    ...completionItems.map((item) =>
                        React.createElement(
                            View,
                            {
                                key: item.itemId,
                                style: styles.completionItemBlock,
                            },
                            // Item header
                            React.createElement(
                                View,
                                { style: styles.completionItemHeader },
                                React.createElement(
                                    Text,
                                    { style: styles.completionItemTitle },
                                    item.itemName,
                                ),
                                React.createElement(
                                    Text,
                                    { style: styles.completionItemId },
                                    item.itemId,
                                ),
                            ),

                            // Foto Sebelum & Sesudah side by side (landscape)
                            renderBeforeAfterRow(
                                (item.images ??
                                    [item.photoUrl].filter(
                                        Boolean,
                                    )) as string[],
                                item.afterImages ?? [],
                                dimensionMap,
                            ),
                        ),
                    ),
                );
            })(),

            // Bukti Serah Terima dan Nota — selfie + receipt photos
            (() => {
                const COMPLETION_STATUSES = [
                    "PENDING_REVIEW",
                    "APPROVED_BMC",
                    "REVIEW_REJECTED_REVISION",
                    "COMPLETED",
                ];
                const isCompletionSubmitted = COMPLETION_STATUSES.includes(
                    data.approval.reportStatus,
                );
                if (!isCompletionSubmitted) return null;
                const hasSelfie = data.completionSelfieUrls.length > 0;
                const hasReceipts = data.startReceiptUrls.length > 0;
                const hasNotes = !!data.completionNotes;
                const hasAdditionalPhotos =
                    data.completionAdditionalPhotos.length > 0;
                const hasAdditionalNote = !!data.completionAdditionalNote;
                if (
                    !hasSelfie &&
                    !hasReceipts &&
                    !hasNotes &&
                    !hasAdditionalPhotos &&
                    !hasAdditionalNote
                )
                    return null;

                return React.createElement(
                    View,
                    { break: true, style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Bukti Serah Terima dan Nota",
                    ),

                    // Selfie photos in 2-column grid
                    hasSelfie
                        ? renderPhotoGrid2Col(
                              data.completionSelfieUrls,
                              "Foto Selfie BMS",
                              dimensionMap,
                          )
                        : null,

                    // Receipt photos in 2-column grid
                    hasReceipts
                        ? React.createElement(
                              View,
                              { style: { marginBottom: 8 } },
                              renderPhotoGrid2Col(
                                  data.startReceiptUrls,
                                  "Nota / Struk Belanja",
                                  dimensionMap,
                              ),
                              // Store info below receipt photos
                              (() => {
                                  const stores = getReceiptStores(data);
                                  if (stores.length === 0) return null;

                                  return React.createElement(
                                      View,
                                      null,
                                      React.createElement(
                                          View,
                                          { style: styles.notaTableHeader },
                                          React.createElement(
                                              Text,
                                              {
                                                  style: styles.notaTableStoreName,
                                              },
                                              "Toko Material",
                                          ),
                                      ),
                                      React.createElement(
                                          View,
                                          {
                                              style: styles.completionStoreRow,
                                          },
                                          ...stores.map((store) =>
                                              React.createElement(
                                                  View,
                                                  {
                                                      key: `${store.name}-${store.city}`,
                                                      style: styles.completionStoreBadge,
                                                  },
                                                  React.createElement(
                                                      Text,
                                                      {
                                                          style: styles.completionStoreName,
                                                      },
                                                      store.name,
                                                  ),
                                                  React.createElement(
                                                      Text,
                                                      {
                                                          style: styles.completionStoreCity,
                                                      },
                                                      `Alamat: ${store.city}`,
                                                  ),
                                              ),
                                          ),
                                      ),
                                  );
                              })(),
                          )
                        : null,

                    // Additional completion documentation
                    hasAdditionalPhotos
                        ? renderPhotoGrid2Col(
                              data.completionAdditionalPhotos,
                              "Dokumentasi Tambahan",
                              dimensionMap,
                          )
                        : null,

                    hasAdditionalNote
                        ? React.createElement(
                              View,
                              {
                                  wrap: false,
                                  style: {
                                      ...styles.completionNoteBox,
                                      marginTop: -2,
                                  },
                              },
                              React.createElement(
                                  Text,
                                  { style: styles.completionNoteText },
                                  "Catatan Dokumentasi Tambahan: ",
                                  data.completionAdditionalNote,
                              ),
                          )
                        : null,

                    // Completion notes
                    hasNotes
                        ? React.createElement(
                              View,
                              {
                                  wrap: false,
                                  style: {
                                      ...styles.completionNoteBox,
                                      marginTop: 2,
                                  },
                              },
                              React.createElement(
                                  Text,
                                  { style: styles.completionNoteText },
                                  "Catatan Penyelesaian: ",
                                  data.completionNotes,
                              ),
                          )
                        : null,
                );
            })(),

            // Rekap Penyelesaian — compact single table (only after completion submitted)
            (() => {
                const COMPLETION_STATUSES = [
                    "PENDING_REVIEW",
                    "APPROVED_BMC",
                    "REVIEW_REJECTED_REVISION",
                    "COMPLETED",
                ];
                const isCompletionSubmitted = COMPLETION_STATUSES.includes(
                    data.approval.reportStatus,
                );
                if (!isCompletionSubmitted || data.estimations.length === 0)
                    return null;

                // Gather all realisasi items from rusak/not_ok items
                const allRealisasi = data.items
                    .filter(
                        (i) =>
                            i.condition === "RUSAK" ||
                            i.preventiveCondition === "NOT_OK",
                    )
                    .flatMap((i) => i.realisasiItems ?? []);

                const totalEstimasi = data.totalEstimation;
                const totalRealisasi = allRealisasi.reduce(
                    (sum, r) => sum + r.quantity * r.price,
                    0,
                );
                const selisih = totalEstimasi - totalRealisasi;

                const mergedRows = data.estimations.map((est) => {
                    const real = allRealisasi.find(
                        (r) => r.materialName === est.materialName,
                    );
                    return {
                        material: est.materialName,
                        qty: est.quantity,
                        unit: est.unit,
                        estPrice: est.price,
                        estTotal: est.totalPrice,
                        realQty: real ? real.quantity : 0,
                        realPrice: real ? real.price : 0,
                        realTotal: real ? real.quantity * real.price : 0,
                    };
                });
                // Add realisasi items that don't match any estimation
                allRealisasi.forEach((r) => {
                    if (
                        !data.estimations.some(
                            (e) => e.materialName === r.materialName,
                        )
                    ) {
                        mergedRows.push({
                            material: r.materialName,
                            qty: 0,
                            unit: r.unit,
                            estPrice: 0,
                            estTotal: 0,
                            realQty: r.quantity,
                            realPrice: r.price,
                            realTotal: r.quantity * r.price,
                        });
                    }
                });

                const cellStyle = {
                    ...styles.completionTableCell,
                    fontSize: 7,
                    padding: "2 3",
                };
                const headerCellStyle = {
                    ...styles.completionTableHeaderCell,
                    fontSize: 7,
                    padding: "3 3",
                };

                return React.createElement(
                    View,
                    { break: true, style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Realisasi Dana Taktis",
                    ),
                    React.createElement(
                        View,
                        { style: styles.completionTable },
                        // Header
                        React.createElement(
                            View,
                            { style: styles.completionTableHeader },
                            React.createElement(
                                Text,
                                { style: { ...headerCellStyle, width: "25%" } },
                                "Material",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "8%",
                                        textAlign: "center",
                                    },
                                },
                                "Jml Est.",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "8%",
                                        textAlign: "center",
                                    },
                                },
                                "Jml Real.",
                            ),
                            React.createElement(
                                Text,
                                { style: { ...headerCellStyle, width: "7%" } },
                                "Sat",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "13%",
                                        textAlign: "right",
                                    },
                                },
                                "Harga Est.",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "13%",
                                        textAlign: "right",
                                    },
                                },
                                "Total Est.",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "13%",
                                        textAlign: "right",
                                    },
                                },
                                "Harga Real.",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...headerCellStyle,
                                        width: "13%",
                                        textAlign: "right",
                                    },
                                },
                                "Total Real.",
                            ),
                        ),
                        // Data rows
                        ...mergedRows.map((row, i) =>
                            React.createElement(
                                View,
                                {
                                    key: i,
                                    style:
                                        i % 2 === 0
                                            ? styles.completionTableRow
                                            : styles.completionTableRowAlt,
                                },
                                React.createElement(
                                    Text,
                                    { style: { ...cellStyle, width: "25%" } },
                                    row.material,
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "8%",
                                            textAlign: "center",
                                        },
                                    },
                                    String(row.qty),
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "8%",
                                            textAlign: "center",
                                        },
                                    },
                                    String(row.realQty),
                                ),
                                React.createElement(
                                    Text,
                                    { style: { ...cellStyle, width: "7%" } },
                                    row.unit,
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "13%",
                                            textAlign: "right",
                                        },
                                    },
                                    row.estPrice
                                        ? formatCurrency(row.estPrice)
                                        : "—",
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "13%",
                                            textAlign: "right",
                                        },
                                    },
                                    row.estTotal
                                        ? formatCurrency(row.estTotal)
                                        : "—",
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "13%",
                                            textAlign: "right",
                                        },
                                    },
                                    row.realPrice
                                        ? formatCurrency(row.realPrice)
                                        : "—",
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...cellStyle,
                                            width: "13%",
                                            textAlign: "right",
                                            fontFamily: "Helvetica-Bold",
                                        },
                                    },
                                    row.realTotal
                                        ? formatCurrency(row.realTotal)
                                        : "—",
                                ),
                            ),
                        ),
                        // Total row in table (right-aligned)
                        React.createElement(
                            View,
                            { style: styles.completionTotalRow },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "74%",
                                        fontSize: 7,
                                    },
                                },
                                "",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "13%",
                                        fontSize: 7,
                                        textAlign: "right",
                                    },
                                },
                                "Total Estimasi",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalValue,
                                        width: "13%",
                                        fontSize: 7,
                                    },
                                },
                                formatCurrency(totalEstimasi),
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: styles.completionTotalRow },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "74%",
                                        fontSize: 7,
                                    },
                                },
                                "",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "13%",
                                        fontSize: 7,
                                        textAlign: "right",
                                    },
                                },
                                "Total Realisasi",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalValue,
                                        width: "13%",
                                        fontSize: 7,
                                    },
                                },
                                formatCurrency(totalRealisasi),
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: styles.completionTotalRow },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "74%",
                                        fontSize: 7,
                                    },
                                },
                                "",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalLabel,
                                        width: "13%",
                                        fontSize: 7,
                                        textAlign: "right",
                                    },
                                },
                                "Selisih",
                            ),
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...styles.totalValue,
                                        width: "13%",
                                        fontSize: 7,
                                    },
                                },
                                formatCurrency(selisih),
                            ),
                        ),
                    ),
                );
            })(),

            // Approval Section — always shown (DIBUAT stamp + any approval stamps)
            (() => {
                const dibuatStamp: ReportStamp = {
                    action: "CREATED",
                    approverName: data.submittedBy,
                    approverNIK: data.submittedByNIK,
                    approverRole: "BMS",
                    approvedAt: data.submittedAt,
                };

                const ESTIMATION_ACTIONS = [
                    "ESTIMATION_APPROVED",
                    "ESTIMATION_REJECTED",
                    "ESTIMATION_REJECTED_REVISION",
                ];
                const BMC_WORK_ACTIONS = [
                    "WORK_APPROVED",
                    "WORK_REJECTED_REVISION",
                ];
                const FINAL_BNM_ACTIONS = [
                    "FINAL_APPROVED_BNM",
                    "FINAL_REJECTED_REVISION_BNM",
                ];

                const processedStamps: ReportStamp[] = [];
                for (const stamp of data.approval.stamps) {
                    if (ESTIMATION_ACTIONS.includes(stamp.action)) {
                        // Once work is approved by BMC, estimation stamp is no longer shown.
                        if (
                            processedStamps.some(
                                (s) => s.action === "WORK_APPROVED",
                            )
                        ) {
                            continue;
                        }

                        const existingIdx = processedStamps.findIndex((s) =>
                            ESTIMATION_ACTIONS.includes(s.action),
                        );
                        if (existingIdx !== -1)
                            processedStamps.splice(existingIdx, 1);
                    } else if (BMC_WORK_ACTIONS.includes(stamp.action)) {
                        if (stamp.action === "WORK_APPROVED") {
                            for (
                                let i = processedStamps.length - 1;
                                i >= 0;
                                i--
                            ) {
                                if (
                                    ESTIMATION_ACTIONS.includes(
                                        processedStamps[i].action,
                                    )
                                ) {
                                    processedStamps.splice(i, 1);
                                }
                            }
                        }

                        const existingIdx = processedStamps.findIndex((s) =>
                            BMC_WORK_ACTIONS.includes(s.action),
                        );
                        if (existingIdx !== -1)
                            processedStamps.splice(existingIdx, 1);
                    } else if (FINAL_BNM_ACTIONS.includes(stamp.action)) {
                        const existingIdx = processedStamps.findIndex((s) =>
                            FINAL_BNM_ACTIONS.includes(s.action),
                        );
                        if (existingIdx !== -1)
                            processedStamps.splice(existingIdx, 1);
                    }
                    processedStamps.push(stamp);
                }

                // Filter to only show stamps with actual approval (has approverName + approvedAt)
                // Always include dibuatStamp (BMS creation), then add processed stamps that have approval data
                const approvedStamps = processedStamps.filter(
                    (stamp) => stamp.approverName && stamp.approvedAt,
                );
                const allStamps = [dibuatStamp, ...approvedStamps];

                return React.createElement(
                    View,
                    { style: styles.section },
                    React.createElement(View, {
                        style: {
                            height: 1,
                            backgroundColor: "#f5c6c2",
                            marginBottom: 10,
                        },
                    }),
                    React.createElement(
                        View,
                        { style: styles.stampSectionContent },
                        ...allStamps.map((stamp, idx) =>
                            renderStampBox(stamp, idx),
                        ),
                    ),
                );
            })(),

            // Footer
            React.createElement(
                View,
                { style: styles.footer, fixed: true },
                React.createElement(
                    Text,
                    { style: styles.footerText },
                    `No. Laporan: ${data.reportNumber} — Dokumen ini di generate otomatis oleh sistem SPARTA Maintenance`,
                ),
                React.createElement(Text, {
                    style: styles.footerText,
                    render: ({
                        pageNumber,
                        totalPages,
                    }: {
                        pageNumber: number;
                        totalPages: number;
                    }) => `Halaman ${pageNumber} dari ${totalPages}`,
                }),
            ),
        ),
    );
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
    // Collect all photo URLs that appear in the PDF
    const allUrls: string[] = [
        ...data.completionSelfieUrls,
        ...data.startReceiptUrls,
        ...data.completionAdditionalPhotos,
        ...data.items.flatMap((item) => [
            ...(item.images ?? (item.photoUrl ? [item.photoUrl] : [])),
            ...(item.afterImages ?? []),
            ...(item.receiptImages ?? []),
        ]),
    ].filter(Boolean);

    // Parse pixel dimensions from filenames (embedded at upload time as _WxH before extension)
    const uniqueUrls = [...new Set(allUrls)];
    const dimensionMap = new Map<string, { width: number; height: number }>(
        uniqueUrls.map((url) => [url, parseDimensionsFromUrl(url)]),
    );

    const doc = buildReportDocument(data, dimensionMap);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}

export { groupEstimationsByItemId };
