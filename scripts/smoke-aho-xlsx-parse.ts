// Smoke test parser AHO ke file ekspor IRIS asli.
// Usage: npm run smoke:aho-xlsx -- "<path ke rep_problem_*.xlsx>"

import { readFileSync } from "node:fs";

import { ahoImportPayloadSchema } from "../lib/aho-import/import-payload";
import { parseAhoXlsx } from "../lib/aho-import/parse-aho-xlsx";

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npm run smoke:aho-xlsx -- "<path ke file .xlsx>"');
        process.exit(1);
    }

    const data = new Uint8Array(readFileSync(filePath));
    const startedAt = Date.now();
    const result = await parseAhoXlsx(data);
    const durationMs = Date.now() - startedAt;

    if (!result.ok) {
        console.error({ durationMs, error: result.error });
        process.exit(1);
    }

    const { rows, ...meta } = result.payload;
    console.log({
        durationMs,
        ...meta,
        activeRows: rows.length,
        payloadKB: Math.round(JSON.stringify(result.payload).length / 1024),
        sample: rows.slice(0, 3),
    });
    console.log("schema valid:", ahoImportPayloadSchema.safeParse(result.payload).success);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
