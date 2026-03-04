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
    // Stamp Styles
    stampSectionContent: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    stampOuter: {
        width: 210,
        borderWidth: 2,
        borderStyle: "solid",
        padding: 2,
    },
    stampInner: {
        borderWidth: 1,
        borderStyle: "solid",
    },
    stampHeader: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    stampHeaderText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#ffffff",
        textAlign: "center",
    },
    stampBody: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: "center",
    },
    stampName: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        textAlign: "center",
        color: "#111827",
        marginBottom: 2,
    },
    stampNik: {
        fontSize: 7.5,
        color: "#374151",
        textAlign: "center",
        marginBottom: 2,
    },
    stampDate: {
        fontSize: 7.5,
        color: "#374151",
        textAlign: "center",
    },
    stampPendingText: {
        fontSize: 8,
        fontFamily: "Helvetica-Oblique",
        color: "#9ca3af",
        textAlign: "center",
    },
    stampNoteWrapper: {
        borderTopWidth: 0.5,
        borderTopStyle: "solid",
        borderTopColor: "#d1d5db",
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    stampNote: {
        fontSize: 7,
        fontFamily: "Helvetica-Oblique",
        color: "#6b7280",
        textAlign: "center",
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
    storeCode: string;
    branchName: string;
    submittedBy: string;
    submittedAt: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    alfamartLogoBase64: string;
    buildingLogoBase64: string;
    approval: {
        reportStatus: string;
        approverName?: string;
        approverNIK?: string;
        approvedAt?: string;
        notes?: string;
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

type StampConfig = { label: string; color: string; notesLabel: string };

function getStampConfig(reportStatus: string): StampConfig {
    switch (reportStatus) {
        case "DRAFT":
            return { label: "Draft", color: "#6b7280", notesLabel: "Catatan:" };
        case "PENDING_ESTIMATION":
            return {
                label: "Menunggu Persetujuan Estimasi",
                color: "#6b7280",
                notesLabel: "Catatan:",
            };
        case "ESTIMATION_APPROVED":
            return {
                label: "Estimasi Disetujui BMC",
                color: "#16a34a",
                notesLabel: "Catatan Persetujuan:",
            };
        case "ESTIMATION_REJECTED":
            return {
                label: "Estimasi Ditolak BMC",
                color: "#dc2626",
                notesLabel: "Alasan Penolakan:",
            };
        case "ESTIMATION_REJECTED_REVISION":
            return {
                label: "Estimasi Ditolak — Perlu Revisi",
                color: "#d97706",
                notesLabel: "Catatan Revisi:",
            };
        case "IN_PROGRESS":
            return {
                label: "Pekerjaan Berlangsung",
                color: "#2563eb",
                notesLabel: "Catatan:",
            };
        case "PENDING_REVIEW":
            return {
                label: "Menunggu Review Penyelesaian",
                color: "#7c3aed",
                notesLabel: "Catatan:",
            };
        case "REVIEW_REJECTED_REVISION":
            return {
                label: "Review Ditolak — Perlu Revisi",
                color: "#d97706",
                notesLabel: "Catatan Revisi:",
            };
        case "APPROVED_BMC":
            return {
                label: "Penyelesaian Disetujui BMC",
                color: "#16a34a",
                notesLabel: "Catatan Persetujuan:",
            };
        case "COMPLETED":
            return {
                label: "Disetujui BNM Manager",
                color: "#0369a1",
                notesLabel: "Catatan Persetujuan:",
            };
        default:
            return {
                label: reportStatus,
                color: "#6b7280",
                notesLabel: "Catatan:",
            };
    }
}

function buildReportDocument(data: ReportPdfData) {
    const itemGroups = groupItemsByCategory(data.items);
    const rusakItems = data.items.filter(
        (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
    );

    const stampConfig = getStampConfig(data.approval.reportStatus);
    const stampColor = stampConfig.color;
    const hasApproverInfo = !!(
        data.approval.approverName && data.approval.approvedAt
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

            // Approval Section
            React.createElement(
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
                    React.createElement(
                        View,
                        {
                            style: {
                                ...styles.stampOuter,
                                borderColor: stampColor,
                            },
                        },
                        React.createElement(
                            View,
                            {
                                style: {
                                    ...styles.stampInner,
                                    borderColor: stampColor,
                                },
                            },
                            // Header strip
                            React.createElement(
                                View,
                                {
                                    style: {
                                        ...styles.stampHeader,
                                        backgroundColor: stampColor,
                                    },
                                },
                                React.createElement(
                                    Text,
                                    { style: styles.stampHeaderText },
                                    stampConfig.label.toUpperCase(),
                                ),
                            ),
                            // Body: approver details or pending placeholder
                            hasApproverInfo
                                ? React.createElement(
                                      View,
                                      { style: styles.stampBody },
                                      React.createElement(
                                          Text,
                                          { style: styles.stampName },
                                          data.approval.approverName!,
                                      ),
                                      React.createElement(
                                          Text,
                                          { style: styles.stampNik },
                                          `NIK: ${data.approval.approverNIK ?? "—"}`,
                                      ),
                                      React.createElement(
                                          Text,
                                          { style: styles.stampDate },
                                          data.approval.approvedAt!,
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
                            // Optional rejection/revision notes
                            data.approval.notes
                                ? React.createElement(
                                      View,
                                      { style: styles.stampNoteWrapper },
                                      React.createElement(
                                          Text,
                                          { style: styles.stampNote },
                                          `${stampConfig.notesLabel} ${data.approval.notes}`,
                                      ),
                                  )
                                : null,
                        ),
                    ),
                ),
            ),

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
