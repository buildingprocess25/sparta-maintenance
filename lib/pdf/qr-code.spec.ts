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
    const { createQrPngDataUrl } = await import("./qr-code");

    const dataUrl = await createQrPngDataUrl(
        "https://maintenance.sparta-alfamart.web.id/v/pjum/example-token",
    );

    assert.match(dataUrl, /^data:image\/png;base64,/);
    assert.ok(
        dataUrl.length > 500,
        `Expected QR data URL to be non-empty, got ${dataUrl.length}`,
    );

    console.log("pjum qr generation passed");
}

void main();
