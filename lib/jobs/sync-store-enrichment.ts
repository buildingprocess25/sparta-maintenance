import { google } from "googleapis";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type SheetCell = string | number | boolean | null | undefined;

export type StoreOwnershipTypeValue = "REGULAR" | "FRANCHISE" | "UNKNOWN";

export type ParsedStoreEnrichment = {
    code: string;
    branchName: string;
    name: string;
    ownershipType: StoreOwnershipTypeValue;
    latitude: string | null;
    longitude: string | null;
};

export type StoreEnrichmentDbStore = {
    code: string;
    ownershipType: StoreOwnershipTypeValue;
    latitude: string | null;
    longitude: string | null;
};

export type StoreEnrichmentUpdate = {
    code: string;
    ownershipType: StoreOwnershipTypeValue;
    latitude?: string | null;
    longitude?: string | null;
};

export type StoreEnrichmentParseSummary = {
    sheetRowsRead: number;
    validUniqueSheetCodes: number;
    duplicateIdenticalRows: number;
    duplicateConflictCodes: string[];
    invalidOwnershipValues: number;
    invalidCoordinateValues: number;
};

export type StoreEnrichmentChangeSummary = {
    storesUpdated: number;
    storesUnchanged: number;
    sheetCodesNotFoundInDatabase: number;
    databaseStoresNotFoundInSheet: number;
};

export type StoreEnrichmentSyncResult = StoreEnrichmentParseSummary &
    StoreEnrichmentChangeSummary & {
        dryRun: boolean;
    };

export type StoreEnrichmentOptions = {
    dryRun?: boolean;
    clearInvalidCoordinates?: boolean;
    resetMissingOwnershipToUnknown?: boolean;
};

const HEADER_ALIASES = {
    branchName: ["branch", "cabang", "nama cabang", "branch name"],
    code: ["kode toko", "kode", "code", "store code"],
    name: ["nama toko", "nama", "name", "store name"],
    ownership: ["f/r", "fr", "ownership", "jenis toko", "tipe toko"],
    coordinates: ["titik koordinat", "koordinat", "coordinates", "coordinate"],
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

function normalizeCode(value: SheetCell) {
    return String(value ?? "").trim().toUpperCase();
}

function formatCoordinate(value: number) {
    return value.toFixed(6);
}

export function parseOwnershipMarker(value: SheetCell): {
    ownershipType: StoreOwnershipTypeValue;
    warning: string | null;
} {
    const raw = String(value ?? "").trim().toUpperCase();
    if (!raw) {
        return { ownershipType: "UNKNOWN", warning: "empty ownership marker" };
    }
    if (raw === "R") {
        return { ownershipType: "REGULAR", warning: null };
    }
    if (raw === "F") {
        return { ownershipType: "FRANCHISE", warning: null };
    }
    return {
        ownershipType: "UNKNOWN",
        warning: `invalid ownership marker "${raw}"`,
    };
}

export function parseCoordinateCell(value: SheetCell): {
    latitude: string | null;
    longitude: string | null;
    warning: string | null;
} {
    const raw = String(value ?? "").trim();
    if (!raw) {
        return { latitude: null, longitude: null, warning: "empty coordinates" };
    }

    const normalized = raw.replace(/,/g, ".");
    const parts = normalized.split(/\s+/);
    if (parts.length !== 2) {
        return {
            latitude: null,
            longitude: null,
            warning: `invalid coordinates "${raw}"`,
        };
    }

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return {
            latitude: null,
            longitude: null,
            warning: `invalid coordinates "${raw}"`,
        };
    }

    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return {
            latitude: null,
            longitude: null,
            warning: `coordinates out of range "${raw}"`,
        };
    }

    return {
        latitude: formatCoordinate(latitude),
        longitude: formatCoordinate(longitude),
        warning: null,
    };
}

function storeFingerprint(store: ParsedStoreEnrichment) {
    return JSON.stringify(store);
}

export function parseStoreEnrichmentSheetRows(
    rows: readonly (readonly SheetCell[])[],
): {
    stores: ParsedStoreEnrichment[];
    summary: StoreEnrichmentParseSummary;
} {
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

    const stores = new Map<string, ParsedStoreEnrichment>();
    const conflictCodes = new Set<string>();
    let duplicateIdenticalRows = 0;
    let invalidOwnershipValues = 0;
    let invalidCoordinateValues = 0;
    let sheetRowsRead = 0;

    for (const row of rows.slice(1)) {
        const code = normalizeCode(row[codeIndex]);
        const branchName = String(row[branchIndex] ?? "").trim();
        const name = String(row[nameIndex] ?? "").trim();
        const hasAnyValue = row.some((cell) => String(cell ?? "").trim());
        if (!hasAnyValue) continue;

        sheetRowsRead++;
        if (!code || !branchName || !name) continue;

        const ownership = parseOwnershipMarker(row[ownershipIndex]);
        const coordinates = parseCoordinateCell(row[coordinatesIndex]);
        if (ownership.warning) invalidOwnershipValues++;
        if (coordinates.warning) invalidCoordinateValues++;

        const store: ParsedStoreEnrichment = {
            code,
            branchName,
            name,
            ownershipType: ownership.ownershipType,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
        };

        const existing = stores.get(code);
        if (!existing) {
            stores.set(code, store);
            continue;
        }

        if (storeFingerprint(existing) === storeFingerprint(store)) {
            duplicateIdenticalRows++;
            continue;
        }

        conflictCodes.add(code);
        stores.delete(code);
    }

    const duplicateConflictCodes = [...conflictCodes].sort();
    for (const code of duplicateConflictCodes) {
        stores.delete(code);
    }

    return {
        stores: [...stores.values()],
        summary: {
            sheetRowsRead,
            validUniqueSheetCodes: stores.size,
            duplicateIdenticalRows,
            duplicateConflictCodes,
            invalidOwnershipValues,
            invalidCoordinateValues,
        },
    };
}

function coordinatesChanged(
    dbStore: StoreEnrichmentDbStore,
    sheetStore: ParsedStoreEnrichment,
) {
    return (
        dbStore.latitude !== sheetStore.latitude ||
        dbStore.longitude !== sheetStore.longitude
    );
}

export function buildStoreEnrichmentChanges(
    sheetStores: readonly ParsedStoreEnrichment[],
    dbStores: readonly StoreEnrichmentDbStore[],
    options: Required<
        Pick<
            StoreEnrichmentOptions,
            "clearInvalidCoordinates" | "resetMissingOwnershipToUnknown"
        >
    >,
): {
    updates: StoreEnrichmentUpdate[];
    summary: StoreEnrichmentChangeSummary;
} {
    const sheetByCode = new Map(sheetStores.map((store) => [store.code, store]));
    const dbByCode = new Map(dbStores.map((store) => [store.code, store]));
    const updates: StoreEnrichmentUpdate[] = [];
    let storesUnchanged = 0;
    let databaseStoresNotFoundInSheet = 0;

    for (const sheetStore of sheetStores) {
        const dbStore = dbByCode.get(sheetStore.code);
        if (!dbStore) continue;

        const hasValidCoordinates =
            sheetStore.latitude !== null && sheetStore.longitude !== null;
        const update: StoreEnrichmentUpdate = {
            code: sheetStore.code,
            ownershipType: sheetStore.ownershipType,
        };

        if (hasValidCoordinates || options.clearInvalidCoordinates) {
            update.latitude = sheetStore.latitude;
            update.longitude = sheetStore.longitude;
        }

        const ownershipChanged =
            dbStore.ownershipType !== sheetStore.ownershipType;
        const shouldCompareCoordinates =
            hasValidCoordinates || options.clearInvalidCoordinates;
        const coordinateChanged =
            shouldCompareCoordinates && coordinatesChanged(dbStore, sheetStore);

        if (ownershipChanged || coordinateChanged) {
            updates.push(update);
        } else {
            storesUnchanged++;
        }
    }

    for (const dbStore of dbStores) {
        if (sheetByCode.has(dbStore.code)) continue;
        databaseStoresNotFoundInSheet++;
        if (
            options.resetMissingOwnershipToUnknown &&
            dbStore.ownershipType !== "UNKNOWN"
        ) {
            updates.push({
                code: dbStore.code,
                ownershipType: "UNKNOWN",
            });
        }
    }

    return {
        updates,
        summary: {
            storesUpdated: updates.length,
            storesUnchanged,
            sheetCodesNotFoundInDatabase: sheetStores.filter(
                (store) => !dbByCode.has(store.code),
            ).length,
            databaseStoresNotFoundInSheet,
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

function decimalToString(value: Prisma.Decimal | null) {
    return value?.toFixed(6) ?? null;
}

function asOwnershipType(value: string): StoreOwnershipTypeValue {
    return value === "REGULAR" || value === "FRANCHISE" ? value : "UNKNOWN";
}

export async function syncStoreEnrichmentFromSheet(
    options: StoreEnrichmentOptions = {},
): Promise<StoreEnrichmentSyncResult> {
    const parseResult = parseStoreEnrichmentSheetRows(await fetchStoreSheet());
    const dbStores = await prisma.store.findMany({
        select: {
            code: true,
            ownershipType: true,
            latitude: true,
            longitude: true,
        },
    });
    const changeResult = buildStoreEnrichmentChanges(
        parseResult.stores,
        dbStores.map((store) => ({
            code: store.code.trim().toUpperCase(),
            ownershipType: asOwnershipType(String(store.ownershipType)),
            latitude: decimalToString(store.latitude),
            longitude: decimalToString(store.longitude),
        })),
        {
            clearInvalidCoordinates: options.clearInvalidCoordinates ?? false,
            resetMissingOwnershipToUnknown:
                options.resetMissingOwnershipToUnknown ?? true,
        },
    );

    if (!options.dryRun) {
        for (const update of changeResult.updates) {
            await prisma.store.update({
                where: { code: update.code },
                data: {
                    ownershipType: update.ownershipType,
                    ...(Object.hasOwn(update, "latitude")
                        ? {
                              latitude:
                                  update.latitude === null
                                      ? null
                                      : new Prisma.Decimal(update.latitude),
                              longitude:
                                  update.longitude === null
                                      ? null
                                      : new Prisma.Decimal(update.longitude),
                          }
                        : {}),
                },
            });
        }
    }

    return {
        ...parseResult.summary,
        ...changeResult.summary,
        dryRun: options.dryRun ?? false,
    };
}
