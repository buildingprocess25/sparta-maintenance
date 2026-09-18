import test from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");

test("PjumPdfRow carries store type metadata", () => {
    assert.match(source, /brand\?: string \| null;/);
    assert.match(
        source,
        /ownershipType\?: "REGULAR" \| "FRANCHISE" \| "UNKNOWN" \| null;/,
    );
});

test("PJUM renderer uses store type breakdown helper", () => {
    assert.match(source, /getPjumStoreTypeBreakdown\(data\.reports\)/);
    assert.match(source, /breakdown\.shouldRenderBreakdown/);
});

test("combined recap title appears only for mixed category breakdowns", () => {
    assert.match(source, /breakdown\.shouldRenderBreakdown[\s\S]*Rekap Gabungan Semua Tipe Toko/);
});

test("breakdown is rendered after signature section", () => {
    const signatureIndex = source.indexOf("DIBUAT OLEH");
    const breakdownIndex = source.indexOf(
        "RINCIAN REKAPAN BERDASARKAN TIPE TOKO",
    );

    assert.ok(signatureIndex > -1, "signature render marker must exist");
    assert.ok(breakdownIndex > -1, "breakdown render marker must exist");
    assert.ok(
        breakdownIndex > signatureIndex,
        "breakdown should be rendered after the signature section",
    );
});
