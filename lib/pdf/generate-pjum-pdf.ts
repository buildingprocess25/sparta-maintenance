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
    headerLogoAlfamart: { width: 60, height: 34 },
    headerDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 10,
    },
    headerTextGroup: { marginLeft: 8, flexDirection: "column" },
    headerTitle: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
        letterSpacing: 1.5,
    },
    headerSubtitle: {
        fontSize: 7,
        color: "rgba(255,255,255,0.7)",
    },
    docTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: "#c0392b",
        marginBottom: 2,
        textAlign: "center",
    },
    docSubtitle: {
        fontSize: 9,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 14,
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
    colDate: { width: 60 },
    colStore: { flex: 1 },
    colStatus: { width: 70 },
    colTotal: { width: 80, textAlign: "right" },
    colPjum: { width: 38, textAlign: "center" },
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
    footerText: { fontSize: 7, color: "#9ca3af" },
});

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_ESTIMATION: "Menunggu Estimasi",
    ESTIMATION_APPROVED: "Estimasi Disetujui",
    ESTIMATION_REJECTED_REVISION: "Revisi Estimasi",
    ESTIMATION_REJECTED: "Estimasi Ditolak",
    IN_PROGRESS: "Sedang Dikerjakan",
    PENDING_REVIEW: "Menunggu Review",
    REVIEW_REJECTED_REVISION: "Revisi Pekerjaan",
    COMPLETED: "Selesai",
};

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
    totalEstimation: number;
};

export type PjumPdfData = {
    bmsName: string;
    bmsNIK: string;
    bmcName: string;
    branchName: string;
    from: string;
    to: string;
    exportedAt: string;
    reports: PjumPdfRow[];
    alfamartLogoBase64: string;
};

function buildPjumDocument(data: PjumPdfData) {
    const totalAll = data.reports.reduce((s, r) => s + r.totalEstimation, 0);

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
                    r.storeCode
                        ? `${r.storeCode} — ${r.storeName}`
                        : r.storeName || "—",
                ),
                React.createElement(
                    Text,
                    { style: { fontSize: 7, color: "#6b7280" } },
                    r.reportNumber,
                ),
            ),
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colStatus } },
                STATUS_LABELS[r.status] ?? r.status,
            ),
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colTotal } },
                r.totalEstimation > 0 ? fmtCurrency(r.totalEstimation) : "—",
            ),
        ),
    );

    return React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            { size: "A4", style: styles.page },
            // ── Header ──
            React.createElement(
                View,
                { style: styles.header, fixed: true },
                data.alfamartLogoBase64
                    ? React.createElement(Image, {
                          src: `data:image/png;base64,${data.alfamartLogoBase64}`,
                          style: styles.headerLogoAlfamart,
                      })
                    : null,
                React.createElement(View, { style: styles.headerDivider }),
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
                        "Sistem Pelaporan dan Tracking Aset Maintenance",
                    ),
                ),
            ),

            // ── Document title ──
            React.createElement(
                Text,
                { style: styles.docTitle },
                "PERTANGGUNGJAWABAN UANG MUKA (PJUM)",
            ),
            React.createElement(
                Text,
                { style: styles.docSubtitle },
                `Dicetak pada ${fmtDate(data.exportedAt)}`,
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
                    { label: "Area / Cabang", value: data.branchName },
                    { label: "Dibuat oleh", value: data.bmcName },
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
                    { style: { ...styles.thCell, ...styles.colStore } },
                    "Kode & Nama Toko / No. Laporan",
                ),
                React.createElement(
                    Text,
                    { style: { ...styles.thCell, ...styles.colStatus } },
                    "Status",
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

            // ── Footer ──
            React.createElement(
                View,
                { style: styles.footer, fixed: true },
                React.createElement(
                    Text,
                    { style: styles.footerText },
                    `SPARTA Maintenance — PJUM`,
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
