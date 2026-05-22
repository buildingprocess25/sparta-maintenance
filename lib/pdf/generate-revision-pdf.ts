import "server-only";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RevisionPdfData = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    bmsName: string;
    bmsNIK: string;
    revisedByName: string;
    revisedByNIK: string;
    revisedAt: string; // ISO string
    alasanIntervensi: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    totalReal: number;
    finishedAt?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
}

function fmtDatetime(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — same color scheme as generate-report-pdf.ts (#0069a7 blue)
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 32,
        paddingBottom: 40,
        paddingHorizontal: 36,
        color: "#111827",
    },

    // Section — same as report PDF
    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#0069a7",
        marginBottom: 6,
        paddingBottom: 3,
        borderBottom: "1px solid #f5c6c2",
    },

    // Warning badge
    warningBadge: {
        backgroundColor: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 4,
        padding: "6 10",
        marginBottom: 16,
    },
    warningText: {
        fontSize: 7.5,
        color: "#92400e",
        fontFamily: "Helvetica-Bold",
        textAlign: "center",
        letterSpacing: 0.5,
    },

    // Alasan intervensi box
    alasanBox: {
        backgroundColor: "#eff6ff",
        borderLeft: "3px solid #0069a7",
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginTop: 6,
    },
    alasanText: {
        fontSize: 8,
        color: "#1e3a5f",
    },

    // Info grid
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
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

    // Per-item block — same as report PDF completionItemHeader
    itemBlock: { marginBottom: 10 },
    itemHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginBottom: 4,
        borderLeft: "3px solid #0069a7",
    },
    itemTitle: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#111827",
    },
    itemId: {
        fontSize: 7,
        color: "#9ca3af",
        marginLeft: 6,
    },
    subLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#6b7280",
        marginBottom: 3,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    // Realisasi table — same as report PDF completionTable
    table: { width: "100%", marginBottom: 4 },
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
    },
    tableRowAlt: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        backgroundColor: "#f9fafb",
        minHeight: 14,
        alignItems: "center",
    },
    tableCell: {
        fontSize: 7,
        padding: "3 6",
        color: "#374151",
    },

    // Note box
    noteBox: {
        backgroundColor: "#fffbeb",
        borderLeft: "3px solid #d97706",
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 6,
    },
    noteText: {
        fontSize: 7.5,
        color: "#92400e",
        fontFamily: "Helvetica-Oblique",
    },

    // Total
    totalRow: {
        flexDirection: "row",
        backgroundColor: "#e0f2fe",
        borderRadius: 2,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#0069a7",
        padding: "5 6",
    },
    totalValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#0069a7",
        padding: "5 6",
        textAlign: "right",
    },

    // Grand total
    grandTotalRow: {
        flexDirection: "row",
        backgroundColor: "#0069a7",
        borderRadius: 2,
        marginTop: 8,
    },
    grandTotalLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#ffffff",
        padding: "6 6",
    },
    grandTotalValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#ffffff",
        padding: "6 6",
        textAlign: "right",
    },

    // Footer
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
    footerTextRight: {
        fontSize: 7,
        color: "#9ca3af",
        fontStyle: "italic",
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Document builder
// ─────────────────────────────────────────────────────────────────────────────

function buildRevisionDocument(data: RevisionPdfData) {
    const revisedAtFormatted = fmtDatetime(data.revisedAt);

    // Group estimations by itemId for fallback
    const estimationsByItemId: Record<string, MaterialEstimationJson[]> = {};
    for (const est of data.estimations) {
        if (!estimationsByItemId[est.itemId]) {
            estimationsByItemId[est.itemId] = [];
        }
        estimationsByItemId[est.itemId].push(est);
    }

    // Only items that have damage/repair (RUSAK or have realisasi)
    const damagedItems = data.items.filter(
        (item) =>
            item.handler === "BMS" &&
            (item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK" ||
                (item.realisasiItems && item.realisasiItems.length > 0)),
    );

    let grandTotal = 0;

    // Build per-item blocks
    const itemBlocks = damagedItems.map((item) => {
        // Get realisasi rows for this item
        type RealisasiRow = {
            material: string;
            qty: number;
            unit: string;
            harga: number;
            subtotal: number;
        };
        const rows: RealisasiRow[] = [];
        if (item.realisasiItems && item.realisasiItems.length > 0) {
            for (const ri of item.realisasiItems) {
                rows.push({
                    material: ri.materialName,
                    qty: ri.quantity,
                    unit: ri.unit,
                    harga: ri.price,
                    subtotal: ri.totalPrice,
                });
            }
        } else {
            // Fallback: estimations
            const ests = estimationsByItemId[item.itemId] ?? [];
            for (const est of ests) {
                rows.push({
                    material: est.materialName,
                    qty: est.quantity,
                    unit: est.unit,
                    harga: est.price,
                    subtotal: est.totalPrice,
                });
            }
        }

        const discountAmount = Math.max(0, item.discountAmount ?? 0);
        const itemSubtotal = rows.reduce((s, r) => s + r.subtotal, 0);
        const itemTotal = Math.max(0, itemSubtotal - discountAmount);
        grandTotal += itemTotal;

        return React.createElement(
            View,
            { key: item.itemId, style: s.itemBlock },

            // Item header (same as report PDF completionItemHeader)
            React.createElement(
                View,
                { style: s.itemHeader },
                React.createElement(
                    Text,
                    { style: s.itemTitle },
                    item.itemName,
                ),
                React.createElement(
                    Text,
                    { style: s.itemId },
                    `[${item.itemId}] ${item.categoryName}`,
                ),
            ),

            // Catatan item (notes)
            item.notes
                ? React.createElement(
                      View,
                      { style: s.noteBox },
                      React.createElement(
                          Text,
                          { style: s.noteText },
                          `Catatan Inspeksi: ${item.notes}`,
                      ),
                  )
                : null,

            // Catatan completion
            (item as ReportItemJson & { completionNotes?: string })
                .completionNotes
                ? React.createElement(
                      View,
                      { style: s.noteBox },
                      React.createElement(
                          Text,
                          { style: s.noteText },
                          `Catatan Penyelesaian: ${(item as ReportItemJson & { completionNotes?: string }).completionNotes}`,
                      ),
                  )
                : null,

            // Realisasi table
            rows.length > 0
                ? React.createElement(
                      View,
                      { style: s.table },
                      // Table header
                      React.createElement(
                          View,
                          { style: s.tableHeader },
                          React.createElement(
                              Text,
                              { style: { ...s.tableHeaderCell, width: "30%" } },
                              "Material",
                          ),
                          React.createElement(
                              Text,
                              {
                                  style: {
                                      ...s.tableHeaderCell,
                                      width: "10%",
                                      textAlign: "center",
                                  },
                              },
                              "Qty",
                          ),
                          React.createElement(
                              Text,
                              {
                                  style: {
                                      ...s.tableHeaderCell,
                                      width: "12%",
                                  },
                              },
                              "Satuan",
                          ),
                          React.createElement(
                              Text,
                              {
                                  style: {
                                      ...s.tableHeaderCell,
                                      width: "24%",
                                      textAlign: "right",
                                  },
                              },
                              "Harga/Sat",
                          ),
                          React.createElement(
                              Text,
                              {
                                  style: {
                                      ...s.tableHeaderCell,
                                      width: "24%",
                                      textAlign: "right",
                                  },
                              },
                              "Subtotal",
                          ),
                      ),
                      // Data rows
                      ...rows.map((row, i) =>
                          React.createElement(
                              View,
                              {
                                  key: i,
                                  style:
                                      i % 2 === 0 ? s.tableRow : s.tableRowAlt,
                              },
                              React.createElement(
                                  Text,
                                  { style: { ...s.tableCell, width: "30%" } },
                                  row.material,
                              ),
                              React.createElement(
                                  Text,
                                  {
                                      style: {
                                          ...s.tableCell,
                                          width: "10%",
                                          textAlign: "center",
                                      },
                                  },
                                  String(row.qty),
                              ),
                              React.createElement(
                                  Text,
                                  { style: { ...s.tableCell, width: "12%" } },
                                  row.unit,
                              ),
                              React.createElement(
                                  Text,
                                  {
                                      style: {
                                          ...s.tableCell,
                                          width: "24%",
                                          textAlign: "right",
                                      },
                                  },
                                  fmtCurrency(row.harga),
                              ),
                              React.createElement(
                                  Text,
                                  {
                                      style: {
                                          ...s.tableCell,
                                          width: "24%",
                                          textAlign: "right",
                                          fontFamily: "Helvetica-Bold",
                                      },
                                  },
                                  fmtCurrency(row.subtotal),
                              ),
                          ),
                      ),
                      discountAmount > 0
                          ? React.createElement(
                                View,
                                {
                                    style:
                                        rows.length % 2 === 0
                                            ? s.tableRow
                                            : s.tableRowAlt,
                                },
                                React.createElement(Text, {
                                    style: { ...s.tableCell, width: "30%" },
                                }),
                                React.createElement(Text, {
                                    style: { ...s.tableCell, width: "10%" },
                                }),
                                React.createElement(Text, {
                                    style: { ...s.tableCell, width: "12%" },
                                }),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...s.tableCell,
                                            width: "24%",
                                            textAlign: "right",
                                            fontFamily: "Helvetica-Bold",
                                        },
                                    },
                                    "Potongan Harga",
                                ),
                                React.createElement(
                                    Text,
                                    {
                                        style: {
                                            ...s.tableCell,
                                            width: "24%",
                                            textAlign: "right",
                                            fontFamily: "Helvetica-Bold",
                                        },
                                    },
                                    `-${fmtCurrency(discountAmount)}`,
                                ),
                            )
                          : null,
                      // Item total
                      React.createElement(
                          View,
                          { style: s.totalRow },
                          React.createElement(
                              Text,
                              { style: { ...s.totalLabel, flex: 1 } },
                              "",
                          ),
                          React.createElement(
                              Text,
                              {
                                  style: {
                                      ...s.totalLabel,
                                      textAlign: "right",
                                  },
                              },
                              "Total Item",
                          ),
                          React.createElement(
                              Text,
                              { style: { ...s.totalValue, width: "24%" } },
                              fmtCurrency(itemTotal),
                          ),
                      ),
                  )
                : React.createElement(
                      View,
                      { style: s.noteBox },
                      React.createElement(
                          Text,
                          { style: s.noteText },
                          "Tidak ada data realisasi untuk item ini.",
                      ),
                  ),
        );
    });

    return React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            { size: "A4", style: s.page },

            // ── INTERVENSI (alasan + info) ──
            React.createElement(
                View,
                { style: s.section },
                React.createElement(
                    Text,
                    { style: s.sectionTitle },
                    "Revisi Laporan Realisasi",
                ),
                // Info Grid
                React.createElement(
                    View,
                    { style: { flexDirection: "row", marginBottom: 8 } },
                    // Info Kiri
                    React.createElement(
                        View,
                        { style: { width: "60%" } },
                        ...[
                            {
                                label: "No. Laporan",
                                value: data.reportNumber,
                            },
                            {
                                label: "Kode Toko",
                                value: data.storeCode || "-",
                            },
                            {
                                label: "Nama Toko",
                                value: data.storeName,
                            },
                            {
                                label: "Cabang",
                                value: data.branchName,
                            },
                            {
                                label: "BMS",
                                value: `${data.bmsName} (${data.bmsNIK})`,
                            },
                        ].map((info) =>
                            React.createElement(
                                View,
                                {
                                    key: info.label,
                                    style: {
                                        flexDirection: "row",
                                        marginBottom: 3,
                                    },
                                },
                                React.createElement(
                                    Text,
                                    { style: { ...s.infoLabel, width: "35%" } },
                                    info.label,
                                ),
                                React.createElement(
                                    Text,
                                    { style: { ...s.infoValue, width: "65%" } },
                                    info.value,
                                ),
                            ),
                        ),
                    ),
                    // Info Kanan
                    React.createElement(
                        View,
                        { style: { width: "40%" } },
                        ...[
                            {
                                label: "Direvisi Oleh",
                                value: `${data.revisedByName} (${data.revisedByNIK})`,
                            },
                            {
                                label: "Tanggal Revisi",
                                value: revisedAtFormatted,
                            },
                        ].map((info) =>
                            React.createElement(
                                View,
                                {
                                    key: info.label,
                                    style: {
                                        flexDirection: "row",
                                        marginBottom: 3,
                                    },
                                },
                                React.createElement(
                                    Text,
                                    { style: { ...s.infoLabel, width: "45%" } },
                                    info.label,
                                ),
                                React.createElement(
                                    Text,
                                    { style: { ...s.infoValue, width: "55%" } },
                                    info.value,
                                ),
                            ),
                        ),
                    ),
                ),

                // Alasan intervensi
                React.createElement(
                    Text,
                    { style: { ...s.subLabel, marginTop: 4, marginBottom: 2 } },
                    "Alasan Revisi",
                ),
                React.createElement(
                    View,
                    { style: s.alasanBox },
                    React.createElement(
                        Text,
                        { style: s.alasanText },
                        data.alasanIntervensi || "(tidak ada keterangan)",
                    ),
                ),
            ),

            // ── Per-item blocks ──
            React.createElement(
                View,
                { style: s.section },
                React.createElement(
                    Text,
                    { style: s.sectionTitle },
                    "Detail Penyelesaian Pekerjaan (Hasil Revisi)",
                ),
                ...itemBlocks,

                // Grand total
                React.createElement(
                    View,
                    { style: s.grandTotalRow },
                    React.createElement(
                        Text,
                        { style: { ...s.grandTotalLabel, flex: 1 } },
                        "TOTAL REALISASI DANA TAKTIS",
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.grandTotalValue, width: "30%" } },
                        fmtCurrency(grandTotal),
                    ),
                ),
            ),

            // ── Footer ──
            React.createElement(
                View,
                { style: s.footer, fixed: true },
                React.createElement(
                    Text,
                    { style: s.footerText },
                    `No. Laporan: ${data.reportNumber} — Dokumen ini di-generate otomatis oleh sistem SPARTA Maintenance`,
                ),
                React.createElement(Text, {
                    style: s.footerTextRight,
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

export async function generateRevisionPdf(
    data: RevisionPdfData,
): Promise<Buffer> {
    const doc = buildRevisionDocument(data);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}
