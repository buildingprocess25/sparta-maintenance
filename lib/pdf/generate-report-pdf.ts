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
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

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

export type ReportPdfData = {
    reportNumber: string;
    storeName: string;
    branchName: string;
    submittedBy: string;
    submittedAt: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    alfamartLogoBase64: string;
    buildingLogoBase64: string;
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

function buildReportDocument(data: ReportPdfData) {
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
                        ["Nomor Tiket", data.reportNumber],
                        ["Toko", data.storeName],
                        ["Cabang", data.branchName],
                        ["Disubmit oleh", data.submittedBy],
                        ["Tanggal Submit", data.submittedAt],
                        ["Total Item Dicek", `${data.items.length} item`],
                        ["Item Rusak / Not OK", `${rusakItems.length} item`],
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
                    "Checklist Perbaikan",
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
                            "No",
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
                            "Keterangan",
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
                                        "-",
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
                                  "No",
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
                                  "Qty",
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
    const doc = buildReportDocument(data);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}

export { groupEstimationsByItemId };
