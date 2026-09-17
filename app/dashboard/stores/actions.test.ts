import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("app/dashboard/stores/actions.ts", "utf8");

test("admin store filters include brand and ownership type", () => {
    assert.match(
        source,
        /import\s+\{\s*Prisma,\s*StoreOwnershipType\s*\}\s+from\s+"@prisma\/client"/,
    );
    assert.match(source, /brand\?: string;/);
    assert.match(source, /ownershipType\?: StoreOwnershipType;/);
    assert.match(
        source,
        /where\.brand\s*=\s*\{\s*equals:\s*filters\.brand\.trim\(\),\s*mode:\s*"insensitive"\s*\}/,
    );
    assert.match(source, /where\.ownershipType\s*=\s*filters\.ownershipType/);
});

test("admin store list selects ownership type for the table", () => {
    assert.match(source, /ownershipType:\s*true/);
});
