/**
 * Download photos locally by calling the photo proxy API.
 *
 * Usage:
 *   npx tsx scripts/download-photos.ts --input exports/dataset.csv --output exports/photos
 *   npx tsx scripts/download-photos.ts --input exports/dataset.csv --output exports/photos --base-url https://localhost:8000/api/photos
 *   npx tsx scripts/download-photos.ts --input exports/dataset.csv --output exports/photos --insecure
 */

import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

type CliOptions = {
    inputPath: string;
    outputDir: string;
    baseUrl: string;
    concurrency: number;
    insecure: boolean;
    overwrite: boolean;
};

type CsvRow = {
    id: string;
    condition?: string;
};

type RunSummary = {
    total: number;
    downloaded: number;
    skipped: number;
    failed: number;
    failures: string[];
};

const DEFAULT_INPUT = "exports/dataset.csv";
const DEFAULT_OUTPUT = "exports/photos";
const DEFAULT_BASE_URL = "https://sparta-maintenance.onrender.com/api/photos";
const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 10;

function usage(): never {
    console.error(`
Usage:
  npx tsx scripts/download-photos.ts --input exports/dataset.csv --output exports/photos [options]

Options:
  --input, -i       CSV input file. Default: ${DEFAULT_INPUT}
  --output, -o      Output directory. Default: ${DEFAULT_OUTPUT}
  --base-url, -u    Base API URL. Default: ${DEFAULT_BASE_URL}
  --concurrency, -c Concurrent downloads (1-${MAX_CONCURRENCY}). Default: ${DEFAULT_CONCURRENCY}
  --insecure        Allow self-signed TLS (sets NODE_TLS_REJECT_UNAUTHORIZED=0)
  --overwrite       Re-download files even if they already exist
  --help, -h        Show this help
`);
    process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        inputPath: DEFAULT_INPUT,
        outputDir: DEFAULT_OUTPUT,
        baseUrl: DEFAULT_BASE_URL,
        concurrency: DEFAULT_CONCURRENCY,
        insecure: false,
        overwrite: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];

        if ((arg === "--input" || arg === "-i") && next) {
            options.inputPath = next.trim();
            i += 1;
        } else if ((arg === "--output" || arg === "-o") && next) {
            options.outputDir = next.trim();
            i += 1;
        } else if ((arg === "--base-url" || arg === "-u") && next) {
            options.baseUrl = next.trim();
            i += 1;
        } else if ((arg === "--concurrency" || arg === "-c") && next) {
            const value = Number(next);
            if (!Number.isFinite(value) || value < 1) {
                throw new Error(`Invalid concurrency value: ${next}`);
            }
            options.concurrency = Math.min(Math.floor(value), MAX_CONCURRENCY);
            i += 1;
        } else if (arg === "--insecure") {
            options.insecure = true;
        } else if (arg === "--overwrite") {
            options.overwrite = true;
        } else if (arg === "--help" || arg === "-h") {
            usage();
        } else {
            throw new Error(`Unknown or incomplete argument: ${arg}`);
        }
    }

    return options;
}

function normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, "");
}

function safeFileName(value: string): string {
    const trimmed = value.trim();
    return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_") || "photo";
}

function getExtension(contentType: string | null): string {
    const normalized = contentType?.toLowerCase() ?? "";
    if (normalized.includes("image/png")) return "png";
    if (normalized.includes("image/webp")) return "webp";
    if (normalized.includes("image/gif")) return "gif";
    return "jpg";
}

function parseCsvRows(raw: string): CsvRow[] {
    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) return [];

    const header = lines[0]
        .split(",")
        .map((value) => value.trim().toLowerCase());

    let startIndex = 0;
    let idIndex = 0;
    let conditionIndex = -1;

    if (header.includes("id")) {
        startIndex = 1;
        idIndex = header.indexOf("id");
        conditionIndex = header.indexOf("kondisi");
    } else if (header.length >= 2) {
        idIndex = 1;
        conditionIndex = 0;
    }

    const rows: CsvRow[] = [];

    for (let i = startIndex; i < lines.length; i += 1) {
        const parts = lines[i].split(",").map((value) => value.trim());
        const id = parts[idIndex] ?? "";
        if (!id) continue;
        const condition =
            conditionIndex >= 0 ? parts[conditionIndex] : undefined;
        rows.push({ id, condition });
    }

    return rows;
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function mapWithConcurrency<T>(
    values: T[],
    concurrency: number,
    worker: (value: T, index: number) => Promise<void>,
): Promise<void> {
    if (values.length === 0) return;

    let nextIndex = 0;

    async function runWorker(): Promise<void> {
        while (nextIndex < values.length) {
            const index = nextIndex;
            nextIndex += 1;
            await worker(values[index], index);
        }
    }

    const workerCount = Math.min(concurrency, values.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

async function downloadOne(
    row: CsvRow,
    index: number,
    total: number,
    options: CliOptions,
    summary: RunSummary,
    outputDir: string,
): Promise<void> {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const url = `${baseUrl}/${encodeURIComponent(row.id)}`;

    const response = await fetch(url);
    if (!response.ok || !response.body) {
        summary.failed += 1;
        summary.failures.push(`${row.id}: HTTP ${response.status}`);
        console.error(`Failed ${row.id}: HTTP ${response.status}`);
        return;
    }

    const extension = getExtension(response.headers.get("content-type"));
    const fileName = `${safeFileName(row.id)}.${extension}`;
    const targetPath = path.join(outputDir, fileName);

    if (!options.overwrite && (await fileExists(targetPath))) {
        summary.skipped += 1;
        return;
    }

    const webStream = response.body as import("stream/web").ReadableStream;
    const nodeStream = Readable.fromWeb(webStream);
    await pipeline(nodeStream, createWriteStream(targetPath));

    summary.downloaded += 1;

    if ((index + 1) % 10 === 0 || index + 1 === total) {
        console.log(`Progress ${index + 1}/${total}`);
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const inputPath = path.resolve(process.cwd(), options.inputPath);
    const outputDir = path.resolve(process.cwd(), options.outputDir);

    const raw = await fs.readFile(inputPath, "utf-8");
    const rows = parseCsvRows(raw);

    if (rows.length === 0) {
        throw new Error("No rows found in input file.");
    }

    await fs.mkdir(outputDir, { recursive: true });

    const summary: RunSummary = {
        total: rows.length,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        failures: [],
    };

    await mapWithConcurrency(rows, options.concurrency, (row, index) =>
        downloadOne(row, index, rows.length, options, summary, outputDir),
    );

    console.log(
        `Done. Total=${summary.total} downloaded=${summary.downloaded} skipped=${summary.skipped} failed=${summary.failed}`,
    );

    if (summary.failures.length > 0) {
        const failurePath = path.join(outputDir, "download-failures.txt");
        await fs.writeFile(failurePath, summary.failures.join("\n"));
        console.log(`Failures written to ${failurePath}`);
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Download failed: ${message}`);
    process.exit(1);
});
