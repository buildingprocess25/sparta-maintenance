// Parser streaming untuk laporan AHO dari IRIS Alfamart (.xlsx).
//
// Kenapa tidak memakai library `xlsx` (SheetJS): XLSX.read() mengubah seluruh
// sheet XML menjadi satu string. Ekspor IRIS YTD (Okt 2026) punya sheet XML
// 565 MB, melewati batas string V8 (~536 MB), dan SheetJS menelan error itu
// sehingga sheet hilang tanpa pesan. Di sini zip di-unzip bertahap (fflate) dan
// XML dibaca per <row>, jadi memori tetap kecil berapa pun ukuran file.
//
// Modul ini murni (tanpa DOM/Node API) agar bisa dijalankan di browser dan
// diuji dengan `npx tsx`.

import { Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { normalizeAhoStatus, type AhoImportPayload, type AhoImportRow } from "./import-payload";

export type ParseAhoXlsxResult =
    | { ok: true; payload: AhoImportPayload }
    | { ok: false; error: string };

export type ParseAhoXlsxOptions = {
    /** Ukuran potongan data zip per push. Default 256 KB. */
    chunkSize?: number;
    /** Dipanggil dengan nilai 0..1 selama sheet dibaca. */
    onProgress?: (fraction: number) => void;
};

const DEFAULT_CHUNK_SIZE = 256 * 1024;
const PRINT_DATE_SCAN_ROWS = 20;
const HEADER_SCAN_ROWS = 50;

const TARGET_COLS = {
    storeCode: ["kode toko"],
    problemNo: ["no. problem", "no problem"],
    status: ["status"],
    branchCode: ["kode cabang existing"],
    branchName: ["cabang existing", "nama cabang existing"],
} as const;
type TargetField = keyof typeof TARGET_COLS;

const ERR_NOT_XLSX = "File bukan XLSX yang valid. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.";
const ERR_NO_SHEET = "File XLSX kosong (tidak ada sheet)";
const ERR_UNKNOWN_FORMAT = "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.";

// ─── XML helpers ─────────────────────────────────────────────────────────────

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXmlEntities(text: string): string {
    if (!text.includes("&")) return text;
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
        if (entity[0] === "#") {
            const code = entity[1] === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
            return Number.isNaN(code) ? match : String.fromCodePoint(code);
        }
        return XML_ENTITIES[entity] ?? match;
    });
}

function readAttr(attrs: string, name: string): string | null {
    const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
    return match ? decodeXmlEntities(match[1]) : null;
}

/** Gabungkan semua <t> (termasuk rich-text run), abaikan teks fonetik <rPh>. */
function joinTextRuns(xml: string): string {
    const withoutPhonetic = xml.includes("<rPh") ? xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "") : xml;
    let text = "";
    const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(withoutPhonetic))) text += match[1] ?? "";
    return decodeXmlEntities(text);
}

/** "AB12" → 27 (0-indexed). */
function columnIndexFromRef(ref: string): number {
    let col = 0;
    for (let i = 0; i < ref.length; i++) {
        const code = ref.charCodeAt(i);
        if (code < 65 || code > 90) break;
        col = col * 26 + (code - 64);
    }
    return col - 1;
}

// ─── Tanggal Cetak ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6,
    aug: 7, agu: 7, agt: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
};

/**
 * ": 26-Oct-2026 - 09:08:52" (WIB) → "2026-10-26T02:08:52.000Z".
 * Diparse manual (bukan new Date(string)) karena format ini tidak standar
 * dan hasilnya berbeda antar browser.
 */
export function parseIrisPrintDate(raw: string): string | null {
    const value = raw.replace(/^:\s*/, "").trim();
    const match = /^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})\s*-?\s*(\d{1,2}):(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const month = MONTHS[match[2].toLowerCase()];
    if (month === undefined) return null;
    const [, day, , year, hour, minute, second] = match;
    // IRIS selalu WIB (UTC+7)
    const utcMs = Date.UTC(Number(year), month, Number(day), Number(hour) - 7, Number(minute), Number(second));
    return new Date(utcMs).toISOString();
}

// ─── Zip streaming ───────────────────────────────────────────────────────────

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Push seluruh zip ke fflate Unzip sedikit demi sedikit. `onEntry` memutuskan
 * entri mana yang didekompresi (return handler) atau dilewati (return null).
 * Setiap potongan diselingi yield agar UI browser tetap responsif.
 */
async function streamZip(
    data: Uint8Array,
    chunkSize: number,
    onEntry: (name: string) => ((text: string, final: boolean) => void) | null,
    shouldStop: () => boolean,
    onProgress?: (fraction: number) => void,
): Promise<void> {
    let entryError: unknown = null;
    const unzip = new Unzip((file: UnzipFile) => {
        const handler = onEntry(file.name);
        if (!handler) return;
        const decoder = new TextDecoder("utf-8");
        file.ondata = (err, chunk, final) => {
            if (err) {
                entryError = err;
                return;
            }
            try {
                handler(decoder.decode(chunk, { stream: !final }), final);
            } catch (error) {
                entryError = error;
            }
        };
        file.start();
    });
    unzip.register(UnzipInflate);

    for (let offset = 0; offset < data.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, data.length);
        unzip.push(data.subarray(offset, end), end === data.length);
        if (entryError) throw entryError;
        onProgress?.(end / data.length);
        if (shouldStop()) return;
        await nextTick();
    }
}

/** Buffer teks streaming lalu panggil `onElement` untuk setiap elemen lengkap. */
function createElementScanner(pattern: RegExp, onElement: (match: RegExpExecArray) => void) {
    let buffer = "";
    return (text: string) => {
        buffer += text;
        pattern.lastIndex = 0;
        let consumed = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(buffer))) {
            onElement(match);
            consumed = pattern.lastIndex;
        }
        if (consumed > 0) buffer = buffer.slice(consumed);
    };
}

// ─── Pass 1: workbook, relasi, shared strings ────────────────────────────────

type WorkbookMeta = { sheetPath: string | null; sharedStrings: string[] };

async function readWorkbookMeta(data: Uint8Array, chunkSize: number): Promise<WorkbookMeta> {
    const parts = { workbookXml: null as string | null, relsXml: "" };
    const sharedStrings: string[] = [];
    const scanSharedStrings = createElementScanner(
        /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g,
        (match) => sharedStrings.push(joinTextRuns(match[1] ?? "")),
    );

    await streamZip(
        data,
        chunkSize,
        (name) => {
            if (name === "xl/workbook.xml") {
                parts.workbookXml = "";
                return (text) => (parts.workbookXml += text);
            }
            if (name === "xl/_rels/workbook.xml.rels") return (text) => (parts.relsXml += text);
            if (name === "xl/sharedStrings.xml") return (text) => scanSharedStrings(text);
            return null;
        },
        () => false,
    );

    return { sheetPath: resolveFirstSheetPath(parts.workbookXml, parts.relsXml), sharedStrings };
}

function resolveFirstSheetPath(workbookXml: string | null, relsXml: string): string | null {
    if (workbookXml === null) return null;
    const sheetTag = /<sheet\b([^>]*)>/.exec(workbookXml);
    if (!sheetTag) return null;
    const relId = readAttr(sheetTag[1], "r:id");
    if (relId) {
        const relTags = relsXml.match(/<Relationship\b[^>]*>/g) ?? [];
        for (const tag of relTags) {
            if (readAttr(tag, "Id") !== relId) continue;
            const target = readAttr(tag, "Target");
            if (target) return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
        }
    }
    return "xl/worksheets/sheet1.xml";
}

// ─── Pass 2: baris sheet ─────────────────────────────────────────────────────

function cellText(attrs: string, inner: string | undefined, sharedStrings: string[]): string {
    if (!inner) return "";
    const type = readAttr(attrs, "t");
    if (type === "inlineStr") return joinTextRuns(inner).trim();
    const value = /<v>([\s\S]*?)<\/v>/.exec(inner);
    if (!value) return "";
    if (type === "s") return (sharedStrings[Number(value[1])] ?? "").trim();
    return decodeXmlEntities(value[1]).trim();
}

/** Ambil teks sel per indeks kolom; `wanted` membatasi kolom yang dibaca. */
function readRowCells(
    rowXml: string,
    sharedStrings: string[],
    wanted: Set<number> | null,
): Map<number, string> {
    const cells = new Map<number, string>();
    const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let match: RegExpExecArray | null;
    let col = -1;
    while ((match = re.exec(rowXml))) {
        const ref = readAttr(match[1], "r");
        col = ref ? columnIndexFromRef(ref) : col + 1;
        if (wanted && !wanted.has(col)) continue;
        cells.set(col, cellText(match[1], match[2], sharedStrings));
    }
    return cells;
}

type SheetState = {
    sheetFound: boolean;
    printDate: string | null;
    colIndex: Partial<Record<TargetField, number>> | null;
    wanted: Set<number> | null;
    headerSearchExhausted: boolean;
    rowIndex: number;
    totalRows: number;
    skippedNonActive: number;
    rows: AhoImportRow[];
};

function handleSheetRow(state: SheetState, rowAttrs: string, rowXml: string, sharedStrings: string[]) {
    const rowRef = readAttr(rowAttrs, "r");
    state.rowIndex = rowRef ? Number(rowRef) - 1 : state.rowIndex + 1;

    // ── Sebelum header: cari Tanggal Cetak dan baris header ──
    const colIndex = state.colIndex;
    if (!colIndex) {
        if (state.rowIndex > HEADER_SCAN_ROWS) {
            state.headerSearchExhausted = true;
            return;
        }
        const cells = readRowCells(rowXml, sharedStrings, null);
        const lower = new Map([...cells].map(([col, text]) => [col, text.toLowerCase()]));

        if (
            state.printDate === null &&
            state.rowIndex <= PRINT_DATE_SCAN_ROWS &&
            lower.get(0) === "tanggal cetak"
        ) {
            state.printDate = parseIrisPrintDate(cells.get(1) ?? "");
        }

        const columnOf = (field: TargetField) =>
            [...lower.keys()]
                .sort((a, b) => a - b)
                .find((col) => (TARGET_COLS[field] as readonly string[]).includes(lower.get(col)!));
        if (columnOf("problemNo") !== undefined && columnOf("storeCode") !== undefined) {
            const found: Partial<Record<TargetField, number>> = {};
            for (const field of Object.keys(TARGET_COLS) as TargetField[]) {
                const col = columnOf(field);
                if (col !== undefined) found[field] = col;
            }
            state.colIndex = found;
            state.wanted = new Set(Object.values(found));
        }
        return;
    }

    // ── Baris data: hanya baca kolom yang dibutuhkan ──
    if (colIndex.status === undefined) return;
    const cells = readRowCells(rowXml, sharedStrings, state.wanted);
    const storeCode = (cells.get(colIndex.storeCode!) ?? "").toUpperCase();
    const problemNo = cells.get(colIndex.problemNo!) ?? "";
    const statusRaw = cells.get(colIndex.status) ?? "";
    if (!storeCode || !problemNo || !statusRaw) return;

    state.totalRows++;
    const status = normalizeAhoStatus(statusRaw);
    if (!status) {
        state.skippedNonActive++;
        return;
    }

    const branchCode = colIndex.branchCode !== undefined ? (cells.get(colIndex.branchCode) ?? "") : "";
    let branchName = colIndex.branchName !== undefined ? (cells.get(colIndex.branchName) ?? "") : "";
    if (branchName.toUpperCase().startsWith("DC ")) branchName = branchName.substring(3).trim();

    state.rows.push({ storeCode, problemNo, status, branchCode, branchName });
}

export async function parseAhoXlsx(
    data: Uint8Array,
    options: ParseAhoXlsxOptions = {},
): Promise<ParseAhoXlsxResult> {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

    // Signature zip: "PK" 0x03 0x04
    if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b || data[2] !== 0x03 || data[3] !== 0x04) {
        return { ok: false, error: ERR_NOT_XLSX };
    }

    // Pass 1: di file IRIS, sheet1.xml muncul SEBELUM workbook.xml di dalam zip,
    // jadi lokasi sheet & shared strings harus dibaca dulu di pass terpisah.
    const { sheetPath, sharedStrings } = await readWorkbookMeta(data, chunkSize);
    if (!sheetPath) return { ok: false, error: ERR_NO_SHEET };

    const state: SheetState = {
        sheetFound: false,
        printDate: null,
        colIndex: null,
        wanted: null,
        headerSearchExhausted: false,
        rowIndex: -1,
        totalRows: 0,
        skippedNonActive: 0,
        rows: [],
    };
    const scanRows = createElementScanner(
        /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
        (match) => handleSheetRow(state, match[1], match[2] ?? "", sharedStrings),
    );

    // Pass 2: stream sheet pertama baris per baris
    await streamZip(
        data,
        chunkSize,
        (name) => {
            if (name !== sheetPath) return null;
            state.sheetFound = true;
            return (text) => scanRows(text);
        },
        () => state.headerSearchExhausted,
        options.onProgress,
    );

    if (!state.sheetFound) return { ok: false, error: ERR_NO_SHEET };
    if (!state.colIndex) return { ok: false, error: ERR_UNKNOWN_FORMAT };

    const colIndex = state.colIndex;
    const missing = (["storeCode", "problemNo", "status"] as const).filter((f) => colIndex[f] === undefined);
    if (missing.length > 0) {
        return {
            ok: false,
            error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan menggunakan file AHO dari IRIS.`,
        };
    }

    return {
        ok: true,
        payload: {
            printDate: state.printDate,
            totalRows: state.totalRows,
            skippedNonActive: state.skippedNonActive,
            rows: state.rows,
        },
    };
}
