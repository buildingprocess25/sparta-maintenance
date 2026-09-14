import { createRequire } from "node:module";
import assert from "node:assert/strict";
import React from "react";
import {
    Document,
    Page,
    Text,
    renderToBuffer,
} from "@react-pdf/renderer";

const require = createRequire(import.meta.url);
const reactPackage = require("react/package.json") as { version: string };
const rendererPackage = require("@react-pdf/renderer/package.json") as {
    version: string;
};

async function main() {
    const doc = React.createElement(
        Document,
        null,
        React.createElement(
            Page,
            { size: "A4" },
            React.createElement(Text, null, "SPARTA PDF renderer smoke test"),
        ),
    );

    const buffer = await renderToBuffer(doc);
    const pdfBuffer = Buffer.from(buffer);

    assert.ok(
        pdfBuffer.length > 1000,
        `Expected a non-empty PDF buffer, got ${pdfBuffer.length} bytes`,
    );

    console.log(
        `react-pdf-smoke-ok react=${reactPackage.version} renderer=${rendererPackage.version} bytes=${pdfBuffer.length}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
