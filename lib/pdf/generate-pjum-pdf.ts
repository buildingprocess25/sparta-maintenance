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

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 32,
        paddingBottom: 40,
        paddingHorizontal: 36,
        color: "#111827",
    },
    docTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: "#c0392b",
        marginBottom: 14,
        textAlign: "center",
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 14,
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 10,
    },
    infoItem: {
        width: "50%",
        marginBottom: 4,
    },
    infoLabel: {
        fontSize: 7,
        color: "#6b7280",
        marginBottom: 1,
    },
    infoValue: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#c0392b",
        borderRadius: 2,
        marginBottom: 2,
    },
    tableRow: {
        flexDirection: "row",
        borderBottom: "1px solid #f3f4f6",
        minHeight: 26,
        alignItems: "center",
    },
    tableRowAlt: {
        backgroundColor: "#fafafa",
    },
    thCell: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
        paddingHorizontal: 6,
        paddingVertical: 5,
    },
    tdCell: {
        fontSize: 8,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    // Column widths
    colNo: { width: 22 },
    colDate: { width: 68 },
    colReportNumber: { width: 95 },
    colStore: { flex: 1 },
    colTotal: { width: 80, textAlign: "right" },
    totalRow: {
        flexDirection: "row",
        borderTop: "2px solid #c0392b",
        marginTop: 4,
        paddingTop: 5,
    },
    totalLabel: {
        flex: 1,
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        textAlign: "right",
        paddingRight: 6,
    },
    totalValue: {
        width: 80,
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#c0392b",
        textAlign: "right",
    },
    // Stamp
    stampSection: {
        marginTop: 24,
        flexDirection: "row",
        justifyContent: "center",
    },
    stampBox: {
        width: 160,
        overflow: "hidden",
    },
    stampBadge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 3,
        backgroundColor: "#2563eb",
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
    stampRoleWrapper: {
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    stampRole: {
        fontSize: 7,
        color: "#374151",
        textAlign: "center",
    },
    footer: {
        position: "absolute",
        bottom: 20,
        left: 36,
        right: 36,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTop: "1px solid #e5e7eb",
        paddingTop: 5,
    },
    footerText: { fontSize: 7, color: "#9ca3af", fontStyle: "italic" },
});

function fmtCurrency(amount: number) {
    return `Rp ${Number(amount).toLocaleString("id-ID")}`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export type PjumPdfRow = {
    reportNumber: string;
    createdAt: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    totalRealisasi: number;
};

export type PjumPdfData = {
    bmsName: string;
    bmsNIK: string;
    bmcName: string;
    bmcNIK: string;
    branchName: string;
    from: string;
    to: string;
    weekNumber: number;
    exportedAt: string;
    reports: PjumPdfRow[];
};

function buildPjumDocument(data: PjumPdfData) {
    const totalAll = data.reports.reduce((s, r) => s + r.totalRealisasi, 0);
    const exportedDate = fmtDate(data.exportedAt);

    const tableRows = data.reports.map((r, i) =>
        React.createElement(
            View,
            {
                key: r.reportNumber,
                style:
                    i % 2 === 1
                        ? { ...styles.tableRow, ...styles.tableRowAlt }
                        : styles.tableRow,
            },
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colNo } },
                String(i + 1),
            ),
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colDate } },
                fmtDate(r.createdAt),
            ),
            // Report number
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colReportNumber } },
                r.reportNumber,
            ),
            // Store name (bold) + store code below (smaller, gray)
            React.createElement(
                View,
                { style: { ...styles.tdCell, ...styles.colStore } },
                React.createElement(
                    Text,
                    {
                        style: {
                            fontFamily: "Helvetica-Bold",
                            fontSize: 8,
                        },
                    },
                    r.storeName || "—",
                ),
                r.storeCode
                    ? React.createElement(
                          Text,
                          { style: { fontSize: 7, color: "#6b7280" } },
                          r.storeCode,
                      )
                    : null,
            ),
            // Total realization
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colTotal } },
                r.totalRealisasi > 0 ? fmtCurrency(r.totalRealisasi) : "—",
            ),
        ),
    );

    return React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            { size: "A4", style: styles.page },

            // ── Document title ──
            React.createElement(
                Text,
                { style: styles.docTitle },
                "REKAPAN LAPORAN MAINTENANCE TOKO",
            ),

            // ── Info grid ──
            React.createElement(
                View,
                { style: styles.infoGrid },
                ...[
                    { label: "Nama BMS", value: data.bmsName },
                    { label: "NIK BMS", value: data.bmsNIK },
                    {
                        label: "Periode",
                        value: `${fmtDate(data.from)} — ${fmtDate(data.to)}`,
                    },
                    {
                        label: "Minggu Ke",
                        value: String(data.weekNumber),
                    },
                    { label: "Area / Cabang", value: data.branchName },
                    {
                        label: "Jumlah Laporan",
                        value: String(data.reports.length),
                    },
                ].map((item) =>
                    React.createElement(
                        View,
                        { key: item.label, style: styles.infoItem },
                        React.createElement(
                            Text,
                            { style: styles.infoLabel },
                            item.label,
                        ),
                        React.createElement(
                            Text,
                            { style: styles.infoValue },
                            item.value,
                        ),
                    ),
                ),
            ),

            // ── Table header ──
            React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colNo } },
                    "No",
                ),
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colDate } },
                    "Tanggal",
                ),
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colReportNumber } },
                    "No. Laporan",
                ),
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colStore } },
                    "Nama Toko",
                ),
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colTotal } },
                    "Total Realisasi",
                ),
            ),

            // ── Table rows ──
            ...tableRows,

            // ── Total row ──
            React.createElement(
                View,
                { style: styles.totalRow },
                React.createElement(
                    Text,
                    { style: styles.totalLabel },
                    "TOTAL",
                ),
                React.createElement(
                    Text,
                    { style: styles.totalValue },
                    fmtCurrency(totalAll),
                ),
            ),

            // ── Stamp (DIBUAT OLEH BMC) ──
            React.createElement(
                View,
                { style: styles.stampSection },
                React.createElement(
                    View,
                    { style: styles.stampBox },
                    React.createElement(
                        View,
                        { style: styles.stampBadge },
                        React.createElement(
                            Text,
                            { style: styles.stampBadgeText },
                            "DIBUAT OLEH",
                        ),
                    ),
                    React.createElement(
                        View,
                        { style: styles.stampBody },
                        React.createElement(
                            Text,
                            { style: styles.stampName },
                            data.bmcName,
                        ),
                        React.createElement(
                            Text,
                            { style: styles.stampNik },
                            `NIK: ${data.bmcNIK}`,
                        ),
                        React.createElement(
                            Text,
                            { style: styles.stampDate },
                            exportedDate,
                        ),
                    ),
                    React.createElement(
                        View,
                        { style: styles.stampRoleWrapper },
                        React.createElement(
                            Text,
                            { style: styles.stampRole },
                            "Branch Maintenance Coordinator",
                        ),
                    ),
                ),
            ),

            // ── Footer ──
            React.createElement(
                View,
                { style: styles.footer, fixed: true },
                React.createElement(
                    Text,
                    { style: styles.footerText },
                    `Dokumen ini di generate otomatis oleh sistem SPARTA Maintenance`,
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

export async function generatePjumPdf(data: PjumPdfData): Promise<Buffer> {
    const doc = buildPjumDocument(data);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}
