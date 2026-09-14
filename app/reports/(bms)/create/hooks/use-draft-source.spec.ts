import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
} as unknown as NodeJS.Module;

async function main() {
    const { chooseDraftSource } = await import("./use-draft");

    assert.equal(
        chooseDraftSource(
            { savedAt: "2026-09-14T13:00:10.000Z" },
            { updatedAt: "2026-09-14T13:00:00.000Z" },
        ),
        "local",
    );

    assert.equal(
        chooseDraftSource(
            { savedAt: "2026-09-14T13:00:00.000Z" },
            { updatedAt: "2026-09-14T13:00:10.000Z" },
        ),
        "server",
    );

    assert.equal(
        chooseDraftSource(null, { updatedAt: "2026-09-14T13:00:10.000Z" }),
        "server",
    );
    assert.equal(chooseDraftSource(null, null), null);

    console.log("draft source selection tests passed");
}

void main();
