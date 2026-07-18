import { google } from "googleapis";
import prisma from "@/lib/prisma";

type SheetCell = string | number | boolean | null | undefined;

export type SheetStore = {
    code: string;
    name: string;
    branchName: string;
};

export type SyncStoresResult = {
    rows: number;
    created: number;
    skipped: number;
};

const HEADER_ALIASES = {
    code: ["kode", "kode toko", "code", "store code"],
    name: ["nama", "nama toko", "name", "store name"],
    branchName: ["cabang", "nama cabang", "branch", "branch name"],
} as const;

function requiredEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} env variable is not set`);
    return value;
}

function normalizeHeader(value: SheetCell) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

function findHeaderIndex(
    header: readonly SheetCell[],
    aliases: readonly string[],
) {
    return header.findIndex((cell) => aliases.includes(normalizeHeader(cell)));
}

export function parseStoreSheetRows(
    rows: readonly (readonly SheetCell[])[],
): SheetStore[] {
    const header = rows[0];
    if (!header) throw new Error("Spreadsheet tidak memiliki header");

    const codeIndex = findHeaderIndex(header, HEADER_ALIASES.code);
    const nameIndex = findHeaderIndex(header, HEADER_ALIASES.name);
    const branchIndex = findHeaderIndex(header, HEADER_ALIASES.branchName);

    if ([codeIndex, nameIndex, branchIndex].includes(-1)) {
        throw new Error(
            'Header wajib: "Kode Toko", "Nama Toko", dan "Cabang"',
        );
    }

    const stores = new Map<string, SheetStore>();

    for (const [index, row] of rows.slice(1).entries()) {
        const code = String(row[codeIndex] ?? "").trim().toUpperCase();
        const name = String(row[nameIndex] ?? "").trim();
        const branchName = String(row[branchIndex] ?? "").trim();

        if (!code && !name && !branchName) continue;
        if (!code || !name || !branchName) {
            throw new Error(`Baris ${index + 2} tidak lengkap`);
        }

        const store = { code, name, branchName };
        const duplicate = stores.get(code);
        if (duplicate && JSON.stringify(duplicate) !== JSON.stringify(store)) {
            throw new Error(`Kode toko duplikat ${code} memiliki data berbeda`);
        }

        stores.set(code, store);
    }

    return [...stores.values()];
}

export function filterNewStores(
    stores: readonly SheetStore[],
    existingCodes: ReadonlySet<string>,
) {
    return stores.filter((store) => !existingCodes.has(store.code));
}

async function fetchStoreSheet() {
    const auth = new google.auth.OAuth2(
        requiredEnv("GOOGLE_CLIENT_ID"),
        requiredEnv("GOOGLE_CLIENT_SECRET"),
    );
    auth.setCredentials({
        refresh_token: requiredEnv("GOOGLE_REFRESH_TOKEN"),
    });

    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: requiredEnv("GOOGLE_STORE_SPREADSHEET_ID"),
        range: requiredEnv("GOOGLE_STORE_SHEET_RANGE"),
    });

    return response.data.values ?? [];
}

export async function syncStoresFromSheet(): Promise<SyncStoresResult> {
    const stores = parseStoreSheetRows(await fetchStoreSheet());
    const existingStores = await prisma.store.findMany({
        select: { code: true },
    });
    const existingCodes = new Set(
        existingStores.map((store) => store.code.trim().toUpperCase()),
    );
    const newStores = filterNewStores(stores, existingCodes);

    if (newStores.length === 0) {
        return { rows: stores.length, created: 0, skipped: stores.length };
    }

    const result = await prisma.store.createMany({
        data: newStores.map((store) => ({ ...store, isActive: true })),
        skipDuplicates: true,
    });

    return {
        rows: stores.length,
        created: result.count,
        skipped: stores.length - result.count,
    };
}
