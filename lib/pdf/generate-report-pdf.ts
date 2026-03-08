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
import probe from "probe-image-size";
import type {
    ReportItemJson,
    MaterialEstimationJson,
    RealisasiItemJson,
} from "@/types/report";

/**
 * Detects whether an image URL is portrait or landscape by fetching
 * only the minimal bytes needed to read the image header dimensions.
 * Returns "portrait" | "landscape" | "square".
 */
export async function getImageOrientation(
    url: string,
): Promise<"portrait" | "landscape" | "square"> {
    try {
        const result = await probe(url);
        if (result.width > result.height) return "landscape";
        if (result.height > result.width) return "portrait";
        return "square";
    } catch {
        // If probe fails (network error, unsupported format, etc.),
        // default to landscape so the rotation path is taken as a safe fallback.
        return "landscape";
    }
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
        backgroundColor: "#c0392b",
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
        color: "#c0392b",
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
        backgroundColor: "#c0392b",
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
    },
    tableRowAlt: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        backgroundColor: "#f9fafb",
    },
    tableCell: {
        fontSize: 8,
        padding: "4 6",
        color: "#374151",
    },
    categoryRow: {
        flexDirection: "row",
        backgroundColor: "#fdf2f2",
        marginTop: 4,
        marginBottom: 1,
    },
    categoryCell: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#c0392b",
        padding: "4 6",
    },
    badgeRusak: {
        color: "#c0392b",
        fontFamily: "Helvetica-Bold",
    },
    badgeBaik: {
        color: "#16a34a",
    },
    badgeTidakAda: {
        color: "#9ca3af",
    },
    totalRow: {
        flexDirection: "row",
        backgroundColor: "#fdf2f2",
        borderRadius: 2,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#c0392b",
        padding: "6 6",
    },
    totalValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#c0392b",
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
    },
    // Stamp Styles
    stampSectionContent: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "flex-end",
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
        borderLeft: "3px solid #c0392b",
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
        backgroundColor: "#c0392b",
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
        backgroundColor: "#fdf2f2",
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
        backgroundColor: "#eff6ff",
        borderRadius: 3,
        paddingVertical: 3,
        paddingHorizontal: 7,
    },
    completionStoreName: {
        fontSize: 7.5,
        color: "#1d4ed8",
        fontFamily: "Helvetica-Bold",
    },
    completionStoreCity: {
        fontSize: 7,
        color: "#6b7280",
    },
    // Nota table: header shows store name + city
    notaTableHeader: {
        backgroundColor: "#f3f4f6",
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginBottom: 3,
        borderLeft: "2px solid #9ca3af",
    },
    notaTableStoreName: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#111827",
    },
    notaTableStoreCity: {
        fontSize: 7,
        color: "#6b7280",
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
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "0.5px solid #e5e7eb",
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
    return "-";
};

const conditionStyle = (
    condition: string | null,
    preventive: string | null,
) => {
    if (condition === "RUSAK" || preventive === "NOT_OK")
        return styles.badgeRusak;
    if (condition === "BAIK" || preventive === "OK") return styles.badgeBaik;
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
    submittedAt: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    alfamartLogoBase64: string;
    buildingLogoBase64: string;
    completionSelfieUrls: string[];
    startReceiptUrls: string[];
    completionNotes?: string;
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

function getStampLabelConfig(action: string): { label: string; color: string } {
    switch (action) {
        case "ESTIMATION_APPROVED":
            return { label: "Estimasi Disetujui", color: "#16a34a" };
        case "ESTIMATION_REJECTED":
            return { label: "Estimasi Ditolak", color: "#dc2626" };
        case "ESTIMATION_REJECTED_REVISION":
            return { label: "Estimasi Ditolak (Revisi)", color: "#d97706" };
        case "WORK_APPROVED":
            return { label: "Penyelesaian Disetujui", color: "#16a34a" };
        case "FINALIZED":
            return { label: "Penyelesaian Disetujui", color: "#0369a1" };
        case "WORK_REJECTED_REVISION":
            return { label: "Penyelesaian Ditolak (Review)", color: "#d97706" };
        default:
            return { label: action, color: "#6b7280" };
    }
}

function roleLabel(role?: string): string {
    switch (role) {
        case "BMC":
            return "Branch Maintenance Coordinator";
        case "BNM_MANAGER":
            return "BNM Manager";
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
                marginLeft: idx > 0 ? 12 : 0,
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
                roleLabel(stamp.approverRole),
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

// Each photo slot gets half the usable page width (36pt padding each side, 8pt gap between 2 photos)
// Fixed row height for all photos — width scales proportionally, zero cropping
const PHOTO_ROW_HEIGHT = 150; // pt

function renderPhotoGrid(
    urls: string[],
    label: string,
    dimensionMap: Map<string, { width: number; height: number }>,
    height = PHOTO_ROW_HEIGHT,
) {
    if (!urls || urls.length === 0) return null;
    const rows: string[][] = [];
    for (let i = 0; i < urls.length; i += 2) {
        rows.push(urls.slice(i, i + 2));
    }
    return React.createElement(
        View,
        { wrap: false, style: { marginBottom: 10 } },
        React.createElement(Text, { style: styles.completionSubLabel }, label),
        ...rows.map((pair, rowIdx) =>
            React.createElement(
                View,
                { key: rowIdx, style: styles.photoGrid },
                ...pair.map((url, i) => {
                    const dims = dimensionMap.get(url);
                    const nW = dims?.width ?? 4;
                    const nH = dims?.height ?? 3;
                    const isLandscape = nW > nH;

                    if (isLandscape) {
                        const imgW = height;
                        const imgH = (nH * height) / nW;
                        const marginLeft = -(imgW - imgH) / 2;
                        const marginTop = (imgW - imgH) / 2;
                        const visualWidth = imgH;
                        return React.createElement(
                            View,
                            {
                                key: i,
                                style: {
                                    width: visualWidth,
                                    height: height,
                                    overflow: "hidden",
                                    borderRadius: 2,
                                },
                            },
                            React.createElement(Image, {
                                src: url,
                                style: {
                                    width: imgW,
                                    height: imgH,
                                    marginLeft,
                                    marginTop,
                                    transform: "rotate(90deg)",
                                },
                            }),
                        );
                    }

                    // Portrait or square: fix height, width proportional
                    const renderedW = height * (nW / nH);
                    return React.createElement(Image, {
                        key: i,
                        src: url,
                        style: {
                            width: renderedW,
                            height: height,
                            borderRadius: 2,
                        },
                    });
                }),
            ),
        ),
    );
}

// Each column in the before/after layout gets half the usable page width
const BEFORE_AFTER_COL_WIDTH = (595 - 36 * 2 - 8) / 2; // ≈ 257.5pt
const BEFORE_AFTER_MAX_HEIGHT = 250; // pt — cap per photo to keep the section compact

/**
 * Renders before & after photos side by side in a two-column layout.
 * Each photo is capped at BEFORE_AFTER_MAX_HEIGHT; width scales down proportionally
 * if needed — zero cropping, zero stretching.
 * Landscape photos are rotated 90° to portrait before display.
 */
function renderBeforeAfterRow(
    beforeUrls: string[],
    afterUrls: string[],
    dimensionMap: Map<string, { width: number; height: number }>,
) {
    const hasBefore = beforeUrls.length > 0;
    const hasAfter = afterUrls.length > 0;
    if (!hasBefore && !hasAfter) return null;

    const renderColPhoto = (url: string, idx: number) => {
        const dims = dimensionMap.get(url);
        const nW = dims?.width ?? 4;
        const nH = dims?.height ?? 3;
        const col = BEFORE_AFTER_COL_WIDTH;
        const maxH = BEFORE_AFTER_MAX_HEIGHT;

        if (nW > nH) {
            // Landscape → rotate 90°.
            // After rotation: visual width = imgH (pre-rotate), visual height = imgW (pre-rotate).
            // Start by fitting to col width: imgH = col, imgW = col * (nW/nH).
            // Then cap visual height (= imgW) to maxH if needed.
            let imgH = col;
            let imgW = col * (nW / nH);
            if (imgW > maxH) {
                // Scale down so visual height = maxH
                imgW = maxH;
                imgH = maxH * (nH / nW);
            }
            const visualW = imgH;
            const visualH = imgW;
            const marginLeft = -(imgW - imgH) / 2;
            const marginTop = (imgW - imgH) / 2;
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
                        width: imgW,
                        height: imgH,
                        marginLeft,
                        marginTop,
                        transform: "rotate(90deg)",
                    },
                }),
            );
        }

        // Portrait / square: fit to col width first, then cap height.
        let w = col;
        let h = col * (nH / nW);
        if (h > maxH) {
            h = maxH;
            w = maxH * (nW / nH);
        }
        return React.createElement(Image, {
            key: idx,
            src: url,
            style: {
                width: w,
                height: h,
                borderRadius: 2,
                marginBottom: 4,
            },
        });
    };

    return React.createElement(
        View,
        { style: { flexDirection: "row", gap: 8, marginBottom: 8 } },
        // Left: Foto Sebelum
        hasBefore
            ? React.createElement(
                  View,
                  { style: { width: BEFORE_AFTER_COL_WIDTH } },
                  React.createElement(
                      Text,
                      { style: styles.completionSubLabel },
                      "Foto Sebelum",
                  ),
                  ...beforeUrls.map(renderColPhoto),
              )
            : null,
        // Right: Foto Sesudah
        hasAfter
            ? React.createElement(
                  View,
                  { style: { width: BEFORE_AFTER_COL_WIDTH } },
                  React.createElement(
                      Text,
                      { style: styles.completionSubLabel },
                      "Foto Sesudah",
                  ),
                  ...afterUrls.map(renderColPhoto),
              )
            : null,
    );
}

/**
 * Renders receipt (nota/struk) photos in a table layout.
 * Each photo gets a header cell showing the material store name + city.
 * Photos are laid out in 2 columns per row.
 */
function renderNotaTable(
    receiptUrls: string[],
    materialStores: Array<{ name: string; city: string }> | undefined,
    dimensionMap: Map<string, { width: number; height: number }>,
) {
    if (!receiptUrls || receiptUrls.length === 0) return null;
    const colWidth = BEFORE_AFTER_COL_WIDTH;
    const maxH = BEFORE_AFTER_MAX_HEIGHT;

    const renderPhoto = (url: string) => {
        const dims = dimensionMap.get(url);
        const nW = dims?.width ?? 4;
        const nH = dims?.height ?? 3;
        if (nW > nH) {
            let imgH = colWidth;
            let imgW = colWidth * (nW / nH);
            if (imgW > maxH) {
                imgW = maxH;
                imgH = maxH * (nH / nW);
            }
            const marginLeft = -(imgW - imgH) / 2;
            const marginTop = (imgW - imgH) / 2;
            return React.createElement(
                View,
                {
                    style: {
                        width: imgH,
                        height: imgW,
                        overflow: "hidden",
                        borderRadius: 2,
                    },
                },
                React.createElement(Image, {
                    src: url,
                    style: {
                        width: imgW,
                        height: imgH,
                        marginLeft,
                        marginTop,
                        transform: "rotate(90deg)",
                    },
                }),
            );
        }
        let w = colWidth;
        let h = colWidth * (nH / nW);
        if (h > maxH) {
            h = maxH;
            w = maxH * (nW / nH);
        }
        return React.createElement(Image, {
            src: url,
            style: { width: w, height: h, borderRadius: 2 },
        });
    };

    const pairs: string[][] = [];
    for (let i = 0; i < receiptUrls.length; i += 2) {
        pairs.push(receiptUrls.slice(i, i + 2));
    }

    return React.createElement(
        View,
        { wrap: false, style: { marginBottom: 8 } },
        React.createElement(
            Text,
            { style: styles.completionSubLabel },
            "Nota / Struk Belanja",
        ),
        ...pairs.map((pair, pairIdx) =>
            React.createElement(
                View,
                {
                    key: pairIdx,
                    style: {
                        flexDirection: "row",
                        gap: 8,
                        marginBottom: 6,
                        alignItems: "flex-start",
                    },
                },
                ...pair.map((url, colIdx) => {
                    const store = materialStores?.[pairIdx * 2 + colIdx];
                    return React.createElement(
                        View,
                        { key: colIdx, style: { width: colWidth } },
                        store
                            ? React.createElement(
                                  View,
                                  { style: styles.notaTableHeader },
                                  React.createElement(
                                      Text,
                                      { style: styles.notaTableStoreName },
                                      store.name,
                                  ),
                                  React.createElement(
                                      Text,
                                      { style: styles.notaTableStoreCity },
                                      store.city,
                                  ),
                              )
                            : null,
                        renderPhoto(url),
                    );
                }),
            ),
        ),
    );
}

function renderRealisasiTable(
    realisasiItems: RealisasiItemJson[],
    estimations: MaterialEstimationJson[],
    itemId: string,
) {
    const itemEstimations = estimations.filter((e) => e.itemId === itemId);
    const realisasiTotal = realisasiItems.reduce(
        (sum, r) => sum + r.quantity * r.price,
        0,
    );
    const estimasiTotal = itemEstimations.reduce(
        (sum, e) => sum + e.totalPrice,
        0,
    );

    return React.createElement(
        View,
        { style: { marginBottom: 8 } },
        React.createElement(
            View,
            { style: styles.completionTable },
            // Header — same red style as main table
            React.createElement(
                View,
                { style: styles.completionTableHeader },
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "38%",
                        },
                    },
                    "Material",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "10%",
                            textAlign: "center",
                        },
                    },
                    "Jumlah",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "10%",
                        },
                    },
                    "Satuan",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "14%",
                            textAlign: "right",
                        },
                    },
                    "Harga Est.",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "14%",
                            textAlign: "right",
                        },
                    },
                    "Harga Real.",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.completionTableHeaderCell,
                            width: "14%",
                            textAlign: "right",
                        },
                    },
                    "Subtotal",
                ),
            ),
            // Data rows with alternating style
            ...realisasiItems.map((r, i) => {
                const est = itemEstimations[i];
                return React.createElement(
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
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "38%",
                            },
                        },
                        r.materialName,
                    ),
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "10%",
                                textAlign: "center",
                            },
                        },
                        String(r.quantity),
                    ),
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "10%",
                            },
                        },
                        r.unit,
                    ),
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "14%",
                                textAlign: "right",
                                color: "#6b7280",
                            },
                        },
                        est ? formatCurrency(est.price) : "—",
                    ),
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "14%",
                                textAlign: "right",
                            },
                        },
                        formatCurrency(r.price),
                    ),
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...styles.completionTableCell,
                                width: "14%",
                                textAlign: "right",
                                fontFamily: "Helvetica-Bold",
                            },
                        },
                        formatCurrency(r.quantity * r.price),
                    ),
                );
            }),
            // Total Estimasi row
            React.createElement(
                View,
                { style: styles.completionTotalRow },
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.totalLabel,
                            width: "86%",
                            fontSize: 8,
                        },
                    },
                    "Total Estimasi",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.totalValue,
                            width: "14%",
                            fontSize: 8,
                            color: "#374151",
                        },
                    },
                    formatCurrency(estimasiTotal),
                ),
            ),
            // Total Realisasi row
            React.createElement(
                View,
                { style: { ...styles.completionTotalRow, marginTop: 2 } },
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.totalLabel,
                            width: "86%",
                            fontSize: 8,
                        },
                    },
                    "Total Realisasi",
                ),
                React.createElement(
                    Text,
                    {
                        style: {
                            ...styles.totalValue,
                            width: "14%",
                            fontSize: 8,
                        },
                    },
                    formatCurrency(realisasiTotal),
                ),
            ),
        ),
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
            React.createElement(
                View,
                { style: styles.section },
                React.createElement(
                    Text,
                    { style: styles.sectionTitle },
                    "Checklist Kondisi Toko",
                ),
                React.createElement(
                    View,
                    { style: styles.table },
                    // Table Header
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
                            "Kode",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...styles.tableHeaderCell,
                                    width: "35%",
                                },
                            },
                            "Item",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...styles.tableHeaderCell,
                                    width: "20%",
                                },
                            },
                            "Kondisi",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...styles.tableHeaderCell,
                                    width: "20%",
                                },
                            },
                            "Handler",
                        ),
                        React.createElement(
                            Text,
                            {
                                style: {
                                    ...styles.tableHeaderCell,
                                    width: "20%",
                                },
                            },
                            "Catatan",
                        ),
                    ),
                    // Table Rows grouped by category
                    ...Object.entries(itemGroups).flatMap(
                        ([category, items], catIdx) => [
                            React.createElement(
                                View,
                                {
                                    key: `cat-${catIdx}`,
                                    style: styles.categoryRow,
                                },
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...styles.categoryCell,
                                            width: "100%",
                                        },
                                    },
                                    category,
                                ),
                            ),
                            ...items.map((item, itemIdx) => {
                                const rowStyle =
                                    itemIdx % 2 === 0
                                        ? styles.tableRow
                                        : styles.tableRowAlt;
                                const cStyle = conditionStyle(
                                    item.condition,
                                    item.preventiveCondition,
                                );
                                return React.createElement(
                                    View,
                                    {
                                        key: `item-${catIdx}-${itemIdx}`,
                                        style: rowStyle,
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
                                        item.itemId,
                                    ),
                                    React.createElement(
                                        Text,
                                        {
                                            style: {
                                                ...styles.tableCell,
                                                width: "35%",
                                            },
                                        },
                                        item.itemName,
                                    ),
                                    React.createElement(
                                        Text,
                                        {
                                            style: {
                                                ...styles.tableCell,
                                                width: "20%",
                                                ...cStyle,
                                            },
                                        },
                                        conditionLabel(
                                            item.condition,
                                            item.preventiveCondition,
                                        ),
                                    ),
                                    React.createElement(
                                        Text,
                                        {
                                            style: {
                                                ...styles.tableCell,
                                                width: "20%",
                                            },
                                        },
                                        item.handler ?? "-",
                                    ),
                                    React.createElement(
                                        Text,
                                        {
                                            style: {
                                                ...styles.tableCell,
                                                width: "20%",
                                            },
                                        },
                                        item.notes || "-",
                                    ),
                                );
                            }),
                        ],
                    ),
                ),
            ),

            // Estimasi BMS Section (only if there are estimations)
            data.estimations.length > 0
                ? React.createElement(
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
                  )
                : null,

            // Completion Detail Section
            (() => {
                const completionItems = data.items.filter(
                    (i) =>
                        (i.condition === "RUSAK" ||
                            i.preventiveCondition === "NOT_OK") &&
                        (i.afterImages?.length ||
                            i.realisasiItems?.length ||
                            i.receiptImages?.length),
                );
                if (
                    completionItems.length === 0 &&
                    data.completionSelfieUrls.length === 0 &&
                    data.startReceiptUrls.length === 0
                )
                    return null;

                return React.createElement(
                    View,
                    { break: true, style: styles.section },
                    React.createElement(
                        Text,
                        { style: styles.sectionTitle },
                        "Detail Penyelesaian Pekerjaan",
                    ),

                    // Per-item blocks
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

                            // Foto Sebelum & Sesudah side by side
                            renderBeforeAfterRow(
                                (item.images ??
                                    [item.photoUrl].filter(
                                        Boolean,
                                    )) as string[],
                                item.afterImages ?? [],
                                dimensionMap,
                            ),

                            // Realisasi biaya
                            item.realisasiItems &&
                                item.realisasiItems.length > 0
                                ? React.createElement(
                                      View,
                                      { wrap: false },
                                      React.createElement(
                                          Text,
                                          { style: styles.completionSubLabel },
                                          "Realisasi Biaya",
                                      ),
                                      renderRealisasiTable(
                                          item.realisasiItems,
                                          data.estimations,
                                          item.itemId,
                                      ),
                                  )
                                : null,

                            // Nota / struk belanja — store info as table header
                            renderNotaTable(
                                item.receiptImages ?? [],
                                item.materialStores,
                                dimensionMap,
                            ),

                            // Catatan item
                            item.completionNotes
                                ? React.createElement(
                                      View,
                                      {
                                          wrap: false,
                                          style: styles.completionNoteBox,
                                      },
                                      React.createElement(
                                          Text,
                                          { style: styles.completionNoteText },
                                          item.completionNotes,
                                      ),
                                  )
                                : null,
                        ),
                    ),

                    // Foto Selfie BMS
                    data.completionSelfieUrls.length > 0
                        ? React.createElement(
                              View,
                              { wrap: false, style: styles.selfieSection },
                              renderPhotoGrid(
                                  data.completionSelfieUrls,
                                  "Foto Selfie BMS",
                                  dimensionMap,
                                  BEFORE_AFTER_MAX_HEIGHT,
                              ),
                          )
                        : null,

                    // Nota / Struk Belanja — halaman baru jika selfie sudah ada
                    data.startReceiptUrls.length > 0
                        ? React.createElement(
                              View,
                              {
                                  wrap: false,
                                  style: styles.selfieSection,
                                  ...(data.completionSelfieUrls.length > 0
                                      ? { break: true }
                                      : {}),
                              },
                              renderPhotoGrid(
                                  data.startReceiptUrls,
                                  "Nota / Struk Belanja",
                                  dimensionMap,
                                  BEFORE_AFTER_MAX_HEIGHT,
                              ),
                              // Completion notes ditempatkan setelah nota
                              data.completionNotes
                                  ? React.createElement(
                                        View,
                                        {
                                            style: {
                                                ...styles.completionNoteBox,
                                                marginTop: 6,
                                            },
                                        },
                                        React.createElement(
                                            Text,
                                            {
                                                style: styles.completionNoteText,
                                            },
                                            data.completionNotes,
                                        ),
                                    )
                                  : null,
                          )
                        : data.completionNotes
                          ? React.createElement(
                                View,
                                { wrap: false, style: styles.selfieSection },
                                React.createElement(
                                    View,
                                    {
                                        style: {
                                            ...styles.completionNoteBox,
                                            marginTop: 6,
                                        },
                                    },
                                    React.createElement(
                                        Text,
                                        { style: styles.completionNoteText },
                                        data.completionNotes,
                                    ),
                                ),
                            )
                          : null,
                );
            })(),

            // Approval Section — only shown when relevant stamps exist
            data.approval.stamps.length > 0
                ? React.createElement(
                      View,
                      { style: styles.section },
                      React.createElement(
                          Text,
                          { style: styles.sectionTitle },
                          "Persetujuan",
                      ),
                      React.createElement(
                          View,
                          { style: styles.stampSectionContent },
                          ...data.approval.stamps.map((stamp, idx) =>
                              renderStampBox(stamp, idx),
                          ),
                      ),
                  )
                : null,

            // Footer
            React.createElement(
                View,
                { style: styles.footer, fixed: true },
                React.createElement(
                    Text,
                    { style: styles.footerText },
                    `SPARTA Maintenance — ${data.reportNumber}`,
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
        ...data.items.flatMap((item) => [
            ...(item.images ?? (item.photoUrl ? [item.photoUrl] : [])),
            ...(item.afterImages ?? []),
            ...(item.receiptImages ?? []),
        ]),
    ].filter(Boolean);

    // Probe actual pixel dimensions of all photos concurrently (reads only image headers)
    const uniqueUrls = [...new Set(allUrls)];
    const probeResults = await Promise.all(
        uniqueUrls.map(async (url) => {
            try {
                const result = await probe(url);
                return [
                    url,
                    { width: result.width, height: result.height },
                ] as const;
            } catch {
                // Default to landscape 4:3 on failure — rotation will be applied
                return [url, { width: 4, height: 3 }] as const;
            }
        }),
    );
    const dimensionMap = new Map<string, { width: number; height: number }>(
        probeResults,
    );

    const doc = buildReportDocument(data, dimensionMap);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}

export { groupEstimationsByItemId };
