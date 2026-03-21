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

// ─────────────────────────────────────────────────────────────────────────────
// Data types
// ─────────────────────────────────────────────────────────────────────────────

export type PjumFormData = {
    /** "minggu ke X bulan Y 20ZZ" — auto-filled */
    weekNumber: number;
    monthName: string;
    year: number;
    /** BMS name (a/n) */
    bmsName: string;
    /** Date PJUM is submitted — ISO string */
    submissionDate: string;
    /** Total pengeluaran (sum of all reports) */
    totalExpenditure: number;
    /** UM fixed = 1.000.000 */
};

export type PumFormData = {
    /** BMS info */
    bmsName: string;
    bmsNIK: string;
    /** Bank transfer info */
    bankAccountNo: string;
    bankAccountName: string;
    bankName: string;
    /** PUM keperluan — manual input by BnM Manager */
    pumWeekNumber: number;
    pumMonth: string;
    pumYear: number;
    /** Branch name (lokasi) */
    branchName: string;
};

const FIXED_UM = 1_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number): string {
    return Number(amount).toLocaleString("id-ID");
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Match tes.html layout faithfully
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 28,
        color: "#000000",
    },

    // ── PJUM Section (top half) ──
    pjumContainer: {
        border: "1.5pt solid #000",
        padding: 14,
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    headerLeft: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
    },
    headerRight: {
        border: "0.5pt solid #000",
        padding: "3pt 8pt",
        fontSize: 7,
    },
    title: {
        textAlign: "center",
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        marginBottom: 14,
    },

    // Form rows
    formRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: 5,
    },
    formLabel: {
        width: 130,
        fontSize: 9,
    },
    formColon: {
        width: 10,
        fontSize: 9,
    },
    formValue: {
        fontSize: 9,
        borderBottom: "0.5pt solid #000",
    },
    formValueNoBorder: {
        fontSize: 9,
    },

    // Amount section
    amountSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    amountLeft: {
        flexDirection: "row",
        width: "55%",
        alignItems: "flex-start",
    },
    amountRight: {
        width: "42%",
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 6,
    },
    amountValue: {
        borderBottom: "0.5pt solid #000",
        width: 110,
        paddingLeft: 4,
        fontSize: 9,
        paddingBottom: 1,
    },

    // Signature section
    sigSection: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    sigTable: {
        flex: 1,
    },
    sigTableRow: {
        flexDirection: "row",
    },
    sigTableCell: {
        flex: 1,
        border: "0.5pt solid #000",
        padding: 4,
        textAlign: "center",
        fontSize: 7,
    },
    sigSpace: {
        height: 50,
    },

    // Attention box
    attention: {
        width: 125,
        fontSize: 8,
        paddingLeft: 6,
    },
    attentionTitle: {
        fontFamily: "Helvetica-Bold",
        marginBottom: 4,
        fontSize: 8,
    },

    // Footer
    pjumFooter: {
        fontSize: 7,
        marginTop: 8,
        lineHeight: 1.4,
    },

    // ── PUM Section (bottom half) ──
    pumContainer: {
        border: "1.5pt solid #000",
        padding: 14,
    },

    // PUM top info
    pumTopInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    pumCol: {
        width: "48%",
    },
    pumRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: 4,
    },
    pumLabel: {
        width: 90,
        fontSize: 9,
    },
    pumLabelRight: {
        width: 105,
        fontSize: 9,
    },
    pumVal: {
        flex: 1,
        borderBottom: "0.5pt solid #000",
        minHeight: 12,
        fontSize: 9,
        paddingBottom: 1,
        paddingLeft: 3,
    },

    // PUM table
    pumTableHeader: {
        flexDirection: "row",
    },
    pumTh: {
        border: "0.5pt solid #000",
        padding: 4,
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        textAlign: "center",
    },
    pumTd: {
        border: "0.5pt solid #000",
        padding: 4,
        fontSize: 8,
        textAlign: "center",
    },
    pumTdLeft: {
        border: "0.5pt solid #000",
        padding: 4,
        fontSize: 8,
        textAlign: "left",
    },
    pumEmptyRow: {
        flexDirection: "row",
    },
    pumEmptyTd: {
        border: "0.5pt solid #000",
        padding: 4,
        height: 16,
    },

    // PUM bottom
    pumBottom: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginTop: 20,
        marginBottom: 8,
    },
    bbkBox: {
        border: "1.5pt solid #000",
        width: 170,
        height: 60,
    },
    bbkTitle: {
        flexDirection: "row",
        borderBottom: "0.5pt solid #000",
        gap: 2,
        padding: 3,
        fontSize: 8,
    },
    sigBlock: {
        textAlign: "center",
        alignItems: "center",
        justifyContent: "space-between",
        height: 72,
        fontSize: 8,
    },
    sigLine: {
        borderBottom: "0.5pt solid #000",
        width: 70,
        textAlign: "center",
        fontSize: 8,
        marginHorizontal: 3,
        fontWeight: "bold",
        letterSpacing: 2,
    },

    // PUM footer
    pumFooterContainer: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    lembarBox: {
        border: "0.5pt solid #000",
        padding: 4,
        fontSize: 7,
        width: 200,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// React-PDF Document Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPjumFormDocument(pjum: PjumFormData, pum: PumFormData) {
    const selisih = FIXED_UM - pjum.totalExpenditure;
    const selisihStr =
        selisih >= 0
            ? fmtCurrency(selisih)
            : `(${fmtCurrency(Math.abs(selisih))})`;

    const keperluanPjum = `Biaya perbaikan toko minggu ke ${pjum.weekNumber} bulan ${pjum.monthName} ${pjum.year}, 1 BMS a/n ${pjum.bmsName}`;
    const keperluanPum = `Biaya Perbaikan toko minggu ke ${pum.pumWeekNumber} Bulan ${pum.pumMonth} ${pum.pumYear} untuk 1 BMS`;

    return React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            { size: "A4", style: s.page },

            // ════════════════════════════════════════════════════════════════
            // TOP: PJUM Form
            // ════════════════════════════════════════════════════════════════
            React.createElement(
                View,
                { style: s.pjumContainer },

                // Header
                React.createElement(
                    View,
                    { style: s.header },
                    React.createElement(
                        Text,
                        { style: s.headerLeft },
                        "PT SUMBER ALFARIA TRIJAYA Tbk",
                    ),
                    React.createElement(
                        View,
                        { style: s.headerRight },
                        React.createElement(Text, {}, "Lembar ke-1 : Finance"),
                        React.createElement(
                            Text,
                            {},
                            "Lembar ke-2 : PJUM/User",
                        ),
                    ),
                ),

                // Title
                React.createElement(
                    Text,
                    { style: s.title },
                    "PERTANGGUNGJAWABAN UANG MUKA (PJUM)",
                ),

                // Form rows
                // Untuk Keperluan
                React.createElement(
                    View,
                    { style: s.formRow },
                    React.createElement(
                        Text,
                        { style: s.formLabel },
                        "Untuk Keperluan",
                    ),
                    React.createElement(Text, { style: s.formColon }, ":"),
                    React.createElement(
                        Text,
                        { style: s.formValueNoBorder },
                        keperluanPjum,
                    ),
                ),

                // Tanggal Penyerahan PJUM
                React.createElement(
                    View,
                    { style: s.formRow },
                    React.createElement(
                        Text,
                        { style: s.formLabel },
                        "Tanggal Penyerahan PJUM",
                    ),
                    React.createElement(Text, { style: s.formColon }, ":"),
                    React.createElement(
                        Text,
                        { style: s.formValue },
                        ` ${fmtDate(pjum.submissionDate)}`,
                    ),
                ),

                // Amount section
                React.createElement(
                    View,
                    { style: s.amountSection },

                    // Left: UM yang diminta
                    React.createElement(
                        View,
                        { style: s.amountLeft },
                        React.createElement(
                            Text,
                            { style: s.formLabel },
                            "UM yang diminta",
                        ),
                        React.createElement(Text, { style: s.formColon }, "="),
                        React.createElement(
                            Text,
                            { style: s.formValue },
                            `Rp. ${fmtCurrency(FIXED_UM)}`,
                        ),
                    ),

                    // Right: totals
                    React.createElement(
                        View,
                        { style: s.amountRight },
                        React.createElement(
                            View,
                            { style: s.amountRow },
                            React.createElement(
                                Text,
                                { style: { fontSize: 9 } },
                                "Total Pengeluaran",
                            ),
                            React.createElement(
                                Text,
                                { style: s.amountValue },
                                `= Rp. ${fmtCurrency(pjum.totalExpenditure)}`,
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.amountRow },
                            React.createElement(
                                Text,
                                { style: { fontSize: 9 } },
                                "Selisih lebih (Kurang)",
                            ),
                            React.createElement(
                                Text,
                                { style: s.amountValue },
                                `= Rp. ${selisihStr}`,
                            ),
                        ),
                    ),
                ),

                // Signature section — 3 columns table + attention box
                React.createElement(
                    View,
                    { style: s.sigSection },

                    // Signature table
                    React.createElement(
                        View,
                        { style: s.sigTable },
                        // Header row
                        React.createElement(
                            View,
                            { style: s.sigTableRow },
                            React.createElement(
                                Text,
                                { style: s.sigTableCell },
                                "Penanggung Jawab UM,",
                            ),
                            React.createElement(
                                View,
                                { style: s.sigTableCell },
                                React.createElement(
                                    Text,
                                    {},
                                    "Atasan Langsung",
                                ),
                                React.createElement(Text, {}, "(Minimal Mng)"),
                            ),
                            React.createElement(
                                View,
                                { style: s.sigTableCell },
                                React.createElement(
                                    Text,
                                    {},
                                    "Account Payable & Disbursement",
                                ),
                                React.createElement(
                                    Text,
                                    {},
                                    "Specialist (HO) atau A/P Staff",
                                ),
                                React.createElement(
                                    Text,
                                    {},
                                    "(Branch) atau A/P Officer (Branch)",
                                ),
                            ),
                        ),
                        // Signature space row (empty — manual signing)
                        React.createElement(
                            View,
                            { style: s.sigTableRow },
                            React.createElement(
                                View,
                                { style: s.sigTableCell },
                                React.createElement(View, {
                                    style: s.sigSpace,
                                }),
                            ),
                            React.createElement(
                                View,
                                { style: s.sigTableCell },
                                React.createElement(View, {
                                    style: s.sigSpace,
                                }),
                            ),
                            React.createElement(
                                View,
                                { style: s.sigTableCell },
                                React.createElement(View, {
                                    style: s.sigSpace,
                                }),
                            ),
                        ),
                    ),

                    // Attention box
                    React.createElement(
                        View,
                        { style: s.attention },
                        React.createElement(
                            Text,
                            { style: s.attentionTitle },
                            "PERHATIAN :",
                        ),
                        React.createElement(
                            Text,
                            {},
                            "1. Setiap PJUM Wajib di sertai bukti/dokumen yang semestinya.",
                        ),
                        React.createElement(
                            Text,
                            { style: { marginTop: 3 } },
                            '2. "Keperluan" pada PJUM harus sama dengan "Keperluan" pada UM.',
                        ),
                    ),
                ),

                // PJUM Footer
                React.createElement(
                    View,
                    { style: s.pjumFooter },
                    React.createElement(
                        Text,
                        {},
                        "NRA : SAT/FRM/AP/002_REV:000_140423",
                    ),
                    React.createElement(
                        Text,
                        { style: { fontFamily: "Helvetica-Bold" } },
                        "Reff : SAT/SOP/AP/001 Prosedur Pertanggungjawaban Uang Muka (PJUM)",
                    ),
                ),
            ),

            // ════════════════════════════════════════════════════════════════
            // BOTTOM: PUM Form
            // ════════════════════════════════════════════════════════════════
            React.createElement(
                View,
                { style: s.pumContainer },

                // Header
                React.createElement(
                    Text,
                    { style: s.headerLeft },
                    "PT SUMBER ALFARIA TRIJAYA Tbk",
                ),

                // Title
                React.createElement(
                    Text,
                    { style: { ...s.title, marginTop: 10 } },
                    "PERMOHONAN UANG MUKA",
                ),

                // Top info — two columns
                React.createElement(
                    View,
                    { style: s.pumTopInfo },

                    // Left column: Nama, NIK, Dept, Tanggal dibutuhkan
                    React.createElement(
                        View,
                        { style: s.pumCol },
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabel },
                                "Nama",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                ` ${pum.bmsName}`,
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabel },
                                "NIK",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                ` ${pum.bmsNIK}`,
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabel },
                                "Dept.",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                "  Bld & Tsm",
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabel },
                                "Tanggal dibutuhkan",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(Text, { style: s.pumVal }, ""),
                        ),
                    ),

                    // Right column: Transfer ke info
                    React.createElement(
                        View,
                        { style: s.pumCol },
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                {
                                    style: {
                                        ...s.pumLabelRight,
                                        textDecoration: "underline",
                                    },
                                },
                                "Transfer ke",
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabelRight },
                                "No. Rekening",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                ` ${pum.bankAccountNo}`,
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabelRight },
                                "Atas Nama di Rekening",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                ` ${pum.bankAccountName}`,
                            ),
                        ),
                        React.createElement(
                            View,
                            { style: s.pumRow },
                            React.createElement(
                                Text,
                                { style: s.pumLabelRight },
                                "Nama Bank",
                            ),
                            React.createElement(Text, {}, ":"),
                            React.createElement(
                                Text,
                                { style: s.pumVal },
                                ` ${pum.bankName}`,
                            ),
                        ),
                    ),
                ),

                // PUM Table
                // Header
                React.createElement(
                    View,
                    { style: s.pumTableHeader },
                    React.createElement(
                        Text,
                        { style: { ...s.pumTh, width: "50%" } },
                        "KEPERLUAN PUM",
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.pumTh, width: "25%" } },
                        "LOKASI",
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.pumTh, width: "25%" } },
                        "NILAI (Rp)",
                    ),
                ),
                // Data row
                React.createElement(
                    View,
                    { style: { flexDirection: "row" } },
                    React.createElement(
                        Text,
                        { style: { ...s.pumTdLeft, width: "50%" } },
                        keperluanPum,
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.pumTd, width: "25%" } },
                        "",
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.pumTd, width: "25%" } },
                        fmtCurrency(FIXED_UM),
                    ),
                ),
                // Empty rows (3)
                ...[0, 1, 2].map((i) =>
                    React.createElement(
                        View,
                        { key: `empty-${i}`, style: s.pumEmptyRow },
                        React.createElement(Text, {
                            style: { ...s.pumEmptyTd, width: "50%" },
                        }),
                        React.createElement(Text, {
                            style: { ...s.pumEmptyTd, width: "25%" },
                        }),
                        React.createElement(Text, {
                            style: { ...s.pumEmptyTd, width: "25%" },
                        }),
                    ),
                ),
                // Total row
                React.createElement(
                    View,
                    { style: { flexDirection: "row" } },
                    React.createElement(
                        Text,
                        {
                            style: {
                                ...s.pumTd,
                                width: "75%",
                                fontFamily: "Helvetica-Bold",
                            },
                        },
                        "TOTAL",
                    ),
                    React.createElement(
                        Text,
                        { style: { ...s.pumTd, width: "25%" } },
                        fmtCurrency(FIXED_UM),
                    ),
                ),

                // Bottom section: BBK box + signatures
                React.createElement(
                    View,
                    { style: s.pumBottom },

                    // BBK box
                    React.createElement(
                        View,
                        { style: s.bbkBox },
                        React.createElement(
                            View,
                            { style: s.bbkTitle },
                            React.createElement(
                                Text,
                                { style: { fontFamily: "Helvetica-Bold" } },
                                "NO. Ref. BBK",
                            ),
                            React.createElement(
                                Text,
                                { style: { fontStyle: "italic", fontSize: 7 } },
                                "(Diisi oleh Dept. TAF)",
                            ),
                        ),
                    ),

                    // Sig block 1: Dibuat Oleh
                    React.createElement(
                        View,
                        { style: s.sigBlock },
                        React.createElement(
                            View,
                            { style: { alignItems: "center" } },
                            React.createElement(
                                Text,
                                { style: { fontFamily: "Helvetica-Bold" } },
                                "Dibuat Oleh,",
                            ),
                            React.createElement(
                                Text,
                                { style: { fontFamily: "Helvetica-Bold" } },
                                "Pemohon Uang Muka",
                            ),
                        ),
                        React.createElement(View, { style: { height: 30 } }),
                        React.createElement(
                            View,
                            {
                                style: {
                                    flexDirection: "row",
                                    alignItems: "center",
                                },
                            },
                            React.createElement(Text, {}, "("),
                            React.createElement(
                                Text,
                                {
                                    style: s.sigLine,
                                },
                                "MII",
                            ),
                            React.createElement(Text, {}, ")"),
                        ),
                    ),

                    // Sig block 2: Menyetujui
                    React.createElement(
                        View,
                        { style: s.sigBlock },
                        React.createElement(
                            View,
                            { style: { alignItems: "center" } },
                            React.createElement(
                                Text,
                                { style: { fontFamily: "Helvetica-Bold" } },
                                "Menyetujui,",
                            ),
                            React.createElement(
                                Text,
                                { style: { fontFamily: "Helvetica-Bold" } },
                                "(Min Manager pemohon PAR)",
                            ),
                        ),
                        React.createElement(View, { style: { height: 30 } }),
                        React.createElement(
                            View,
                            {
                                style: {
                                    flexDirection: "row",
                                    alignItems: "center",
                                },
                            },
                            React.createElement(Text, {}, "("),
                            React.createElement(
                                Text,
                                {
                                    style: s.sigLine,
                                },
                                "KWS",
                            ),
                            React.createElement(Text, {}, ")"),
                        ),
                    ),
                ),

                // PUM footer
                React.createElement(
                    View,
                    { style: s.pumFooterContainer },
                    React.createElement(
                        View,
                        { style: { fontSize: 7 } },
                        React.createElement(
                            Text,
                            {},
                            "NRA : SAT/FRM/FA/013_REV:004_100321",
                        ),
                        React.createElement(
                            Text,
                            { style: { marginTop: 5 } },
                            "Referensi : SAT/SOP/FA/007 Prosedur Permohonan Uang Muka",
                        ),
                    ),
                    React.createElement(
                        View,
                        { style: s.lembarBox },
                        React.createElement(
                            Text,
                            {},
                            "Lembar ke-1 : Accounting (HO/ Br)",
                        ),
                        React.createElement(
                            Text,
                            {},
                            "Lembar ke-2 : Account Payable Disbursement (HO/Br)",
                        ),
                    ),
                ),
            ),
        ),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePjumFormPdf(
    pjum: PjumFormData,
    pum: PumFormData,
): Promise<Buffer> {
    const doc = buildPjumFormDocument(pjum, pum);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}
