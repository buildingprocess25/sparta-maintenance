import test from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/pdf/generate-pjum-package-pdf.ts", "utf8");

test("PJUM package query selects store metadata for recap breakdown", () => {
    assert.match(
        source,
        /store:\s*\{\s*select:\s*\{\s*brand:\s*true,\s*ownershipType:\s*true\s*\}\s*\}/,
    );
});

test("PJUM recap rows include brand and ownership type", () => {
    assert.match(source, /brand:\s*r\.store\?\.brand\s*\?\?\s*null/);
    assert.match(
        source,
        /ownershipType:\s*r\.store\?\.ownershipType\s*\?\?\s*null/,
    );
});
