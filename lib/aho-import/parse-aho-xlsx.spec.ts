import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";

import { decodeXmlEntities, parseAhoXlsx, parseIrisPrintDate } from "./parse-aho-xlsx";

// ─── Fixture builders ────────────────────────────────────────────────────────

const WORKBOOK_XML =
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan Masalah IRIS" sheetId="1" r:id="rId1"/></sheets></workbook>';
const WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';

const COLS = "ABCDEFGHIJ";
const inline = (ref: string, text: string) =>
    `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
const row = (r: number, cells: string[]) =>
    `<row r="${r}">${cells.map((text, i) => (text === "" ? `<c r="${COLS[i]}${r}"/>` : inline(`${COLS[i]}${r}`, text))).join("")}</row>`;

const HEADER = ["No", "Kode Cabang Existing", "Nama Cabang Existing", "No. Problem", "Kode Toko", "Nama Toko", "Status"];

function sheetXml(rows: string[]) {
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

/** Urutan entri meniru file IRIS asli: sheet1.xml SEBELUM workbook.xml. */
function buildXlsx(sheet: string, extra: Record<string, string> = {}) {
    return zipSync({
        "[Content_Types].xml": strToU8("<Types/>"),
        "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
        "xl/worksheets/sheet1.xml": strToU8(sheet),
        "xl/workbook.xml": strToU8(WORKBOOK_XML),
        ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, strToU8(v)])),
    });
}

const irisSheet = sheetXml([
    row(1, ["Laporan Masalah IRIS (Helpdesk Alfamart)"]),
    row(3, ["Divisi", ": Maintenance &amp; Building"]),
    row(6, ["Tanggal Cetak", ": 26-Oct-2026 - 09:08:52"]),
    row(8, HEADER),
    row(9, ["1", "G001", "DC SIDOARJO", "P-001", "t001", "TOKO A", "Progress"]),
    row(10, ["2", "G001", "SIDOARJO", "P-002", "T002", "TOKO B &amp; C", "Closed"]),
    row(11, ["3", "G002", "DC MALANG", "P-003", "T003", "TOKO É", "new"]),
    row(12, ["4", "", "", "", "T004", "TOKO D", "Progress"]),
    '<row r="13"/>',
    row(14, ["5", "G002", "MALANG", "P-005", "T005", "TOKO E", "Solve"]),
]);

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
    // Helpers
    assert.equal(decodeXmlEntities("A &amp; B &lt;x&gt; &#39;y&#x27;"), "A & B <x> 'y'");
    assert.equal(parseIrisPrintDate(": 26-Oct-2026 - 09:08:52"), "2026-10-26T02:08:52.000Z");
    assert.equal(parseIrisPrintDate("12 Aug 2026 - 10:50:12"), "2026-08-12T03:50:12.000Z");
    assert.equal(parseIrisPrintDate("01-Jan-2026 - 03:00:00"), "2025-12-31T20:00:00.000Z");
    assert.equal(parseIrisPrintDate("bukan tanggal"), null);

    // Format IRIS (inline string), dipush dalam potongan 7 byte untuk menguji
    // batas potongan di tengah tag XML maupun karakter multi-byte.
    for (const chunkSize of [7, 64 * 1024]) {
        const progress: number[] = [];
        const result = await parseAhoXlsx(buildXlsx(irisSheet), {
            chunkSize,
            onProgress: (f) => progress.push(f),
        });
        assert.equal(result.ok, true, `chunkSize ${chunkSize}`);
        if (!result.ok) return;
        assert.deepEqual(result.payload, {
            printDate: "2026-10-26T02:08:52.000Z",
            totalRows: 4,
            skippedNonActive: 2,
            rows: [
                { storeCode: "T001", problemNo: "P-001", status: "Progress", branchCode: "G001", branchName: "SIDOARJO" },
                { storeCode: "T003", problemNo: "P-003", status: "New", branchCode: "G002", branchName: "MALANG" },
            ],
        });
        assert.equal(progress.at(-1), 1);
    }

    // File yang disimpan ulang dari Excel memakai sharedStrings (t="s")
    const shared = ["Kode Toko", "No. Problem", "Status", "T010", "P-010", "PROGRESS", "Tanggal Cetak", ": 12-Aug-2026 - 10:50:12"];
    const sst = `<sst count="${shared.length}" uniqueCount="${shared.length}">${shared
        .map((s, i) => (i === 3 ? `<si><r><t>T0</t></r><r><t>10</t></r></si>` : `<si><t xml:space="preserve">${s}</t></si>`))
        .join("")}</sst>`;
    const s = (ref: string, idx: number) => `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    const sharedSheet = sheetXml([
        `<row r="2">${s("A2", 6)}${s("B2", 7)}</row>`,
        `<row r="4">${s("A4", 0)}${s("B4", 1)}${s("C4", 2)}</row>`,
        `<row r="5">${s("A5", 3)}${s("B5", 4)}${s("C5", 5)}</row>`,
    ]);
    const sharedResult = await parseAhoXlsx(buildXlsx(sharedSheet, { "xl/sharedStrings.xml": sst }), { chunkSize: 5 });
    assert.deepEqual(sharedResult, {
        ok: true,
        payload: {
            printDate: "2026-08-12T03:50:12.000Z",
            totalRows: 1,
            skippedNonActive: 0,
            rows: [{ storeCode: "T010", problemNo: "P-010", status: "Progress", branchCode: "", branchName: "" }],
        },
    });

    // Header tidak dikenal
    const unknown = await parseAhoXlsx(buildXlsx(sheetXml([row(1, ["Nama", "Alamat"]), row(2, ["A", "B"])])));
    assert.deepEqual(unknown, {
        ok: false,
        error: "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.",
    });

    // Kolom Status tidak ada
    const noStatus = await parseAhoXlsx(buildXlsx(sheetXml([row(1, ["Kode Toko", "No. Problem"]), row(2, ["T1", "P1"])])));
    assert.deepEqual(noStatus, {
        ok: false,
        error: "Kolom wajib tidak ditemukan: status. Pastikan menggunakan file AHO dari IRIS.",
    });

    // Bukan file zip
    const notZip = await parseAhoXlsx(new TextEncoder().encode("Kode Toko,No. Problem,Status"));
    assert.equal(notZip.ok, false);

    console.log("parse-aho-xlsx.spec: all assertions passed");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
