# Revisi Signage (AHO Opsional, Masa Jeda per Kelompok, Contoh Catatan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan tiga revisi user pada item signage I11–I13: No Tiket AHO opsional lewat feature flag env, masa jeda kuartal terpisah untuk I1–I10 dan I11–I13, dan contoh catatan per kondisi.

**Architecture:** Flag dibaca di server oleh `isSignageAhoRequired()` lalu diteruskan ke zod dan ke form sebagai prop. Aturan "AHO wajib untuk item ini?" dipusatkan di `isAhoRequiredForItem()`. Masa jeda dipecah jadi dua query (inti & signage) yang dipakai oleh dua fungsi murni: `filterActiveCategories()` (form) dan `resolvePreventiveSubmission()` (server submit).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Zod v4 (`zod/v4`), Prisma raw SQL, shadcn/ui. Test: file `*.spec.ts` dengan `node:assert/strict`, dijalankan `npx tsx <file>`.

**Spec:** `docs/superpowers/specs/2026-10-26-signage-items-and-photo-guide-design.md` — bagian **"Revisi 2026-10-28"** (R1, R2, R3).

## Global Constraints

- Branch: `feature/signage-items-photo-guide` (sudah aktif). Jangan pindah branch, jangan push.
- Tidak ada perubahan `prisma/schema.prisma` dan tidak ada migration.
- Env flag: `SIGNAGE_AHO_REQUIRED`; nilai `"true"` (case-insensitive, di-trim) = wajib; selain itu/kosong = **tidak wajib**. Env server biasa, BUKAN `NEXT_PUBLIC_`.
- Item non-signage yang rusak tetap wajib No Tiket AHO.
- Aturan tiket grup signage (auto-fill, satu tiket per grup, terkunci dari item non-signage) tetap berlaku untuk tiket yang diisi.
- Catatan signage **wajib** untuk Kotor, Pudar, dan Rusak; Baik tanpa catatan. Handler Pudar/Rusak tetap REKANAN.
- Placeholder catatan (verbatim):
  - Kotor: `Contoh: kusam kotor / kotor, lampu redup / ada lampu yang mati. Rekomendasi cleaning.`
  - Pudar: `Contoh: rekomendasi rekondisi ke GS karena pudar / warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.`
  - Rusak: `Contoh: rekomendasi rekondisi ke GS karena retak / pecah / rapuh, warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.`
- Masa jeda (zona Jakarta, kuartal berjalan): inti = laporan non-DRAFT dengan I1–I10 lengkap; signage = laporan non-DRAFT dengan I11–I13 lengkap. Inti masa jeda + signage belum → tampil I11–I13 saja dan **wajib**.
- KPI/matriks/export tetap memakai syarat I1–I10 (`PREVENTIVE_REQUIRED_ITEM_IDS`) — jangan diubah.
- Indentasi: ikuti file (lib/hooks/actions 4 spasi; komponen `.tsx` di `create/components` 2 spasi; `submit.ts` campuran — ikuti baris sekitarnya).
- Jangan menambah padding/margin/gap manual pada komponen shadcn; atur lewat wrapper.
- Repo pre-commit hook mewajibkan task note: salin `docs/agent-notes/TEMPLATE.md` ke `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (waktu Asia/Jakarta), isi ringkas, sertakan di commit. Jangan `--no-verify`.
- Jangan pernah menjalankan `git stash`, `git reset`, `git checkout -- <file>`.
- Commit: Conventional Commits, TANPA baris `Co-Authored-By` / "Generated with".
- `npx tsc --noEmit`: abaikan error yang hanya ada di `.next/`.

---

## File Structure

**Dibuat**
- `lib/signage-aho-flag.ts` (+ `.spec.ts`) — baca env `SIGNAGE_AHO_REQUIRED`.
- `lib/preventive-cooldown.ts` (+ `.spec.ts`) — `resolvePreventiveSubmission()`: buang/wajibkan item I per kelompok saat submit.
- `app/reports/(bms)/create/hooks/preventive-visibility.ts` (+ `.spec.ts`) — `filterActiveCategories()`: item I yang tampil di form.

**Diubah**
- `lib/signage.ts`, `lib/signage.spec.ts` — `SIGNAGE_ITEM_IDS`, `getSignageNotePlaceholder()`, `isAhoRequiredForItem()`.
- `.env.example`, `CLAUDE.md` — dokumentasi env.
- `app/reports/actions/types.ts`, `types.spec.ts` — AHO signage mengikuti flag.
- `app/reports/actions/report-json-helpers.ts`, `report-json-helpers.spec.ts` — simpan catatan Kotor.
- `lib/pdf/generate-report-pdf.ts` — tampilkan catatan Kotor.
- `lib/report-preventive-sql.ts`, `app/reports/actions/queries.ts`, `app/reports/actions.ts`, `app/reports/actions/submit.ts` — masa jeda signage.
- `app/reports/(bms)/create/hooks/use-checklist.ts` — dua masa jeda, validasi.
- `app/reports/(bms)/create/components/local-notes-textarea.tsx`, `checklist-damage-fields.tsx`, `signage-checklist-item.tsx`, `checklist-step.tsx`, `types.ts`
- `app/reports/(bms)/create/create-form.tsx`, `create/page.tsx`, `edit/[id]/page.tsx`, `revisi/[reportNumber]/page.tsx`

---

### Task 1: Flag env & helper signage

**Files:**
- Create: `lib/signage-aho-flag.ts`, `lib/signage-aho-flag.spec.ts`
- Modify: `lib/signage.ts`, `lib/signage.spec.ts`, `.env.example`, `CLAUDE.md`

**Interfaces:**
- Produces:
  - `isSignageAhoRequired(env?: Record<string, string | undefined>): boolean` (default `process.env`)
  - `SIGNAGE_ITEM_IDS: readonly string[]` (= `["I11","I12","I13"]`, turunan katalog)
  - `getSignageNotePlaceholder(condition: string | null | undefined): string | undefined`
  - `isSignageNoteRequired(condition: string | null | undefined): boolean` (true untuk Kotor/Pudar/Rusak, case-insensitive)
  - `isAhoRequiredForItem(itemId: string, signageAhoRequired: boolean): boolean`

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/signage-aho-flag.spec.ts`:

```ts
import assert from "node:assert/strict";
import { isSignageAhoRequired } from "./signage-aho-flag";

assert.equal(isSignageAhoRequired({}), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "false" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "1" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "true" }), true);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: " TRUE " }), true);

console.log("signage aho flag tests passed");
```

Di `lib/signage.spec.ts`, tambahkan ke import dari `"./signage"`: `SIGNAGE_ITEM_IDS`, `getSignageNotePlaceholder`, `isSignageNoteRequired`, `isAhoRequiredForItem`. Lalu sisipkan sebelum `console.log("signage tests passed");`:

```ts
assert.deepEqual(SIGNAGE_ITEM_IDS, ["I11", "I12", "I13"]);

assert.equal(
    getSignageNotePlaceholder("kotor"),
    "Contoh: kusam kotor / kotor, lampu redup / ada lampu yang mati. Rekomendasi cleaning.",
);
assert.equal(
    getSignageNotePlaceholder("PUDAR"),
    "Contoh: rekomendasi rekondisi ke GS karena pudar / warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
);
assert.equal(
    getSignageNotePlaceholder("rusak"),
    "Contoh: rekomendasi rekondisi ke GS karena retak / pecah / rapuh, warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
);
assert.equal(getSignageNotePlaceholder("baik"), undefined);
assert.equal(getSignageNotePlaceholder(""), undefined);
assert.equal(getSignageNotePlaceholder(undefined), undefined);

assert.equal(isSignageNoteRequired("kotor"), true);
assert.equal(isSignageNoteRequired("PUDAR"), true);
assert.equal(isSignageNoteRequired("rusak"), true);
assert.equal(isSignageNoteRequired("baik"), false);
assert.equal(isSignageNoteRequired(""), false);
assert.equal(isSignageNoteRequired(undefined), false);

assert.equal(isAhoRequiredForItem("A1", false), true);
assert.equal(isAhoRequiredForItem("A1", true), true);
assert.equal(isAhoRequiredForItem("I11", false), false);
assert.equal(isAhoRequiredForItem("I13", true), true);
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/signage-aho-flag.spec.ts` → FAIL (`Cannot find module './signage-aho-flag'`).
Run: `npx tsx lib/signage.spec.ts` → FAIL (export tidak ada).

- [ ] **Step 3: Implementasi**

Buat `lib/signage-aho-flag.ts`:

```ts
/**
 * Feature flag: wajibkan No Tiket AHO untuk item signage (I11–I13) yang
 * Pudar/Rusak. Env server biasa (bukan NEXT_PUBLIC), dibaca saat runtime;
 * ubah nilainya lalu restart server. Default: tidak wajib.
 */
export function isSignageAhoRequired(
    env: Record<string, string | undefined> = process.env,
): boolean {
    return env.SIGNAGE_AHO_REQUIRED?.trim().toLowerCase() === "true";
}
```

Di akhir `lib/signage.ts`, tambahkan:

```ts
export const SIGNAGE_ITEM_IDS: readonly string[] = REPORT_CHECKLIST_ITEMS.filter(
    (item) => item.signage,
).map((item) => item.id);

const SIGNAGE_NOTE_PLACEHOLDERS: Partial<Record<SignageCondition, string>> = {
    kotor: "Contoh: kusam kotor / kotor, lampu redup / ada lampu yang mati. Rekomendasi cleaning.",
    pudar: "Contoh: rekomendasi rekondisi ke GS karena pudar / warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
    rusak: "Contoh: rekomendasi rekondisi ke GS karena retak / pecah / rapuh, warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
};

/** Placeholder contoh catatan per kondisi signage (Baik tidak punya catatan). */
export function getSignageNotePlaceholder(
    condition: string | null | undefined,
): string | undefined {
    const normalized = normalizeSignageCondition(condition);
    return normalized ? SIGNAGE_NOTE_PLACEHOLDERS[normalized] : undefined;
}

/** Catatan signage wajib untuk Kotor, Pudar, dan Rusak (Baik tanpa catatan). */
export function isSignageNoteRequired(
    condition: string | null | undefined,
): boolean {
    const normalized = normalizeSignageCondition(condition);
    return normalized !== undefined && normalized !== "baik";
}

/**
 * No Tiket AHO wajib untuk item rusak; untuk item signage hanya bila flag
 * `SIGNAGE_AHO_REQUIRED` aktif.
 */
export function isAhoRequiredForItem(
    itemId: string,
    signageAhoRequired: boolean,
): boolean {
    return signageAhoRequired || !getSignageConfig(itemId);
}
```

(`normalizeSignageCondition` dan `getSignageConfig` sudah ada di file yang sama.)

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx lib/signage-aho-flag.spec.ts` → `signage aho flag tests passed`
Run: `npx tsx lib/signage.spec.ts` → `signage tests passed`

- [ ] **Step 5: Dokumentasi env**

Di `.env.example`, tepat setelah baris `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=true`, tambahkan:

```

# Wajibkan No Tiket AHO untuk item signage I11–I13 yang Pudar/Rusak ("true"/"false").
# Dibaca server saat runtime; cukup restart setelah diubah. Default: false.
SIGNAGE_AHO_REQUIRED=false
```

Di `CLAUDE.md`, di daftar **Optional:** (setelah baris `REQUEST_LOG_ENABLED`), tambahkan:

```
- `SIGNAGE_AHO_REQUIRED`: `"true"` makes the AHO ticket mandatory for damaged signage items I11–I13 (default false; server-read at runtime, restart to apply)
```

- [ ] **Step 6: Commit**

```bash
git add lib/signage-aho-flag.ts lib/signage-aho-flag.spec.ts lib/signage.ts lib/signage.spec.ts .env.example CLAUDE.md docs/agent-notes/<note>.md
git commit -m "feat(checklist): add signage AHO flag and note placeholders"
```

---

### Task 2: Server — AHO signage mengikuti flag, catatan Kotor disimpan & tampil di PDF

**Files:**
- Modify: `app/reports/actions/types.ts`, `app/reports/actions/types.spec.ts`
- Modify: `app/reports/actions/report-json-helpers.ts`, `app/reports/actions/report-json-helpers.spec.ts`
- Modify: `lib/pdf/generate-report-pdf.ts`

**Interfaces:**
- Consumes: `isSignageAhoRequired()` (Task 1), `isAhoRequiredForItem()` (Task 1), `isSignageNoteRequired()` (Task 1).
- Produces: `buildDraftDataSchema` menjadi **export**, opsi `{ requireDamagedDetails: boolean; signageAhoRequired?: boolean }` (default `signageAhoRequired` = `isSignageAhoRequired()`).

- [ ] **Step 1: Tulis test yang gagal**

Di `app/reports/actions/types.spec.ts`, ubah import menjadi:

```ts
import {
    buildDraftDataSchema,
    createResubmitDataSchema,
    draftAutosaveDataSchema,
    draftDataSchema,
} from "./types";
import { REPORT_CHECKLIST_ITEMS } from "@/lib/checklist-data";
```

Ubah dua assertion lama yang memakai signage KOTOR tanpa catatan (R3: catatan Kotor kini wajib):

1. Assertion `OK + KOTOR` yang saat ini berisi `notes: undefined` dan mengharapkan `true` — ganti `notes: undefined,` menjadi `notes: "Kusam, perlu cleaning",` (tetap mengharapkan `true`).
2. Assertion `OK + KOTOR + handler: "BMS"` yang mengharapkan `false` — ganti `notes: undefined,` menjadi `notes: "Kusam, perlu cleaning",` agar test tetap hanya menguji aturan handler.

Lalu sisipkan sebelum `console.log("report action type tests passed");`:

```ts
// R3: catatan wajib untuk Kotor (selain Pudar/Rusak); Baik tanpa catatan.
const kotorBase = {
    preventiveCondition: "OK",
    signageCondition: "KOTOR",
    handler: undefined,
    ahoTicketNumber: undefined,
};
assert.equal(isValid([makeSignageItem({ ...kotorBase, notes: undefined })]), false);
assert.equal(isValid([makeSignageItem({ ...kotorBase, notes: "   " })]), false);
assert.equal(
    isValid([makeSignageItem({ ...kotorBase, notes: "Kusam, perlu cleaning" })]),
    true,
);
assert.equal(
    isValid([
        makeSignageItem({
            ...kotorBase,
            signageCondition: "BAIK",
            notes: undefined,
        }),
    ]),
    true,
);
// Autosave draft tidak mewajibkan catatan.
assert.equal(
    draftAutosaveDataSchema.safeParse(
        makeDraft([makeSignageItem({ ...kotorBase, notes: undefined })]),
    ).success,
    true,
);

// R1: AHO signage mengikuti flag (default env kosong = tidak wajib).
const signageNoTicket = makeSignageItem({ ahoTicketNumber: undefined });
assert.equal(isValid([signageNoTicket]), true);
assert.equal(
    isValid([makeItem({ ahoTicketNumber: undefined })]),
    false,
    "item non-signage rusak tetap wajib AHO",
);
assert.equal(
    isValid([makeSignageItem({ notes: undefined, ahoTicketNumber: undefined })]),
    false,
    "catatan Pudar/Rusak tetap wajib",
);
const allItemIds = new Set(REPORT_CHECKLIST_ITEMS.map((item) => item.id));
const strictSchema = buildDraftDataSchema(allItemIds, {
    requireDamagedDetails: true,
    signageAhoRequired: true,
});
assert.equal(strictSchema.safeParse(makeDraft([signageNoTicket])).success, false);
assert.equal(strictSchema.safeParse(makeDraft([makeSignageItem()])).success, true);
// Tiket grup tetap dicek walau opsional: satu terisi, satu kosong = valid.
assert.equal(
    isValid([
        makeSignageItem(),
        makeSignageItem({ itemId: "I12", ahoTicketNumber: undefined }),
    ]),
    true,
);
```

(`makeItem`, `makeSignageItem`, `makeDraft`, `isValid` sudah ada di spec ini.)

Di `app/reports/actions/report-json-helpers.spec.ts`, sisipkan sebelum `console.log("report-json-helpers tests passed");`:

```ts
// R3: catatan Kotor disimpan, catatan Baik tidak.
const signageNoteItems = buildItemsJson({
    checklistItems: [
        {
            itemId: "I11",
            itemName: "Kondisi Fisik Shop Sign",
            categoryName: "I. Preventif Equipment Toko",
            preventiveCondition: "OK",
            signageMaterial: "Embos",
            signageCondition: "KOTOR",
            notes: "Kusam, rekomendasi cleaning",
        },
        {
            itemId: "I12",
            itemName: "Kondisi Fisik List Plank",
            categoryName: "I. Preventif Equipment Toko",
            preventiveCondition: "OK",
            signageMaterial: "Embos",
            signageCondition: "BAIK",
            notes: "catatan lama",
        },
    ],
    bmsEstimations: {},
}) as unknown as Array<{ itemId: string; notes?: string }>;
assert.equal(
    signageNoteItems.find((item) => item.itemId === "I11")?.notes,
    "Kusam, rekomendasi cleaning",
);
assert.equal(
    signageNoteItems.find((item) => item.itemId === "I12")?.notes,
    undefined,
);
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx app/reports/actions/types.spec.ts` → FAIL (`buildDraftDataSchema` bukan export / signage tanpa tiket ditolak / Kotor tanpa catatan diterima).
Run: `npx tsx app/reports/actions/report-json-helpers.spec.ts` → FAIL (catatan Kotor hilang).

- [ ] **Step 3: Implementasi zod**

Di `app/reports/actions/types.ts`:

1. Tambahkan `isAhoRequiredForItem` dan `isSignageNoteRequired` ke import yang sudah ada dari `"@/lib/signage"`, dan tambahkan import baru:

```ts
import { isSignageAhoRequired } from "@/lib/signage-aho-flag";
```

2. Ubah deklarasi builder menjadi export dengan opsi baru:

```ts
export function buildDraftDataSchema(
    allowedItemIds: ReadonlySet<string>,
    options: {
        requireDamagedDetails: boolean;
        signageAhoRequired?: boolean;
    } = {
        requireDamagedDetails: true,
    },
) {
    const signageAhoRequired =
        options.signageAhoRequired ?? isSignageAhoRequired();
```

(baris berikutnya — `const checklistItemSchema = z` — tetap.)

3. Ganti blok pengecekan catatan di superRefine item:

```ts
            if (isDamaged && !item.notes?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notes"],
                    message: "Catatan wajib diisi untuk item rusak",
                });
            }
```

menjadi:

```ts
            // Signage Kotor juga wajib catatan (berisi rekomendasi cleaning).
            const isKotorSignage =
                Boolean(signage) &&
                item.preventiveCondition === "OK" &&
                isSignageNoteRequired(item.signageCondition);
            if ((isDamaged || isKotorSignage) && !item.notes?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notes"],
                    message: isDamaged
                        ? "Catatan wajib diisi untuk item rusak"
                        : `Catatan ${item.itemName} kondisi Kotor wajib diisi`,
                });
            }
```

(`signage` adalah `getSignageConfig(item.itemId)` yang sudah dideklarasikan di awal superRefine item.)

4. Ganti blok pengecekan tiket di superRefine item:

```ts
            if (isDamaged && !item.ahoTicketNumber?.trim()) {
```

menjadi:

```ts
            if (
                isDamaged &&
                isAhoRequiredForItem(item.itemId, signageAhoRequired) &&
                !item.ahoTicketNumber?.trim()
            ) {
```

- [ ] **Step 4: Implementasi catatan Kotor**

Di `app/reports/actions/report-json-helpers.ts` (`buildItemsJson`), ganti:

```ts
                    notes: isDamaged ? item.notes : undefined,
```

menjadi:

```ts
                    // Catatan disimpan untuk item rusak dan untuk signage Kotor
                    // (wajib, berisi rekomendasi cleaning).
                    notes:
                        isDamaged ||
                        (hasSignageData && item.signageCondition === "KOTOR")
                            ? item.notes
                            : undefined,
```

Di `lib/pdf/generate-report-pdf.ts` (`ItemRow`), ganti satu-satunya kemunculan:

```ts
                        hasIssue && hasNotes
```

menjadi:

```ts
                        (hasIssue || item.signageCondition === "KOTOR") &&
                        hasNotes
```

- [ ] **Step 5: Jalankan test, pastikan lolos**

Run: `npx tsx app/reports/actions/types.spec.ts` → `report action type tests passed`
Run: `npx tsx app/reports/actions/report-json-helpers.spec.ts` → `report-json-helpers tests passed`
Run: `npx tsx app/reports/actions/draft-autosave-schema.spec.ts && npx tsx lib/pdf/generate-report-pdf-gallery.spec.ts && npx tsc --noEmit`
Expected: spec lolos, tsc tanpa error di luar `.next/`.

- [ ] **Step 6: Commit**

```bash
git add app/reports/actions/types.ts app/reports/actions/types.spec.ts app/reports/actions/report-json-helpers.ts app/reports/actions/report-json-helpers.spec.ts lib/pdf/generate-report-pdf.ts docs/agent-notes/<note>.md
git commit -m "feat(reports): make signage AHO optional and keep Kotor notes"
```

---

### Task 3: Server — masa jeda signage terpisah saat submit

**Files:**
- Create: `lib/preventive-cooldown.ts`, `lib/preventive-cooldown.spec.ts`
- Modify: `lib/report-preventive-sql.ts`, `app/reports/actions/queries.ts`, `app/reports/actions.ts`, `app/reports/actions/submit.ts`

**Interfaces:**
- Consumes: `SIGNAGE_ITEM_IDS` (Task 1); `PREVENTIVE_ITEM_IDS` dari `lib/report-preventive.ts` (semua item kategori I).
- Produces:
  - `completeSignageEvidenceSql(input: { statusColumn: Prisma.Sql; itemsColumn: Prisma.Sql }): Prisma.Sql`
  - `getLastSignageDate(storeCode: string): Promise<string | null>` (server action, diekspor juga dari `@/app/reports/actions`)
  - `type PreventiveCooldown = { core: boolean; signage: boolean }`
  - `resolvePreventiveSubmission<T extends { itemId: string; preventiveCondition?: string | null }>(items: readonly T[], cooldown: PreventiveCooldown): { items: T[]; error?: { error: string; detail: string } }`

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/preventive-cooldown.spec.ts`:

```ts
import assert from "node:assert/strict";
import { resolvePreventiveSubmission } from "./preventive-cooldown";

const coreIds = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10"];
const signageIds = ["I11", "I12", "I13"];
const filled = (ids: string[]) =>
    ids.map((itemId) => ({ itemId, preventiveCondition: "OK" }));
const a1 = { itemId: "A1", preventiveCondition: undefined };
const ids = (items: { itemId: string }[]) => items.map((item) => item.itemId);

// Tidak ada masa jeda: 13 item lengkap diterima apa adanya.
const full = [a1, ...filled(coreIds), ...filled(signageIds)];
let result = resolvePreventiveSubmission(full, { core: false, signage: false });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ids(full));

// Tidak ada masa jeda: preventif tanpa I12 ditolak.
result = resolvePreventiveSubmission(
    [a1, ...filled(coreIds), ...filled(["I11", "I13"])],
    { core: false, signage: false },
);
assert.equal(result.error?.detail, "Item preventif I12 wajib diisi");

// Tidak ada masa jeda dan tidak ada item preventif sama sekali: dibiarkan.
result = resolvePreventiveSubmission([a1], { core: false, signage: false });
assert.equal(result.error, undefined);

// Inti masa jeda, signage belum: I1–I10 dibuang, I11–I13 wajib.
result = resolvePreventiveSubmission(full, { core: true, signage: false });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1", ...signageIds]);
result = resolvePreventiveSubmission([a1, ...filled(["I11", "I12"])], {
    core: true,
    signage: false,
});
assert.equal(result.error?.detail, "Item preventif I13 wajib diisi");
result = resolvePreventiveSubmission([a1], { core: true, signage: false });
assert.equal(result.error?.detail, "Item preventif I11 wajib diisi");

// Keduanya masa jeda: semua item I dibuang.
result = resolvePreventiveSubmission(full, { core: true, signage: true });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1"]);

// Hanya signage masa jeda: signage dibuang, inti tetap wajib bila ada preventif.
result = resolvePreventiveSubmission(full, { core: false, signage: true });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1", ...coreIds]);

// Item I tanpa preventiveCondition dihitung belum diisi.
result = resolvePreventiveSubmission(
    [a1, { itemId: "I11", preventiveCondition: undefined }, ...filled(["I12", "I13"])],
    { core: true, signage: false },
);
assert.equal(result.error?.detail, "Item preventif I11 wajib diisi");

console.log("preventive cooldown tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/preventive-cooldown.spec.ts` → FAIL (`Cannot find module './preventive-cooldown'`).

- [ ] **Step 3: Implementasi `lib/preventive-cooldown.ts`**

```ts
import { PREVENTIVE_ITEM_IDS } from "@/lib/report-preventive";
import { SIGNAGE_ITEM_IDS } from "@/lib/signage";

export type PreventiveCooldown = {
    /** I1–I10 sudah tercatat lengkap di kuartal berjalan. */
    core: boolean;
    /** I11–I13 sudah tercatat lengkap di kuartal berjalan. */
    signage: boolean;
};

const signageIds = new Set(SIGNAGE_ITEM_IDS);
const coreIds = PREVENTIVE_ITEM_IDS.filter((id) => !signageIds.has(id));
const coreIdSet = new Set(coreIds);
const preventiveIds = new Set(PREVENTIVE_ITEM_IDS);

/**
 * Terapkan masa jeda kuartal per kelompok item I pada payload submit:
 * kelompok yang masa jeda dibuang (cegah bypass UI), kelompok yang tampil
 * wajib lengkap.
 */
export function resolvePreventiveSubmission<
    T extends { itemId: string; preventiveCondition?: string | null },
>(
    items: readonly T[],
    cooldown: PreventiveCooldown,
): { items: T[]; error?: { error: string; detail: string } } {
    const kept = items.filter(
        (item) =>
            !(cooldown.core && coreIdSet.has(item.itemId)) &&
            !(cooldown.signage && signageIds.has(item.itemId)),
    );

    const isFilled = (id: string) =>
        kept.some((item) => item.itemId === id && item.preventiveCondition);

    let requiredIds: string[] = [];
    if (!cooldown.core) {
        // Kunjungan preventif triwulan: hanya bila ada item preventif dikirim.
        if (kept.some((item) => preventiveIds.has(item.itemId))) {
            requiredIds = cooldown.signage
                ? coreIds
                : [...coreIds, ...SIGNAGE_ITEM_IDS];
        }
    } else if (!cooldown.signage) {
        // Toko sudah preventif tapi signage belum: I11–I13 wajib diisi sekali.
        requiredIds = [...SIGNAGE_ITEM_IDS];
    }

    const missing = requiredIds.find((id) => !isFilled(id));
    if (missing) {
        return {
            items: kept,
            error: {
                error: "Data laporan tidak lengkap",
                detail: `Item preventif ${missing} wajib diisi`,
            },
        };
    }

    return { items: kept };
}
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx lib/preventive-cooldown.spec.ts` → `preventive cooldown tests passed`

- [ ] **Step 5: Query masa jeda signage**

Ganti seluruh isi `lib/report-preventive-sql.ts` menjadi:

```ts
import "server-only";

import { Prisma } from "@prisma/client";
import { PREVENTIVE_REQUIRED_ITEM_IDS } from "@/lib/report-preventive";
import { SIGNAGE_ITEM_IDS } from "@/lib/signage";

type EvidenceColumns = {
    statusColumn: Prisma.Sql;
    itemsColumn: Prisma.Sql;
};

/** Laporan non-DRAFT yang berisi seluruh `itemIds` dengan kondisi preventif. */
function itemGroupEvidenceSql(
    input: EvidenceColumns,
    itemIds: readonly string[],
): Prisma.Sql {
    return Prisma.sql`
        ${input.statusColumn} <> 'DRAFT'::"ReportStatus"
        AND (
            SELECT COUNT(DISTINCT item->>'itemId')
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(${input.itemsColumn}) = 'array'
                    THEN ${input.itemsColumn}
                    ELSE '[]'::jsonb
                END
            ) AS item
            WHERE item->>'itemId' IN (${Prisma.join([...itemIds])})
              AND item->>'preventiveCondition' IN ('OK', 'NOT_OK', 'TIDAK_ADA')
        ) = ${itemIds.length}
    `;
}

export function completePreventiveEvidenceSql(input: EvidenceColumns): Prisma.Sql {
    return itemGroupEvidenceSql(input, PREVENTIVE_REQUIRED_ITEM_IDS);
}

/** Masa jeda signage: laporan non-DRAFT dengan I11–I13 lengkap. */
export function completeSignageEvidenceSql(input: EvidenceColumns): Prisma.Sql {
    return itemGroupEvidenceSql(input, SIGNAGE_ITEM_IDS);
}
```

Di `app/reports/actions/queries.ts`, tambahkan `completeSignageEvidenceSql` ke import yang sudah mengimpor `completePreventiveEvidenceSql`, lalu tambahkan tepat setelah fungsi `getLastCategoryIDate`:

```ts
export async function getLastSignageDate(storeCode: string) {
    await requireAuth();

    const [report] = await prisma.$queryRaw<Array<{ createdAt: Date }>>`
        SELECT r."createdAt"
        FROM "Report" r
        WHERE r."storeCode" = ${storeCode}
          AND ${completeSignageEvidenceSql({
              statusColumn: Prisma.sql`r."status"`,
              itemsColumn: Prisma.sql`r."items"`,
          })}
        ORDER BY r."createdAt" DESC
        LIMIT 1
    `;

    return report?.createdAt.toISOString() ?? null;
}
```

Di `app/reports/actions.ts`, pada blok `export { ... } from "./actions/queries";`, tambahkan `getLastSignageDate,` setelah `getLastCategoryIDate,`.

- [ ] **Step 6: Pakai di `submit.ts`**

Di `app/reports/actions/submit.ts`:

1. Ubah import `import { getLastCategoryIDate } from "./queries";` menjadi:

```ts
import { getLastCategoryIDate, getLastSignageDate } from "./queries";
import { resolvePreventiveSubmission } from "@/lib/preventive-cooldown";
```

2. Ganti seluruh blok mulai komentar `// ── Server-side cooldown validation (defense-in-depth) ────────────────` sampai `}` penutup cabang `else` (yaitu tepat sebelum `if (checklistItems.length === 0) {`) dengan:

```ts
    // ── Server-side cooldown validation (defense-in-depth) ────────────────
    // I1–I10 dan I11–I13 punya masa jeda kuartal masing-masing.
    const cooldown = { core: false, signage: false };
    if (data.storeCode) {
        const [lastCoreDate, lastSignageDate] = await Promise.all([
            getLastCategoryIDate(data.storeCode),
            getLastSignageDate(data.storeCode),
        ]);
        const now = new Date();
        cooldown.core =
            !!lastCoreDate && isSameJakartaQuarter(new Date(lastCoreDate), now);
        cooldown.signage =
            !!lastSignageDate &&
            isSameJakartaQuarter(new Date(lastSignageDate), now);
    }

    // Buang item kelompok yang masa jeda (cegah bypass UI) dan wajibkan
    // kelompok yang tampil.
    const preventiveSubmission = resolvePreventiveSubmission(
        data.checklistItems,
        cooldown,
    );
    if (preventiveSubmission.error) {
        return preventiveSubmission.error;
    }
    const checklistItems = preventiveSubmission.items;

    if (!cooldown.core) {
        // Quarterly visit: verify all non-preventive items are present.
        const preventiveItemIds = new Set(
            checklistCategories
                .filter((cat) => cat.isPreventive)
                .flatMap((cat) => cat.items.map((i) => i.id)),
        );
        const submittedIds = new Set(
            checklistItems
                .filter((item) => !preventiveItemIds.has(item.itemId))
                .map((item) => item.itemId),
        );
        const requiredNonPreventiveIds = checklistCategories
            .filter((cat) => !cat.isPreventive)
            .flatMap((cat) => cat.items.map((i) => i.id));

        const missingItem = requiredNonPreventiveIds.find(
            (id) => !submittedIds.has(id),
        );
        if (missingItem) {
            return {
                error: "Data laporan tidak lengkap",
                detail: `Item checklist ${missingItem} tidak ditemukan dalam laporan`,
            };
        }
    }
```

Pastikan tidak ada sisa referensi `isCoolingDown` di file (`grep -n isCoolingDown app/reports/actions/submit.ts` kosong) dan baris `const itemsJson = buildItemsJson({ ...data, checklistItems });` tetap ada (dicek oleh `submit-draft-source.spec.ts`).

- [ ] **Step 7: Verifikasi**

Run: `npx tsx lib/preventive-cooldown.spec.ts && npx tsx app/reports/actions/submit-draft-source.spec.ts && npx tsx lib/report-preventive.spec.ts && npx tsc --noEmit`
Expected: semua lolos; tsc tanpa error di luar `.next/`.

- [ ] **Step 8: Commit**

```bash
git add lib/preventive-cooldown.ts lib/preventive-cooldown.spec.ts lib/report-preventive-sql.ts app/reports/actions/queries.ts app/reports/actions.ts app/reports/actions/submit.ts docs/agent-notes/<note>.md
git commit -m "feat(reports): split preventive cooldown for signage items"
```

---

### Task 4: Form — item I yang tampil & validasi per kelompok

**Files:**
- Create: `app/reports/(bms)/create/hooks/preventive-visibility.ts`, `app/reports/(bms)/create/hooks/preventive-visibility.spec.ts`
- Modify: `app/reports/(bms)/create/hooks/use-checklist.ts`

**Interfaces:**
- Consumes: `getLastSignageDate` (Task 3, dari `@/app/reports/actions`), `isAhoRequiredForItem` (Task 1), `PREVENTIVE_REQUIRED_ITEM_IDS` (`lib/report-preventive.ts`).
- Produces:
  - `filterActiveCategories(categories: readonly ChecklistCategory[], state: { coreCooling: boolean; signageCooling: boolean; isEditMode: boolean; checklistItemIds: ReadonlySet<string> }): ChecklistCategory[]`
  - `useChecklist(stores, isEditMode?, initialStoreCode?, signageAhoRequired = false)` — return tambahan `isSignageCoolingDown: boolean`. `hasPreventiveItemsInChecklist` kini hanya I1–I10.

- [ ] **Step 1: Tulis test yang gagal**

Buat `app/reports/(bms)/create/hooks/preventive-visibility.spec.ts`:

```ts
import assert from "node:assert/strict";
import { checklistCategories, type ChecklistCategory } from "@/lib/checklist-data";
import { filterActiveCategories } from "./preventive-visibility";

const base = {
    coreCooling: false,
    signageCooling: false,
    isEditMode: false,
    checklistItemIds: new Set<string>(),
};
const preventiveIds = (cats: ChecklistCategory[]) =>
    cats.filter((cat) => cat.isPreventive).flatMap((cat) => cat.items.map((i) => i.id));
const core = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10"];
const signage = ["I11", "I12", "I13"];

// Tanpa masa jeda: semua kategori, kategori I utuh (objek sama).
let cats = filterActiveCategories(checklistCategories, base);
assert.equal(cats.length, checklistCategories.length);
assert.deepEqual(preventiveIds(cats), [...core, ...signage]);
assert.equal(
    cats.find((cat) => cat.isPreventive),
    checklistCategories.find((cat) => cat.isPreventive),
);

// Inti masa jeda: hanya I11–I13; kategori A tetap ada.
cats = filterActiveCategories(checklistCategories, { ...base, coreCooling: true });
assert.deepEqual(preventiveIds(cats), signage);
assert.ok(cats.some((cat) => cat.id === "A"));

// Keduanya masa jeda: kategori I hilang.
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    signageCooling: true,
});
assert.equal(cats.some((cat) => cat.isPreventive), false);

// Hanya signage masa jeda: I1–I10 saja.
cats = filterActiveCategories(checklistCategories, { ...base, signageCooling: true });
assert.deepEqual(preventiveIds(cats), core);

// Edit: kelompok masa jeda tetap tampil bila laporan berisi item kelompok itu.
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    isEditMode: true,
    checklistItemIds: new Set(["A1", "I1"]),
});
assert.deepEqual(preventiveIds(cats), [...core, ...signage]);
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    signageCooling: true,
    isEditMode: true,
    checklistItemIds: new Set(["I1"]),
});
assert.deepEqual(preventiveIds(cats), core);

console.log("preventive visibility tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts"` → FAIL (`Cannot find module './preventive-visibility'`).

- [ ] **Step 3: Implementasi `preventive-visibility.ts`**

```ts
import type { ChecklistCategory } from "@/lib/checklist-data";

type PreventiveVisibilityState = {
    /** I1–I10 sudah tercatat di kuartal berjalan. */
    coreCooling: boolean;
    /** I11–I13 sudah tercatat di kuartal berjalan. */
    signageCooling: boolean;
    isEditMode: boolean;
    /** Item yang sudah ada di checklist (laporan yang sedang diedit). */
    checklistItemIds: ReadonlySet<string>;
};

/**
 * Item kategori I yang tampil: I1–I10 dan I11–I13 punya masa jeda kuartal
 * sendiri. Saat edit/revisi, kelompok yang masa jeda tetap tampil bila laporan
 * sudah berisi item kelompok itu, agar data lama bisa direvisi.
 */
export function filterActiveCategories(
    categories: readonly ChecklistCategory[],
    state: PreventiveVisibilityState,
): ChecklistCategory[] {
    return categories.flatMap((category) => {
        if (!category.isPreventive) return [category];

        const isGroupVisible = (isSignage: boolean) => {
            const cooling = isSignage ? state.signageCooling : state.coreCooling;
            if (!cooling) return true;
            if (!state.isEditMode) return false;
            return category.items.some(
                (item) =>
                    Boolean(item.signage) === isSignage &&
                    state.checklistItemIds.has(item.id),
            );
        };

        const showCore = isGroupVisible(false);
        const showSignage = isGroupVisible(true);
        if (showCore && showSignage) return [category];

        const items = category.items.filter((item) =>
            item.signage ? showSignage : showCore,
        );
        return items.length > 0 ? [{ ...category, items }] : [];
    });
}
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts"` → `preventive visibility tests passed`

- [ ] **Step 5: Ubah `use-checklist.ts`**

5a. Ganti blok import di atas file menjadi:

```ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
    getLastCategoryIDate,
    getLastSignageDate,
} from "@/app/reports/actions";
import {
    getNextJakartaQuarterStart,
    isSameJakartaQuarter,
} from "@/lib/time";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import { PREVENTIVE_REQUIRED_ITEM_IDS } from "@/lib/report-preventive";
import { getSignageConfig, isAhoRequiredForItem } from "@/lib/signage";
import type { StoreOption } from "../components/types";
import {
    applySignageSelection,
    fillGroupAhoTicket,
    propagateGroupAhoTicket,
    type SignageChange,
} from "./signage-checklist";
import { filterActiveCategories } from "./preventive-visibility";
```

(`"use client";` di baris pertama tetap.)

5b. Ubah signature menjadi:

```ts
export function useChecklist(
    stores: StoreOption[],
    isEditMode?: boolean,
    initialStoreCode?: string,
    signageAhoRequired = false,
) {
```

5c. Setelah baris `const [isCategoryICoolingDown, setIsCategoryICoolingDown] = useState(false);` tambahkan:

```ts
    const [isSignageCoolingDown, setIsSignageCoolingDown] = useState(false);
```

5d. Ganti seluruh blok mulai `const preventiveItemIds = new Set(` sampai akhir deklarasi `const activeCategories = checklistCategories.filter(...);` dengan:

```ts
    // Item inti I1–I10 yang sudah ada di checklist (laporan yang sedang diedit).
    const hasPreventiveItemsInChecklist = PREVENTIVE_REQUIRED_ITEM_IDS.some(
        (itemId) => checklist.has(itemId),
    );

    const activeCategories = filterActiveCategories(checklistCategories, {
        coreCooling: isCategoryICoolingDown,
        signageCooling: isSignageCoolingDown,
        isEditMode: Boolean(isEditMode),
        checklistItemIds: new Set(checklist.keys()),
    });
```

5e. Di `handleStoreChange`, ganti seluruh `try { ... } catch { ... }` dengan:

```ts
            try {
                const [lastCoreDate, lastSignageDate] = await Promise.all([
                    getLastCategoryIDate(selectedStore.code),
                    getLastSignageDate(selectedStore.code),
                ]);
                const now = new Date();
                const coreCooling =
                    !!lastCoreDate &&
                    isSameJakartaQuarter(new Date(lastCoreDate), now);
                setIsCategoryICoolingDown(coreCooling);
                setIsSignageCoolingDown(
                    !!lastSignageDate &&
                        isSameJakartaQuarter(new Date(lastSignageDate), now),
                );
                setCategoryIAvailableDate(
                    coreCooling ? getNextJakartaQuarterStart(now) : null,
                );
            } catch {
                setIsCategoryICoolingDown(false);
                setIsSignageCoolingDown(false);
                setCategoryIAvailableDate(null);
            }
```

5f. Di `validateStep1`, di cabang `if (isCategoryICoolingDown) {`, sisipkan tepat sebelum komentar `// Cooldown aktif: item A–H tidak wajib diisi semua.`:

```ts
            // Signage I.11–I.13 yang tampil wajib diisi sekali per kuartal.
            for (const cat of activeCategories) {
                for (const catalogItem of cat.items) {
                    if (
                        !catalogItem.signage ||
                        checklist.get(catalogItem.id)?.condition
                    ) {
                        continue;
                    }
                    toast.error(
                        `Item "${catalogItem.name}" di kategori "${cat.title}" wajib diisi`,
                    );
                    if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                    scrollToItem(catalogItem.id);
                    return false;
                }
            }

```

5g. Di kedua cabang validasi, ganti pengecekan tiket:

- Cabang masa jeda: `if (!item.ahoTicketNumber?.trim()) {` →

```ts
                    if (
                        isAhoRequiredForItem(item.id, signageAhoRequired) &&
                        !item.ahoTicketNumber?.trim()
                    ) {
```

- Cabang triwulan: `if (!checkedItem.ahoTicketNumber?.trim()) {` →

```ts
                        if (
                            isAhoRequiredForItem(item.id, signageAhoRequired) &&
                            !checkedItem.ahoTicketNumber?.trim()
                        ) {
```

5h. Catatan signage Kotor wajib (kondisi form-nya `"baik"`, jadi tidak tertangkap cek `"rusak"`). Di kedua cabang, sisipkan tepat **setelah** blok cek foto kondisi Baik (`item.condition === "baik" && !item.photo && !item.photoUrl` di cabang masa jeda; `checkedItem.condition === "baik" && ...` di cabang triwulan):

- Cabang masa jeda:

```ts
                if (
                    item.condition === "baik" &&
                    item.signageCondition === "kotor" &&
                    !item.notes?.trim()
                ) {
                    toast.error(
                        `Item "${item.name}" kondisi Kotor wajib isi catatan`,
                    );
                    if (cat && !openCategories.has(cat.id))
                        toggleCategory(cat.id);
                    scrollToItem(item.id);
                    return false;
                }
```

- Cabang triwulan:

```ts
                    if (
                        checkedItem.condition === "baik" &&
                        checkedItem.signageCondition === "kotor" &&
                        !checkedItem.notes?.trim()
                    ) {
                        toast.error(
                            `Item "${item.name}" kondisi Kotor wajib isi catatan`,
                        );
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
```

5i. Pada dependency array `validateStep1`, tambahkan `signageAhoRequired,` setelah `isCategoryICoolingDown,`.

5j. Pada objek return, tambahkan `isSignageCoolingDown,` setelah `isCategoryICoolingDown,`.

- [ ] **Step 6: Verifikasi**

Run: `npx tsx "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts" && npx tsx "app/reports/(bms)/create/hooks/signage-checklist.spec.ts" && npx tsc --noEmit && npx eslint "app/reports/(bms)/create/hooks"`
Expected: spec lolos, tsc bersih di luar `.next/`. ESLint: satu-satunya error yang boleh ada adalah `react-hooks/set-state-in-effect` pada effect `initialStoreCode` yang sudah ada sebelumnya.

- [ ] **Step 7: Commit**

```bash
git add "app/reports/(bms)/create/hooks/preventive-visibility.ts" "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts" "app/reports/(bms)/create/hooks/use-checklist.ts" docs/agent-notes/<note>.md
git commit -m "feat(checklist): show signage items until filled each quarter"
```

---

### Task 5: UI — catatan signage, AHO opsional, info Mode Perbaikan, wiring flag

**Files:**
- Modify: `app/reports/(bms)/create/components/local-notes-textarea.tsx`
- Modify: `app/reports/(bms)/create/components/checklist-damage-fields.tsx`
- Modify: `app/reports/(bms)/create/components/signage-checklist-item.tsx`
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`
- Modify: `app/reports/(bms)/create/components/types.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Modify: `app/reports/(bms)/create/page.tsx`, `app/reports/(bms)/edit/[id]/page.tsx`, `app/reports/(bms)/revisi/[reportNumber]/page.tsx`

**Interfaces:**
- Consumes: `isSignageAhoRequired()` (Task 1), `getSignageNotePlaceholder()` (Task 1), `useChecklist(..., signageAhoRequired)` (Task 4).
- Produces: `ChecklistNotesField`, `ChecklistAhoField` (export baru dari `checklist-damage-fields.tsx`); prop `signageAhoRequired` pada `CreateReportFormProps`, `ChecklistStep`, `SignageChecklistItem`.

- [ ] **Step 1: `local-notes-textarea.tsx` — placeholder & selalu terbuka**

Ganti fungsi `LocalNotesTextarea` (seluruhnya) menjadi:

```tsx
export function LocalNotesTextarea({
    initialValue,
    onCommit,
    required = false,
    placeholder,
    alwaysOpen = false,
}: {
    initialValue: string;
    onCommit: (value: string) => void;
    required?: boolean;
    /** Ganti placeholder bawaan (mis. contoh catatan signage). */
    placeholder?: string;
    /** Tampilkan textarea langsung, tanpa tombol "Tambah Catatan". */
    alwaysOpen?: boolean;
}) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [prevInitial, setPrevInitial] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(alwaysOpen || !!initialValue);

    // Sync initialValue jika berubah dari luar (misal dari draft)
    if (initialValue !== prevInitial) {
        setLocalValue(initialValue);
        setPrevInitial(initialValue);
        if (initialValue) setIsEditing(true);
    }

    if (!isEditing) {
        return (
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed text-muted-foreground bg-transparent hover:bg-muted/50 justify-start h-9"
                onClick={() => setIsEditing(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                {required ? "Tambah Catatan" : "Tambah Catatan (opsional)"}
            </Button>
        );
    }

    return (
        <Textarea
            aria-required={required}
            placeholder={
                placeholder ??
                (required ? "Tambahkan catatan wajib..." : "Tambahkan catatan...")
            }
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                onCommit(localValue);
                if (!alwaysOpen && !required && !localValue.trim()) {
                    setIsEditing(false);
                }
            }}
            className="resize-none"
            rows={alwaysOpen ? 3 : 2}
        />
    );
}
```

- [ ] **Step 2: `checklist-damage-fields.tsx` — pecah jadi dua field**

Ganti seluruh isi file menjadi:

```tsx
"use client";

import { Label } from "@/components/ui/label";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { LocalAhoInput } from "./local-aho-input";

const FIELD_LABEL_CLASS =
  "text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase";

function RequiredMarker({ required }: { required: boolean }) {
  return required ? (
    <span className="text-destructive">*</span>
  ) : (
    <span className="font-medium normal-case tracking-normal">(opsional)</span>
  );
}

export function ChecklistNotesField({
  itemId,
  itemName,
  notes,
  required,
  placeholder,
  alwaysOpen,
  onNotesChange,
}: {
  itemId: string;
  itemName: string;
  notes?: string;
  required: boolean;
  placeholder?: string;
  alwaysOpen?: boolean;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-notes">
      <Label htmlFor={`${itemId}-note`} className={FIELD_LABEL_CLASS}>
        Catatan <RequiredMarker required={required} />
      </Label>
      <LocalNotesTextarea
        required={required}
        placeholder={placeholder}
        alwaysOpen={alwaysOpen}
        initialValue={notes || ""}
        onCommit={(val) => onNotesChange(itemId, itemName, val)}
      />
    </div>
  );
}

export function ChecklistAhoField({
  itemId,
  itemName,
  storeCode,
  ahoTicketNumber,
  lockedAhoTickets,
  required,
  onAhoTicketNumberChange,
}: {
  itemId: string;
  itemName: string;
  storeCode?: string;
  ahoTicketNumber?: string;
  lockedAhoTickets: Set<string>;
  required: boolean;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-aho">
      <Label htmlFor={`${itemId}-aho`} className={FIELD_LABEL_CLASS}>
        No Tiket AHO <RequiredMarker required={required} />
      </Label>
      <LocalAhoInput
        id={`${itemId}-aho`}
        storeCode={storeCode}
        initialValue={ahoTicketNumber || ""}
        selectedTickets={lockedAhoTickets}
        onCommit={(val) => onAhoTicketNumberChange(itemId, itemName, val)}
        required={required}
      />
    </div>
  );
}

export function ChecklistDamageFields({
  itemId,
  itemName,
  storeCode,
  notes,
  ahoTicketNumber,
  lockedAhoTickets,
  onNotesChange,
  onAhoTicketNumberChange,
}: {
  itemId: string;
  itemName: string;
  storeCode?: string;
  notes?: string;
  ahoTicketNumber?: string;
  lockedAhoTickets: Set<string>;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ChecklistNotesField
        itemId={itemId}
        itemName={itemName}
        notes={notes}
        required
        onNotesChange={onNotesChange}
      />
      <ChecklistAhoField
        itemId={itemId}
        itemName={itemName}
        storeCode={storeCode}
        ahoTicketNumber={ahoTicketNumber}
        lockedAhoTickets={lockedAhoTickets}
        required
        onAhoTicketNumberChange={onAhoTicketNumberChange}
      />
    </div>
  );
}
```

- [ ] **Step 3: `signage-checklist-item.tsx`**

3a. Ganti import `import { ChecklistDamageFields } from "./checklist-damage-fields";` menjadi:

```tsx
import {
  ChecklistAhoField,
  ChecklistNotesField,
} from "./checklist-damage-fields";
```

dan tambahkan `getSignageNotePlaceholder,` ke import yang sudah ada dari `"@/lib/signage"`.

3b. Tambahkan prop `signageAhoRequired`: di destructuring parameter setelah `lockedAhoTickets,` tambahkan `signageAhoRequired,`; di tipe props setelah `lockedAhoTickets: Set<string>;` tambahkan:

```tsx
  /** Flag env SIGNAGE_AHO_REQUIRED: No Tiket AHO wajib untuk Pudar/Rusak. */
  signageAhoRequired: boolean;
```

3c. Ganti blok terakhir:

```tsx
              {isDamaged ? (
                <ChecklistDamageFields
                  itemId={item.id}
                  itemName={item.name}
                  storeCode={storeCode}
                  notes={itemData?.notes}
                  ahoTicketNumber={itemData?.ahoTicketNumber}
                  lockedAhoTickets={lockedAhoTickets}
                  onNotesChange={onNotesChange}
                  onAhoTicketNumberChange={onAhoTicketNumberChange}
                />
              ) : null}
```

menjadi:

```tsx
              {isDamaged || condition === "kotor" ? (
                <div className="flex flex-col gap-2">
                  <ChecklistNotesField
                    itemId={item.id}
                    itemName={item.name}
                    notes={itemData?.notes}
                    required
                    alwaysOpen
                    placeholder={getSignageNotePlaceholder(condition)}
                    onNotesChange={onNotesChange}
                  />
                  {isDamaged ? (
                    <ChecklistAhoField
                      itemId={item.id}
                      itemName={item.name}
                      storeCode={storeCode}
                      ahoTicketNumber={itemData?.ahoTicketNumber}
                      lockedAhoTickets={lockedAhoTickets}
                      required={signageAhoRequired}
                      onAhoTicketNumberChange={onAhoTicketNumberChange}
                    />
                  ) : null}
                </div>
              ) : null}
```

- [ ] **Step 4: `checklist-step.tsx`**

4a. Di `ChecklistStepProps`, setelah baris `isRepairOnlyMode: boolean; // mapped from isCategoryICoolingDown (or similar intent)` tambahkan:

```tsx
  signageAhoRequired: boolean;
```

dan di destructuring `ChecklistStep({` tambahkan `signageAhoRequired,` setelah `isRepairOnlyMode,`.

4b. Tepat setelah baris `const hasSearch = searchQuery.trim().length > 0;` tambahkan:

```tsx
  // Toko sudah preventif I1–I10 kuartal ini tapi signage belum diisi.
  const hasPendingSignage =
    isRepairOnlyMode &&
    activeCategories.some((cat) => cat.items.some((item) => item.signage));
```

4c. Ganti teks info:

```tsx
                {isRepairOnlyMode
                  ? "Toko sudah mengisi item preventif. Anda cukup memilih item yang rusak dan mengisi detail perbaikannya."
                  : "Toko belum mengisi item preventif. Anda wajib mengevaluasi semua item checklist."}
```

menjadi:

```tsx
                {isRepairOnlyMode
                  ? hasPendingSignage
                    ? "Toko sudah mengisi item preventif I.1–I.10 kuartal ini. Item signage I.11–I.13 tetap wajib diisi sekali; item lain cukup pilih yang rusak."
                    : "Toko sudah mengisi item preventif. Anda cukup memilih item yang rusak dan mengisi detail perbaikannya."
                  : "Toko belum mengisi item preventif. Anda wajib mengevaluasi semua item checklist."}
```

4d. Pada `<SignageChecklistItem`, setelah prop `lockedAhoTickets={getLockedAhoTickets(...)}` tambahkan:

```tsx
                              signageAhoRequired={signageAhoRequired}
```

- [ ] **Step 5: Wiring flag dari halaman ke form**

5a. `app/reports/(bms)/create/components/types.ts` — di `CreateReportFormProps`, setelah `balanceInfo?: BmsBalanceInfo;` tambahkan:

```ts
  /** Flag env SIGNAGE_AHO_REQUIRED (dibaca server). */
  signageAhoRequired?: boolean;
```

5b. `app/reports/(bms)/create/create-form.tsx`:
- Di destructuring props, setelah `balanceInfo,` tambahkan `signageAhoRequired = false,`.
- Ubah `} = useChecklist(stores, isEditMode, initialStoreCode);` menjadi `} = useChecklist(stores, isEditMode, initialStoreCode, signageAhoRequired);`.
- Pada `<ChecklistStep`, setelah `isRepairOnlyMode={isRepairOnlyMode}` tambahkan `signageAhoRequired={signageAhoRequired}`.

5c. Di ketiga halaman, tambahkan import:

```tsx
import { isSignageAhoRequired } from "@/lib/signage-aho-flag";
```

lalu pada `<CreateReportForm`, tambahkan prop `signageAhoRequired={isSignageAhoRequired()}`:
- `app/reports/(bms)/create/page.tsx`: setelah `balanceInfo={balanceInfo}`.
- `app/reports/(bms)/edit/[id]/page.tsx` dan `app/reports/(bms)/revisi/[reportNumber]/page.tsx`: setelah `editMode={{ reportNumber: report.reportNumber }}`.

- [ ] **Step 6: Verifikasi**

Run: `npx tsc --noEmit && npx eslint "app/reports/(bms)/create" "app/reports/(bms)/edit" "app/reports/(bms)/revisi"`
Expected: tsc bersih di luar `.next/`. ESLint: tidak ada error baru; error lama yang boleh ada hanya `react-hooks/set-state-in-effect` di `use-checklist.ts` (~effect initialStoreCode), `local-aho-input.tsx`, dan `store-step.tsx`, plus warning unused import lama.

Browser (dicatat pending, dikerjakan controller/user):
- Kotor: kolom Catatan wajib (`*`) langsung tampil dengan placeholder Kotor; tanpa kolom AHO. Baik: tanpa catatan.
- Pudar/Rusak: Catatan wajib dengan placeholder masing-masing; No Tiket AHO tampil dengan label "(opsional)" saat env kosong.
- Kotor tanpa catatan → "Lanjutkan" menampilkan toast "kondisi Kotor wajib isi catatan".
- Toko yang sudah preventif kuartal ini: kategori I hanya berisi I.11–I.13 dan info Mode Perbaikan menyebut signage.

- [ ] **Step 7: Commit**

```bash
git add "app/reports/(bms)/create/components" "app/reports/(bms)/create/create-form.tsx" "app/reports/(bms)/create/page.tsx" "app/reports/(bms)/edit/[id]/page.tsx" "app/reports/(bms)/revisi/[reportNumber]/page.tsx" docs/agent-notes/<note>.md
git commit -m "feat(checklist): signage note examples and optional AHO field"
```

---

### Task 6: Verifikasi akhir

**Files:** —

- [ ] **Step 1: Semua spec**

```bash
for f in lib/signage-aho-flag.spec.ts lib/signage.spec.ts lib/preventive-cooldown.spec.ts lib/report-preventive.spec.ts lib/aho-ticket-groups.spec.ts lib/photo-guides.spec.ts app/reports/actions/types.spec.ts app/reports/actions/report-json-helpers.spec.ts app/reports/actions/submit-draft-source.spec.ts app/reports/actions/draft-autosave-schema.spec.ts "app/reports/(bms)/create/hooks/draft-data.spec.ts" "app/reports/(bms)/create/hooks/signage-checklist.spec.ts" "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts" lib/pdf/generate-report-pdf-gallery.spec.ts; do npx tsx "$f" 2>&1 | tail -1; done
```

Expected: setiap baris "... passed".

- [ ] **Step 2: Tipe & build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc bersih di luar `.next/`; build "Compiled successfully".

- [ ] **Step 3: Cek DB lokal (read-only, opsional)**

Untuk satu toko yang punya laporan preventif kuartal ini, panggil `getLastCategoryIDate` vs `getLastSignageDate` (lewat script tsx sementara di `.superpowers/sdd/`) dan pastikan signage `null` bila laporan lama tidak berisi I11–I13.
