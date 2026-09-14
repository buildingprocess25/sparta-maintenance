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
    const { SERVER_DRAFT_IDLE_MS, shouldServerAutosave } = await import(
        "./use-server-draft-autosave"
    );

    assert.equal(SERVER_DRAFT_IDLE_MS, 17_000);

    assert.equal(
        shouldServerAutosave({
            isSubmitting: false,
            hasStore: true,
            isDirty: true,
            inFlight: false,
        }),
        true,
    );

    assert.equal(
        shouldServerAutosave({
            isSubmitting: false,
            hasStore: false,
            isDirty: true,
            inFlight: false,
        }),
        false,
    );

    assert.equal(
        shouldServerAutosave({
            isSubmitting: true,
            hasStore: true,
            isDirty: true,
            inFlight: false,
        }),
        false,
    );

    console.log("server draft autosave contract tests passed");
}

void main();
