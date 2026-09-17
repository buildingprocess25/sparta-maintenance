# Sync Stores Sheet Upsert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Dokploy scheduler-backed store sync so Google Sheet rows create missing Alfamart stores and update matched stores from sheet data without deleting or resetting database-only stores.

**Architecture:** Keep the existing `POST /api/cron/sync-stores` endpoint and `syncStoresFromSheet()` entrypoint. Expand `lib/jobs/sync-stores.ts` from create-only behavior into a small parser plus change-builder plus executor, so tests can verify the data contract without touching Google Sheets or a real database.

**Tech Stack:** Next.js route handler, TypeScript, Prisma 7, Google Sheets API via `googleapis`, Node `assert` source-level/unit tests run with `tsx`.

## Global Constraints

- Scheduler endpoint remains `POST /api/cron/sync-stores` and keeps `Authorization: Bearer <CRON_SECRET>`.
- Sheet columns are `Branch`, `Kode Toko`, `Nama Toko`, `F/R`, and `Titik Koordinat`.
- `F/R = F` maps to `Store.ownershipType = FRANCHISE`.
- `F/R = R` maps to `Store.ownershipType = REGULAR`.
- Missing or invalid `F/R` maps to `Store.ownershipType = UNKNOWN`.
- Rows sourced from the sheet set `Store.brand = "ALFAMART"`.
- Existing stores matched by normalized `Kode Toko` are updated only when sheet-owned fields differ.
- Existing `Store.isActive` must not be changed by sync.
- Stores in the database but absent from the sheet must not be deleted, inactivated, reset, or otherwise modified.
- Invalid or empty coordinates must not fail the whole sync. New stores store null coordinates; existing stores keep previous coordinates when source coordinates are invalid.
- No new dependencies.

---

## File Structure

- Modify `lib/jobs/sync-stores.ts`: add ownership and coordinate parsing, return richer parsed sheet rows, build create/update changes, and execute only necessary writes.
- Modify `scripts/sync-stores-from-sheet.ts`: re-export new pure helpers and print updated result counts.
- Modify `scripts/sync-stores-from-sheet.spec.ts`: replace create-only assertions with parser and change-builder assertions for create/update/unchanged/non-destructive behavior.
- Modify `app/api/cron/sync-stores/route.spec.ts`: keep authorization coverage and add a source-level assertion that POST returns the richer result shape from `syncStoresFromSheet`.
- Modify `docs/project/07-integrations-and-env.md`: document active `POST /api/cron/sync-stores` behavior and required sheet columns.
- Create `docs/agent-notes/YYYY-MM-DD-HHMM-sync-stores-sheet-upsert-plan.md`: record this planning task.

---

### Task 1: Parser and Change-Builder Contract

**Files:**
- Modify: `lib/jobs/sync-stores.ts`
- Modify: `scripts/sync-stores-from-sheet.spec.ts`
- Modify: `scripts/sync-stores-from-sheet.ts`

**Interfaces:**
- Consumes: existing `parseStoreSheetRows(rows)` and `filterNewStores(stores, existingCodes)` exports.
- Produces:
  - `parseOwnershipMarker(value: SheetCell): StoreOwnershipTypeValue`
  - `parseCoordinateCell(value: SheetCell): ParsedCoordinates`
  - `buildStoreSyncChanges(sheetStores, dbStores): StoreSyncChanges`
  - `SyncStoresResult` with `{ rows, created, updated, unchanged, skipped, invalidOwnershipValues, invalidCoordinateValues }`

- [ ] **Step 1: Write failing parser and change-builder tests**

Replace `scripts/sync-stores-from-sheet.spec.ts` with:

```ts
import assert from "node:assert/strict";
import {
    buildStoreSyncChanges,
    filterNewStores,
    parseCoordinateCell,
    parseOwnershipMarker,
    parseStoreSheetRows,
} from "./sync-stores-from-sheet";

const stores = parseStoreSheetRows([
    ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
    ["SIDOARJO", "u001", "Toko Satu", "R", "-6.123456 106.123456"],
    ["MALANG", "U002", "Toko Dua", "F", "-7,123456 107,123456"],
    ["MALANG", "U002", "Toko Dua", "F", "-7,123456 107,123456"],
    ["", "", "", "", ""],
]);

assert.deepEqual(stores, [
    {
        code: "U001",
        name: "Toko Satu",
        branchName: "SIDOARJO",
        brand: "ALFAMART",
        ownershipType: "REGULAR",
        latitude: "-6.123456",
        longitude: "106.123456",
        hasValidCoordinates: true,
    },
    {
        code: "U002",
        name: "Toko Dua",
        branchName: "MALANG",
        brand: "ALFAMART",
        ownershipType: "FRANCHISE",
        latitude: "-7.123456",
        longitude: "107.123456",
        hasValidCoordinates: true,
    },
]);

assert.equal(parseOwnershipMarker("R"), "REGULAR");
assert.equal(parseOwnershipMarker("F"), "FRANCHISE");
assert.equal(parseOwnershipMarker(""), "UNKNOWN");
assert.equal(parseOwnershipMarker("x"), "UNKNOWN");

assert.deepEqual(parseCoordinateCell("-6.1 106.2"), {
    latitude: "-6.100000",
    longitude: "106.200000",
    hasValidCoordinates: true,
});
assert.deepEqual(parseCoordinateCell(""), {
    latitude: null,
    longitude: null,
    hasValidCoordinates: false,
});
assert.deepEqual(parseCoordinateCell("invalid"), {
    latitude: null,
    longitude: null,
    hasValidCoordinates: false,
});

assert.deepEqual(filterNewStores(stores, new Set(["U001"])), [stores[1]]);

const changes = buildStoreSyncChanges(stores, [
    {
        code: "U001",
        name: "Toko Lama",
        branchName: "SIDOARJO",
        brand: null,
        ownershipType: "UNKNOWN",
        latitude: null,
        longitude: null,
    },
    {
        code: "U002",
        name: "Toko Dua",
        branchName: "MALANG",
        brand: "ALFAMART",
        ownershipType: "FRANCHISE",
        latitude: "-7.123456",
        longitude: "107.123456",
    },
    {
        code: "LAW1",
        name: "Lawson Existing",
        branchName: "JAKARTA",
        brand: "LAWSON",
        ownershipType: "UNKNOWN",
        latitude: null,
        longitude: null,
    },
]);

assert.deepEqual(changes.creates, []);
assert.deepEqual(changes.updates, [
    {
        code: "U001",
        data: {
            name: "Toko Satu",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
    },
]);
assert.deepEqual(changes.summary, {
    created: 0,
    updated: 1,
    unchanged: 1,
    skipped: 1,
});

const invalidCoordinateChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["SIDOARJO", "U003", "Toko Tiga", "R", "invalid"],
    ]),
    [
        {
            code: "U003",
            name: "Toko Tiga",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.000000",
            longitude: "106.000000",
        },
    ],
);
assert.deepEqual(invalidCoordinateChanges.updates, []);
assert.equal(invalidCoordinateChanges.summary.unchanged, 1);

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
            ["TEGAL", "U003", "", "R", "-6.1 106.2"],
        ]),
    /Baris 2 tidak lengkap/,
);

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
            ["TEGAL", "U004", "Toko Lama", "R", "-6.1 106.2"],
            ["TEGAL", "U004", "Toko Baru", "R", "-6.1 106.2"],
        ]),
    /Kode toko duplikat U004/,
);

console.log("sync-stores-from-sheet tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\sync-stores-from-sheet.spec.ts
```

Expected: FAIL because `buildStoreSyncChanges`, `parseOwnershipMarker`, and `parseCoordinateCell` are not exported yet, and `parseStoreSheetRows` does not return ownership, brand, or coordinates yet.

- [ ] **Step 3: Implement parser types and helpers**

In `lib/jobs/sync-stores.ts`, update the types and helper section to:

```ts
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
        branchName: string;
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
    };
};

export type SyncStoresResult = {
    rows: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
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
```

- [ ] **Step 4: Update `parseStoreSheetRows`**

Replace `parseStoreSheetRows` in `lib/jobs/sync-stores.ts` with:

```ts
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
```

- [ ] **Step 5: Add change-builder**

Add this after `filterNewStores` in `lib/jobs/sync-stores.ts`:

```ts
function normalizeDbCode(value: string) {
    return value.trim().toUpperCase();
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
            branchName: sheetStore.branchName,
            brand: SHEET_BRAND,
            ownershipType: sheetStore.ownershipType,
        };

        let changed =
            dbStore.name !== sheetStore.name ||
            dbStore.branchName !== sheetStore.branchName ||
            dbStore.brand !== SHEET_BRAND ||
            dbStore.ownershipType !== sheetStore.ownershipType;

        if (
            sheetStore.hasValidCoordinates &&
            sheetStore.latitude !== null &&
            sheetStore.longitude !== null
        ) {
            data.latitude = sheetStore.latitude;
            data.longitude = sheetStore.longitude;
            changed =
                changed ||
                decimalStringChanged(dbStore.latitude, sheetStore.latitude) ||
                decimalStringChanged(dbStore.longitude, sheetStore.longitude);
        }

        if (changed) {
            updates.push({ code: sheetStore.code, data });
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
        },
    };
}
```

- [ ] **Step 6: Re-export helpers from CLI wrapper**

Update `scripts/sync-stores-from-sheet.ts` exports:

```ts
export {
    buildStoreSyncChanges,
    filterNewStores,
    parseCoordinateCell,
    parseOwnershipMarker,
    parseStoreSheetRows,
} from "../lib/jobs/sync-stores";
```

- [ ] **Step 7: Run parser/change-builder test**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\sync-stores-from-sheet.spec.ts
```

Expected: PASS and output `sync-stores-from-sheet tests passed`.

- [ ] **Step 8: Commit Task 1**

```powershell
git add lib/jobs/sync-stores.ts scripts/sync-stores-from-sheet.ts scripts/sync-stores-from-sheet.spec.ts
git commit -m "test: define store sheet sync contract"
```

---

### Task 2: Sync Execution and Cron Result

**Files:**
- Modify: `lib/jobs/sync-stores.ts`
- Modify: `scripts/sync-stores-from-sheet.ts`
- Modify: `app/api/cron/sync-stores/route.spec.ts`
- Modify: `docs/project/07-integrations-and-env.md`

**Interfaces:**
- Consumes: `buildStoreSyncChanges(sheetStores, dbStores)` from Task 1.
- Produces: `syncStoresFromSheet(): Promise<SyncStoresResult>` that creates missing stores, updates changed matched stores, and returns `{ rows, created, updated, unchanged, skipped, invalidOwnershipValues, invalidCoordinateValues }`.

- [ ] **Step 1: Add a route result shape assertion**

Append this source-level assertion to `app/api/cron/sync-stores/route.spec.ts` after the authorization checks:

```ts
    const routeSource = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("./route.ts", import.meta.url), "utf8"),
    );
    assert.match(routeSource, /return NextResponse\.json\(\{ ok: true, \.\.\.result \}\)/);
```

Expected purpose: keep the route passing through the richer job result instead of remapping counts in the route.

- [ ] **Step 2: Run route test**

Run:

```powershell
node_modules\.bin\tsx.cmd app\api\cron\sync-stores\route.spec.ts
```

Expected: PASS if route already returns `{ ok: true, ...result }`; if import URL handling fails in this repo's test runtime, replace the source read with:

```ts
const routeSource = await import("node:fs/promises").then((fs) =>
    fs.readFile("app/api/cron/sync-stores/route.ts", "utf8"),
);
```

- [ ] **Step 3: Count invalid source values in `syncStoresFromSheet`**

Add this helper before `syncStoresFromSheet`:

```ts
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
```

- [ ] **Step 4: Replace sync executor**

Replace `syncStoresFromSheet` with:

```ts
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
            code: normalizeDbCode(store.code),
            name: store.name,
            branchName: store.branchName,
            brand: store.brand,
            ownershipType: asOwnershipType(String(store.ownershipType)),
            latitude: decimalToString(store.latitude),
            longitude: decimalToString(store.longitude),
        })),
    );

    if (changes.creates.length > 0) {
        await prisma.store.createMany({
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
    }

    for (const update of changes.updates) {
        await prisma.store.update({
            where: { code: update.code },
            data: {
                name: update.data.name,
                branchName: update.data.branchName,
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
        invalidOwnershipValues: countInvalidOwnershipValues(rows),
        invalidCoordinateValues: countInvalidCoordinateValues(rows),
    };
}
```

- [ ] **Step 5: Update CLI success message**

In `scripts/sync-stores-from-sheet.ts`, replace the `console.log` call with:

```ts
    console.log(
        [
            `Sinkronisasi selesai: ${result.rows} baris`,
            `${result.created} toko baru`,
            `${result.updated} toko diperbarui`,
            `${result.unchanged} toko sudah sesuai`,
            `${result.skipped} toko DB tidak ada di sheet dan dilewati`,
            `${result.invalidOwnershipValues} ownership invalid`,
            `${result.invalidCoordinateValues} koordinat invalid`,
        ].join(", ") + ".",
    );
```

- [ ] **Step 6: Document cron behavior**

In `docs/project/07-integrations-and-env.md`, update the Cron section so active endpoints include:

```md
- `POST /api/cron/sync-stores`
- `GET /api/cron/cleanup-pending-reports`
```

Add this paragraph below the authorization snippet:

```md
`POST /api/cron/sync-stores` membaca Google Sheet store range A:E dengan kolom
`Branch`, `Kode Toko`, `Nama Toko`, `F/R`, dan `Titik Koordinat`. Row sheet
dianggap sumber Alfamart aktif untuk field `name`, `branchName`, `brand`,
`ownershipType`, dan koordinat valid. Store baru dibuat dengan `brand =
ALFAMART`; store existing hanya diupdate jika ada perbedaan field sheet-owned.
Store database yang tidak ada di sheet tidak dihapus, tidak di-inactive-kan,
dan tidak di-reset karena database juga berisi Lawson, toko inactive, dan data
manual dari Store Management.
```

- [ ] **Step 7: Run focused tests**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\sync-stores-from-sheet.spec.ts
node_modules\.bin\tsx.cmd app\api\cron\sync-stores\route.spec.ts
```

Expected:

```text
sync-stores-from-sheet tests passed
sync stores cron route tests passed
```

- [ ] **Step 8: Typecheck focused files**

Run:

```powershell
node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Expected: no TypeScript errors. If the process hits Node heap out-of-memory, rerun:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Expected: no TypeScript errors.

- [ ] **Step 9: Commit Task 2**

```powershell
git add lib/jobs/sync-stores.ts scripts/sync-stores-from-sheet.ts app/api/cron/sync-stores/route.spec.ts docs/project/07-integrations-and-env.md
git commit -m "feat: upsert stores from sheet sync"
```

---

## Self-Review

- Spec coverage: The plan covers sheet columns A:E, F/R ownership mapping, coordinate splitting, automatic Alfamart brand, create missing stores, update matched stores only when changed, and non-destructive handling of database-only stores.
- Placeholder scan: No task uses placeholder or fill-in language. Each code-changing step includes exact code or exact text.
- Type consistency: `StoreOwnershipTypeValue`, `ParsedCoordinates`, `SheetStore`, `DbStoreForSync`, `StoreSyncChanges`, and `SyncStoresResult` are defined before use. Later tasks consume `buildStoreSyncChanges` exactly as produced in Task 1.
