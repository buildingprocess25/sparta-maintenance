import "server-only";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
    Image,
} from "@react-pdf/renderer";
import React from "react";
import fs from "fs";
import path from "path";
import { JAKARTA_TIME_ZONE } from "@/lib/time";

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
    periodeFrom: string;
    periodeTo: string;
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
        timeZone: JAKARTA_TIME_ZONE,
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

const _assetsDir = path.join(process.cwd(), "public", "assets");
let BUILDING_LOGO_BASE64 = "";
try {
    BUILDING_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Building-Logo.png"))
        .toString("base64");
} catch {}

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
    formRowKeperluan: {
        flexDirection: "row",
        alignItems: "flex-start",
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
        lineHeight: 1.4,
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

    // Watermark
    watermarkContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.12,
        zIndex: -1,
        transform: "rotate(-30deg)",
    },
    watermarkImage: {
        width: 50,
        height: 50,
        marginRight: 8,
    },
    watermarkText: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: "#000",
    },

});

// ─────────────────────────────────────────────────────────────────────────────
// React-PDF Document Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPjumFormDocument(pjum: PjumFormData) {
    const selisih = FIXED_UM - pjum.totalExpenditure;
    const selisihStr =
        selisih >= 0
            ? fmtCurrency(selisih)
            : `(${fmtCurrency(Math.abs(selisih))})`;

    const fromStr = new Date(pjum.periodeFrom).toLocaleDateString("en-GB", { timeZone: JAKARTA_TIME_ZONE }); // DD/MM/YYYY
    const toStr = new Date(pjum.periodeTo).toLocaleDateString("en-GB", { timeZone: JAKARTA_TIME_ZONE });

    const keperluanPjum = `Biaya perbaikan toko minggu ke ${pjum.weekNumber} bulan ${pjum.monthName} ${pjum.year}, 1 BMS a/n ${pjum.bmsName}\nPeriode ${fromStr} s/d ${toStr}`;
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
                    { style: s.formRowKeperluan },
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

                // Watermark
                BUILDING_LOGO_BASE64
                    ? React.createElement(
                          View,
                          { style: s.watermarkContainer },
                          React.createElement(Image, {
                              src: `data:image/png;base64,${BUILDING_LOGO_BASE64}`,
                              style: s.watermarkImage,
                          }),
                          React.createElement(
                              Text,
                              { style: s.watermarkText },
                              "Dokumen dibuat oleh SPARTA",
                          ),
                      )
                    : null,
            ),

            null,
        ),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePjumFormPdf(
    pjum: PjumFormData,
): Promise<Buffer> {
    const doc = buildPjumFormDocument(pjum);
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
}
