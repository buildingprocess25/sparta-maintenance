import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
    "app/dashboard/stores/_components/admin-stores-table.tsx",
    "utf8",
);

test("stores table renders brand and ownership columns", () => {
    assert.match(
        source,
        /<TableHead className="min-w-\[110px\]">\s*Brand\s*<\/TableHead>/,
    );
    assert.match(
        source,
        /<TableHead className="min-w-\[110px\]">\s*Tipe Toko\s*<\/TableHead>/,
    );
    assert.match(source, /formatBrandLabel\(store\.brand\)/);
    assert.match(source, /formatOwnershipLabel\(store\.ownershipType\)/);
});

test("stores table formats empty brand and UNKNOWN ownership as dash", () => {
    assert.match(source, /function formatBrandLabel\(brand: string \| null\)/);
    assert.match(source, /return normalized\.length > 0 \? normalized : "-"/);
    assert.match(source, /UNKNOWN:\s*"-"/);
});

test("stores table syncs brand and ownership filters to URL and server filters", () => {
    assert.match(
        source,
        /const \[brand, setBrand\] = useState\(initialBrand \?\? "all"\)/,
    );
    assert.match(
        source,
        /const \[ownershipType, setOwnershipType\] = useState\(initialOwnershipType \?\? "all"\)/,
    );
    assert.match(source, /params\.set\("brand", resolvedBrand\)/);
    assert.match(source, /params\.set\("type", resolvedOwnershipType\)/);
    assert.match(source, /brand: brand === "all" \? undefined : brand/);
    assert.match(
        source,
        /ownershipType:\s*ownershipType === "all" \? undefined : ownershipType/,
    );
});
