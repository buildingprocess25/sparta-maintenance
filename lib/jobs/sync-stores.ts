import { google } from "googleapis";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type SheetCell = string | number | boolean | null | undefined;

export type StoreOwnershipTypeValue = "REGULAR" | "FRANCHISE" | "UNKNOWN";

export type SheetStore = {
    code: string;
    name: string;
    branchName: string;
    brand: "ALFAMART";
    ownershipType: StoreOwnershipTypeValue;
    latitude: string | null;
    longitude: string | null;
    hasValidCoordinates: boolean;
};

export type DbStoreForSync = {
    code: string;
    name: string;
    branchName: string;
    brand: string | null;
    ownershipType: StoreOwnershipTypeValue;
    latitude: string | null;
    longitude: string | null;
};

export type StoreSyncCreate = {
    code: string;
    name: string;
    branchName: string;
    brand: "ALFAMART";
    ownershipType: StoreOwnershipTypeValue;
    latitude: string | null;
    longitude: string | null;
    isActive: true;
};

export type StoreSyncUpdate = {
    code: string;
    data: {
        name: string;
        brand: "ALFAMART";
        ownershipType: StoreOwnershipTypeValue;
        latitude?: string;
        longitude?: string;
    };
};

export type StoreSyncChanges = {
    creates: StoreSyncCreate[];
    updates: StoreSyncUpdate[];
    summary: {
        created: number;
        updated: number;
        unchanged: number;
        skipped: number;
        updatedFields: Record<string, number>;
    };
};

export type SyncStoresResult = {
    rows: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    updatedFields: Record<string, number>;
    invalidOwnershipValues: number;
    invalidCoordinateValues: number;
};

export type ParsedCoordinates = {
    latitude: string | null;
    longitude: string | null;
    hasValidCoordinates: boolean;
};

const SHEET_BRAND = "ALFAMART" as const;

const HEADER_ALIASES = {
    branchName: ["branch", "cabang", "nama cabang", "branch name"],
    code: ["kode toko", "kode", "code", "store code"],
    name: ["nama toko", "nama", "name", "store name"],
    ownership: ["f/r", "fr", "ownership", "jenis toko", "tipe toko"],
    coordinates: ["titik koordinat", "koordinat", "coordinates", "coordinate"],
} as const;

export function parseOwnershipMarker(value: SheetCell): StoreOwnershipTypeValue {
    const raw = String(value ?? "").trim().toUpperCase();
    if (raw === "F") return "FRANCHISE";
    if (raw === "R") return "REGULAR";
    return "UNKNOWN";
}

function formatCoordinate(value: number) {
    return value.toFixed(6);
}

export function parseCoordinateCell(value: SheetCell): ParsedCoordinates {
    const raw = String(value ?? "").trim();
    if (!raw) {
        return { latitude: null, longitude: null, hasValidCoordinates: false };
    }

    const parts = raw.replace(/,/g, ".").split(/\s+/);
    if (parts.length !== 2) {
        return { latitude: null, longitude: null, hasValidCoordinates: false };
    }

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return { latitude: null, longitude: null, hasValidCoordinates: false };
    }

    return {
        latitude: formatCoordinate(latitude),
        longitude: formatCoordinate(longitude),
        hasValidCoordinates: true,
    };
}

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

    const branchIndex = findHeaderIndex(header, HEADER_ALIASES.branchName);
    const codeIndex = findHeaderIndex(header, HEADER_ALIASES.code);
    const nameIndex = findHeaderIndex(header, HEADER_ALIASES.name);
    const ownershipIndex = findHeaderIndex(header, HEADER_ALIASES.ownership);
    const coordinatesIndex = findHeaderIndex(header, HEADER_ALIASES.coordinates);

    if (
        [
            branchIndex,
            codeIndex,
            nameIndex,
            ownershipIndex,
            coordinatesIndex,
        ].includes(-1)
    ) {
        throw new Error(
            'Header wajib: "Branch", "Kode Toko", "Nama Toko", "F/R", dan "Titik Koordinat"',
        );
    }

    const stores = new Map<string, SheetStore>();

    for (const [index, row] of rows.slice(1).entries()) {
        const branchName = String(row[branchIndex] ?? "").trim();
        const code = String(row[codeIndex] ?? "").trim().toUpperCase();
        const name = String(row[nameIndex] ?? "").trim();
        const hasAnyValue = row.some((cell) => String(cell ?? "").trim());

        if (!hasAnyValue) continue;
        if (!code || !name || !branchName) {
            throw new Error(`Baris ${index + 2} tidak lengkap`);
        }

        const coordinates = parseCoordinateCell(row[coordinatesIndex]);
        const store: SheetStore = {
            code,
            name,
            branchName,
            brand: SHEET_BRAND,
            ownershipType: parseOwnershipMarker(row[ownershipIndex]),
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            hasValidCoordinates: coordinates.hasValidCoordinates,
        };
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

function normalizeDbCode(value: string) {
    return value.trim().toUpperCase();
}

function countInvalidOwnershipValues(rows: readonly (readonly SheetCell[])[]) {
    const header = rows[0];
    if (!header) return 0;
    const ownershipIndex = findHeaderIndex(header, HEADER_ALIASES.ownership);
    if (ownershipIndex === -1) return 0;

    return rows.slice(1).filter((row) => {
        if (!row.some((cell) => String(cell ?? "").trim())) return false;
        const raw = String(row[ownershipIndex] ?? "").trim().toUpperCase();
        return raw !== "F" && raw !== "R";
    }).length;
}

function countInvalidCoordinateValues(rows: readonly (readonly SheetCell[])[]) {
    const header = rows[0];
    if (!header) return 0;
    const coordinatesIndex = findHeaderIndex(header, HEADER_ALIASES.coordinates);
    if (coordinatesIndex === -1) return 0;

    return rows.slice(1).filter((row) => {
        if (!row.some((cell) => String(cell ?? "").trim())) return false;
        return !parseCoordinateCell(row[coordinatesIndex]).hasValidCoordinates;
    }).length;
}

function decimalToString(value: Prisma.Decimal | null) {
    return value?.toFixed(6) ?? null;
}

function asOwnershipType(value: string): StoreOwnershipTypeValue {
    return value === "REGULAR" || value === "FRANCHISE" ? value : "UNKNOWN";
}

function decimalStringChanged(current: string | null, next: string) {
    return current !== next;
}

export function buildStoreSyncChanges(
    sheetStores: readonly SheetStore[],
    dbStores: readonly DbStoreForSync[],
): StoreSyncChanges {
    const dbByCode = new Map(
        dbStores.map((store) => [normalizeDbCode(store.code), store]),
    );
    const creates: StoreSyncCreate[] = [];
    const updates: StoreSyncUpdate[] = [];
    let unchanged = 0;
    const updatedFields: Record<string, number> = {};

    function bumpField(field: string) {
        updatedFields[field] = (updatedFields[field] ?? 0) + 1;
    }

    for (const sheetStore of sheetStores) {
        const dbStore = dbByCode.get(sheetStore.code);
        if (!dbStore) {
            creates.push({
                code: sheetStore.code,
                name: sheetStore.name,
                branchName: sheetStore.branchName,
                brand: SHEET_BRAND,
                ownershipType: sheetStore.ownershipType,
                latitude: sheetStore.latitude,
                longitude: sheetStore.longitude,
                isActive: true,
            });
            continue;
        }

        const data: StoreSyncUpdate["data"] = {
            name: sheetStore.name,
            brand: SHEET_BRAND,
            ownershipType: sheetStore.ownershipType,
        };

        let changed = false;

        if (dbStore.name !== sheetStore.name) {
            changed = true;
            bumpField("name");
        }
        if (dbStore.brand !== SHEET_BRAND) {
            changed = true;
            bumpField("brand");
        }
        if (dbStore.ownershipType !== sheetStore.ownershipType) {
            changed = true;
            bumpField("ownershipType");
        }

        if (
            sheetStore.hasValidCoordinates &&
            sheetStore.latitude !== null &&
            sheetStore.longitude !== null
        ) {
            data.latitude = sheetStore.latitude;
            data.longitude = sheetStore.longitude;
            if (
                decimalStringChanged(dbStore.latitude, sheetStore.latitude) ||
                decimalStringChanged(dbStore.longitude, sheetStore.longitude)
            ) {
                changed = true;
                bumpField("coordinates");
            }
        }

        if (changed) {
            updates.push({ code: dbStore.code, data });
        } else {
            unchanged++;
        }
    }

    return {
        creates,
        updates,
        summary: {
            created: creates.length,
            updated: updates.length,
            unchanged,
            skipped: dbStores.filter((store) => !sheetStores.some(
                (sheetStore) => sheetStore.code === normalizeDbCode(store.code),
            )).length,
            updatedFields,
        },
    };
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
    const rows = await fetchStoreSheet();
    const stores = parseStoreSheetRows(rows);
    const existingStores = await prisma.store.findMany({
        select: {
            code: true,
            name: true,
            branchName: true,
            brand: true,
            ownershipType: true,
            latitude: true,
            longitude: true,
        },
    });
    const changes = buildStoreSyncChanges(
        stores,
        existingStores.map((store) => ({
            code: store.code,
            name: store.name,
            branchName: store.branchName,
            brand: store.brand,
            ownershipType: asOwnershipType(String(store.ownershipType)),
            latitude: decimalToString(store.latitude),
            longitude: decimalToString(store.longitude),
        })),
    );

    let created = 0;
    if (changes.creates.length > 0) {
        const createResult = await prisma.store.createMany({
            data: changes.creates.map((store) => ({
                ...store,
                latitude:
                    store.latitude === null
                        ? null
                        : new Prisma.Decimal(store.latitude),
                longitude:
                    store.longitude === null
                        ? null
                        : new Prisma.Decimal(store.longitude),
            })),
            skipDuplicates: true,
        });
        created = createResult.count;
    }

    for (const update of changes.updates) {
        await prisma.store.update({
            where: { code: update.code },
            data: {
                name: update.data.name,
                brand: update.data.brand,
                ownershipType: update.data.ownershipType,
                ...(Object.hasOwn(update.data, "latitude") &&
                Object.hasOwn(update.data, "longitude")
                    ? {
                          latitude: new Prisma.Decimal(update.data.latitude!),
                          longitude: new Prisma.Decimal(update.data.longitude!),
                      }
                    : {}),
            },
        });
    }

    return {
        rows: stores.length,
        ...changes.summary,
        created,
        invalidOwnershipValues: countInvalidOwnershipValues(rows),
        invalidCoordinateValues: countInvalidCoordinateValues(rows),
    };
}
