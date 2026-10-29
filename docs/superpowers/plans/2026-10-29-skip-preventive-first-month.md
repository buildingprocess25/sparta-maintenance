# Skip Preventif Bulan Pertama Kuartal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BMS dapat melewati checklist preventif sekali per toko per kuartal, hanya di bulan pertama kuartal (WIB), dengan laporan yang ditandai untuk reviewer.

**Architecture:** Aturan kelayakan berada di modul pure `lib/preventive-skip.ts` yang dipakai client (form) dan server (submit). Pilihan skip disimpan di kolom baru `Report.preventiveSkipped` (juga pada draft) sehingga autosave, restore draft, revisi, dan badge reviewer membaca satu sumber. Laporan skip diproses seperti Mode Perbaikan: semua item kategori I dibuang dan tidak ada item wajib.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 + PostgreSQL, Zod, shadcn/ui, unit test berupa script `node:assert` dijalankan dengan `npx tsx`.

**Spec:** `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`

## Global Constraints

- Bulan pertama kuartal = Januari, April, Juli, Oktober, dihitung dalam zona Asia/Jakarta (pakai helper `lib/time.ts`, jangan `Date#getMonth`).
- Jatah skip: sekali per **toko** per kuartal. Terpakai bila ada laporan **non-DRAFT** toko itu dengan `preventiveSkipped = true` dan `createdAt` di kuartal berjalan.
- Skip menyembunyikan dan membuang **seluruh** kategori I (I1–I13, termasuk signage).
- Kelayakan di server dihitung dari waktu server saat submit, bukan `draftCreatedAt`.
- Revisi laporan skip tetap Mode Perbaikan; flag tidak berubah saat resubmit. Opsi skip tidak tersedia di mode revisi.
- Tidak ada field alasan. ActivityLog `SUBMITTED` memakai notes persis: `Preventif dilewati (bulan pertama kuartal)`.
- Badge reviewer berbunyi persis: `Preventif dilewati`.
- Jangan ubah `PREVENTIVE_REQUIRED_ITEM_IDS`, KPI, coverage, matriks, atau export.
- Jangan tambah padding/gap/margin manual pada komponen shadcn (lihat `AI_RULES.md`).
- Tiap task yang mengubah kode menyertakan satu catatan `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (waktu Asia/Jakarta, format seperti catatan yang sudah ada; lihat `AGENTS.md`).
- Commit tanpa baris atribusi/co-author.
- Typecheck: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (abaikan error di dalam `.next/`).

---

## File Map

| File | Tanggung jawab |
|---|---|
| `lib/preventive-skip.ts` (baru) | Aturan pure: bulan pertama kuartal, alasan penolakan skip, konstanta notes ActivityLog |
| `lib/preventive-skip.spec.ts` (baru) | Unit test aturan |
| `prisma/schema.prisma` + migrasi baru | Kolom `Report.preventiveSkipped` |
| `app/reports/actions/types.ts` | `DraftData.skipPreventive` + field schema Zod |
| `app/reports/actions/types.spec.ts` | Test bahwa schema mempertahankan `skipPreventive` |
| `app/reports/actions/queries.ts` + `app/reports/actions.ts` | Server action `hasSkippedPreventiveThisQuarter` + re-export |
| `app/reports/actions/submit.ts` | Validasi kelayakan, simpan flag, notes ActivityLog |
| `lib/reports/drive-draft-service.ts`, `lib/reports/drive-draft-prisma-repository.ts` | Teruskan flag saat promote draft |
| `app/reports/actions/draft.ts` | Simpan/kembalikan flag pada draft server |
| `app/reports/actions/resubmit.ts` | Buang item I pada revisi laporan skip |
| `app/reports/(bms)/create/components/types.ts` | `SerializedDraft.preventiveSkipped` |
| `app/reports/(bms)/create/hooks/use-checklist.ts` | State skip, kelayakan, kategori aktif, validasi |
| `app/reports/(bms)/create/hooks/use-draft.ts` | Persist/restore skip pada draft lokal & server |
| `app/reports/(bms)/create/create-form.tsx` | Wiring skip ke mode form dan ChecklistStep |
| `app/reports/(bms)/revisi/[reportNumber]/page.tsx` | Teruskan flag laporan ke form |
| `app/reports/(bms)/create/components/checklist-step.tsx` | Tombol "Lewati Preventif", dialog konfirmasi, banner |
| `app/dashboard/reports/[reportNumber]/queries.ts`, `_lib/detail-data.ts`, `_components/report-header.tsx` | Badge reviewer |

---

### Task 1: Aturan pure skip preventif

**Files:**
- Create: `lib/preventive-skip.ts`
- Test: `lib/preventive-skip.spec.ts`

**Interfaces:**
- Consumes: `getJakartaMonth(value: Date | string): number` dari `@/lib/time`
- Produces:
  - `isFirstMonthOfJakartaQuarter(now: Date | string): boolean`
  - `type PreventiveSkipInput = { coreCooling: boolean; alreadySkippedThisQuarter: boolean; now: Date }`
  - `getPreventiveSkipBlocker(input: PreventiveSkipInput): string | null`
  - `canSkipPreventive(input: PreventiveSkipInput): boolean`
  - `PREVENTIVE_SKIPPED_ACTIVITY_NOTE: "Preventif dilewati (bulan pertama kuartal)"`

- [ ] **Step 1: Tulis test yang gagal**

`lib/preventive-skip.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    PREVENTIVE_SKIPPED_ACTIVITY_NOTE,
    canSkipPreventive,
    getPreventiveSkipBlocker,
    isFirstMonthOfJakartaQuarter,
} from "./preventive-skip";

// Bulan pertama tiap kuartal (WIB).
for (const iso of [
    "2026-01-15T05:00:00Z",
    "2026-04-10T05:00:00Z",
    "2026-07-20T05:00:00Z",
    "2026-10-29T05:00:00Z",
]) {
    assert.equal(isFirstMonthOfJakartaQuarter(new Date(iso)), true, iso);
}

// Bulan ke-2 dan ke-3.
for (const iso of [
    "2026-02-15T05:00:00Z",
    "2026-03-15T05:00:00Z",
    "2026-11-15T05:00:00Z",
    "2026-12-15T05:00:00Z",
]) {
    assert.equal(isFirstMonthOfJakartaQuarter(new Date(iso)), false, iso);
}

// Batas zona waktu: 31 Okt 23:59 WIB masih bulan pertama, 1 Nov 00:00 WIB bukan.
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-10-31T16:59:00Z")),
    true,
);
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-10-31T17:00:00Z")),
    false,
);
// 31 Mar 17:00 UTC = 1 Apr 00:00 WIB: bulan pertama Q2.
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-03-31T17:00:00Z")),
    true,
);

const october = new Date("2026-10-29T05:00:00Z");
const november = new Date("2026-11-02T05:00:00Z");
const eligible = {
    coreCooling: false,
    alreadySkippedThisQuarter: false,
    now: october,
};

assert.equal(getPreventiveSkipBlocker(eligible), null);
assert.equal(canSkipPreventive(eligible), true);

assert.equal(
    getPreventiveSkipBlocker({ ...eligible, coreCooling: true }),
    "Toko sudah mengisi preventif di kuartal ini.",
);
assert.equal(
    getPreventiveSkipBlocker({ ...eligible, now: november }),
    "Lewati preventif hanya bisa di bulan pertama kuartal (Januari, April, Juli, Oktober).",
);
assert.equal(
    getPreventiveSkipBlocker({ ...eligible, alreadySkippedThisQuarter: true }),
    "Toko ini sudah pernah melewati preventif di kuartal ini.",
);
assert.equal(
    canSkipPreventive({ ...eligible, alreadySkippedThisQuarter: true }),
    false,
);

assert.equal(
    PREVENTIVE_SKIPPED_ACTIVITY_NOTE,
    "Preventif dilewati (bulan pertama kuartal)",
);

console.log("preventive skip tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/preventive-skip.spec.ts`
Expected: FAIL dengan `Cannot find module './preventive-skip'`.

- [ ] **Step 3: Implementasi minimal**

`lib/preventive-skip.ts`:

```ts
import { getJakartaMonth } from "@/lib/time";

export const PREVENTIVE_SKIPPED_ACTIVITY_NOTE =
    "Preventif dilewati (bulan pertama kuartal)";

export type PreventiveSkipInput = {
    /** I1–I10 sudah tercatat di kuartal berjalan. */
    coreCooling: boolean;
    /** Toko sudah punya laporan non-draft yang melewati preventif kuartal ini. */
    alreadySkippedThisQuarter: boolean;
    now: Date;
};

/** Januari, April, Juli, Oktober (WIB). */
export function isFirstMonthOfJakartaQuarter(now: Date | string) {
    return (getJakartaMonth(now) - 1) % 3 === 0;
}

/**
 * Alasan BMS tidak boleh melewati preventif, atau null bila boleh.
 * Mode revisi ditangani pemanggil (client), bukan di sini.
 */
export function getPreventiveSkipBlocker(
    input: PreventiveSkipInput,
): string | null {
    if (input.coreCooling) {
        return "Toko sudah mengisi preventif di kuartal ini.";
    }
    if (!isFirstMonthOfJakartaQuarter(input.now)) {
        return "Lewati preventif hanya bisa di bulan pertama kuartal (Januari, April, Juli, Oktober).";
    }
    if (input.alreadySkippedThisQuarter) {
        return "Toko ini sudah pernah melewati preventif di kuartal ini.";
    }
    return null;
}

export function canSkipPreventive(input: PreventiveSkipInput) {
    return getPreventiveSkipBlocker(input) === null;
}
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx lib/preventive-skip.spec.ts`
Expected: `preventive skip tests passed`

- [ ] **Step 5: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-rules.md` (Scope, Context and Sources → spec + plan Task 1, Changed Files, Decisions, Verification, Remaining Work).

```bash
git add lib/preventive-skip.ts lib/preventive-skip.spec.ts docs/agent-notes/
git commit -m "feat(checklist): preventive skip eligibility rules"
```

---

### Task 2: Kolom DB, kontrak DraftData, dan query jatah skip

**Files:**
- Modify: `prisma/schema.prisma` (model `Report`, dekat `fullPdfDriveUrl`)
- Create: `prisma/migrations/<timestamp>_add_report_preventive_skipped/migration.sql` (dibuat oleh Prisma)
- Modify: `app/reports/actions/types.ts:36-46` (type `DraftData`) dan `:313-327` (objek Zod di `buildDraftDataSchema`)
- Modify: `app/reports/actions/queries.ts` (tambah fungsi setelah `getLastSignageDate`, ±baris 280)
- Modify: `app/reports/actions.ts` (blok re-export yang berisi `getLastCategoryIDate`)
- Test: `app/reports/actions/types.spec.ts`

**Interfaces:**
- Produces:
  - Prisma `Report.preventiveSkipped: boolean` (default `false`)
  - `DraftData.skipPreventive?: boolean`
  - `hasSkippedPreventiveThisQuarter(storeCode: string): Promise<boolean>` (server action, diekspor juga dari `@/app/reports/actions`)

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan sebelum baris `console.log("report action type tests passed");` di `app/reports/actions/types.spec.ts`:

```ts
// skipPreventive tidak boleh dibuang oleh schema (dipakai submit & autosave).
{
    const parsedSubmit = draftDataSchema.safeParse({
        ...makeDraft([makeItem()]),
        skipPreventive: true,
    });
    assert.equal(parsedSubmit.success, true);
    assert.equal(parsedSubmit.data?.skipPreventive, true);

    const parsedAutosave = draftAutosaveDataSchema.safeParse({
        ...makeDraft([makeItem()]),
        skipPreventive: true,
    });
    assert.equal(parsedAutosave.data?.skipPreventive, true);

    assert.equal(
        draftDataSchema.safeParse({
            ...makeDraft([makeItem()]),
            skipPreventive: "ya",
        }).success,
        false,
    );
}
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx app/reports/actions/types.spec.ts`
Expected: FAIL pada `assert.equal(parsedSubmit.data?.skipPreventive, true)` (nilai `undefined` karena Zod membuang key yang tidak dikenal).

- [ ] **Step 3: Tambah field di type dan schema**

Di `app/reports/actions/types.ts`, type `DraftData` (setelah `draftCreatedAt`):

```ts
    /** BMS memilih lewati preventif (bulan pertama kuartal). Divalidasi ulang di server. */
    skipPreventive?: boolean;
```

Di objek Zod `buildDraftDataSchema` (setelah `draftCreatedAt: z.string().datetime().optional(),`):

```ts
            skipPreventive: z.boolean().optional(),
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx app/reports/actions/types.spec.ts`
Expected: `report action type tests passed`

- [ ] **Step 5: Tambah kolom Prisma dan migrasi**

Di `prisma/schema.prisma`, model `Report`, setelah baris `fullPdfDriveUrl String?`:

```prisma

  // BMS melewati checklist preventif (hanya bulan pertama kuartal, sekali per toko).
  preventiveSkipped Boolean @default(false)
```

Run: `npx prisma migrate dev --name add_report_preventive_skipped`
Expected: migrasi baru dibuat dan diterapkan; `migration.sql` berisi:

```sql
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "preventiveSkipped" BOOLEAN NOT NULL DEFAULT false;
```

Lalu `npm run db:generate`. (Bila DB dev tidak bisa dijangkau, buat folder `prisma/migrations/<YYYYMMDDHHMMSS>_add_report_preventive_skipped/migration.sql` dengan SQL di atas secara manual, jalankan `npm run db:generate`, dan catat di agent note bahwa migrasi belum diterapkan.)

- [ ] **Step 6: Tambah query jatah skip**

Di `app/reports/actions/queries.ts` setelah `getLastSignageDate` (import `getJakartaCurrentQuarter`, `getJakartaQuarterWindow`, `getJakartaYear` sudah ada):

```ts
/** Toko sudah memakai jatah lewati preventif di kuartal berjalan (laporan non-draft). */
export async function hasSkippedPreventiveThisQuarter(storeCode: string) {
    await requireAuth();

    const now = new Date();
    const { start, endExclusive } = getJakartaQuarterWindow(
        getJakartaYear(now),
        getJakartaCurrentQuarter(now),
    );

    const report = await prisma.report.findFirst({
        where: {
            storeCode,
            preventiveSkipped: true,
            status: { not: "DRAFT" },
            createdAt: { gte: start, lt: endExclusive },
        },
        select: { reportNumber: true },
    });

    return report !== null;
}
```

Di `app/reports/actions.ts`, pada blok re-export yang memuat `getLastCategoryIDate, getLastSignageDate,` tambahkan `hasSkippedPreventiveThisQuarter,` tepat setelah `getLastSignageDate,`.

- [ ] **Step 7: Typecheck**

Run: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
Expected: tidak ada error baru di luar `.next/`.

- [ ] **Step 8: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-data.md`.

```bash
git add prisma/schema.prisma prisma/migrations app/reports/actions/types.ts app/reports/actions/types.spec.ts app/reports/actions/queries.ts app/reports/actions.ts docs/agent-notes/
git commit -m "feat(reports): store preventive skip flag on report"
```

---

### Task 3: Penegakan di server (submit, draft, promote, resubmit)

**Files:**
- Modify: `app/reports/actions/submit.ts:111-163` (cooldown & validasi), `:212-268` (promote/create & ActivityLog)
- Modify: `lib/reports/drive-draft-service.ts:23-33` (`PromoteDriveDraftInput`)
- Modify: `lib/reports/drive-draft-prisma-repository.ts:101-114` (`promoteDraft`)
- Modify: `app/reports/actions/draft.ts` (dua `select` draft, `saveServerDraft` update data, `DraftRecord`, `serializeDraft`)
- Modify: `app/reports/(bms)/create/components/types.ts:28` (`SerializedDraft`)
- Modify: `app/reports/actions/resubmit.ts:37-46` (select) dan `:85-88` (sebelum `buildItemsJson`)

**Interfaces:**
- Consumes: `getPreventiveSkipBlocker`, `PREVENTIVE_SKIPPED_ACTIVITY_NOTE` (Task 1); `hasSkippedPreventiveThisQuarter`, `DraftData.skipPreventive`, kolom `preventiveSkipped` (Task 2); `resolvePreventiveSubmission(items, { core, signage })` dari `@/lib/preventive-cooldown` (sudah ada, tidak diubah)
- Produces:
  - `SerializedDraft.preventiveSkipped?: boolean`
  - `PromoteDriveDraftInput.preventiveSkipped?: boolean`
  - Error submit `{ error: "Preventif tidak dapat dilewati", detail: <alasan> }`

- [ ] **Step 1: Validasi skip di `submit.ts`**

Tambah import:

```ts
import { getLastCategoryIDate, getLastSignageDate, hasSkippedPreventiveThisQuarter } from "./queries";
import {
    PREVENTIVE_SKIPPED_ACTIVITY_NOTE,
    getPreventiveSkipBlocker,
} from "@/lib/preventive-skip";
```

(ganti baris import `./queries` yang lama.)

Ganti blok dari komentar `// Buang item kelompok yang masa jeda` sampai `if (!cooldown.core) {` menjadi:

```ts
    // ── Lewati preventif: bulan pertama kuartal, sekali per toko ──────────
    let preventiveSkipped = false;
    if (data.skipPreventive) {
        const blocker = getPreventiveSkipBlocker({
            coreCooling: cooldown.core,
            alreadySkippedThisQuarter: data.storeCode
                ? await hasSkippedPreventiveThisQuarter(data.storeCode)
                : false,
            now: new Date(),
        });
        if (blocker) {
            return { error: "Preventif tidak dapat dilewati", detail: blocker };
        }
        preventiveSkipped = true;
    }

    // Buang item kelompok yang masa jeda (cegah bypass UI) dan wajibkan
    // kelompok yang tampil. Laporan skip diperlakukan seperti keduanya jeda.
    const preventiveSubmission = resolvePreventiveSubmission(
        data.checklistItems,
        preventiveSkipped ? { core: true, signage: true } : cooldown,
    );
    if (preventiveSubmission.error) {
        return preventiveSubmission.error;
    }
    const checklistItems = preventiveSubmission.items;

    if (!cooldown.core && !preventiveSkipped) {
```

(Isi blok `if` di bawahnya — cek item A–H lengkap — tidak berubah.)

- [ ] **Step 2: Simpan flag dan notes ActivityLog di `submit.ts`**

Di pemanggilan `promoteDriveDraft(...)`, tambahkan setelah `balancePeriodId: activePeriodId,`:

```ts
                preventiveSkipped,
```

Di `tx.report.create({ data: { ... } })`, tambahkan setelah `balancePeriodId: activePeriodId,`:

```ts
                preventiveSkipped,
```

Pada **kedua** `tx.activityLog.create` dengan `action: "SUBMITTED"`, ganti `notes: null,` menjadi:

```ts
                    notes: preventiveSkipped
                        ? PREVENTIVE_SKIPPED_ACTIVITY_NOTE
                        : null,
```

- [ ] **Step 3: Teruskan flag saat promote draft**

`lib/reports/drive-draft-service.ts`, `PromoteDriveDraftInput`, setelah `balancePeriodId?: string | null;`:

```ts
  preventiveSkipped?: boolean;
```

`lib/reports/drive-draft-prisma-repository.ts`, di `promoteDraft` setelah baris spread `balancePeriodId`:

```ts
          ...(input.preventiveSkipped !== undefined ? { preventiveSkipped: input.preventiveSkipped } : {}),
```

(Submit selalu mengirim nilai, sehingga flag `true` dari autosave draft ter-reset ke `false` bila submit akhirnya tidak skip.)

- [ ] **Step 4: Draft server menyimpan dan mengembalikan flag**

`app/reports/(bms)/create/components/types.ts`, `SerializedDraft`, setelah `updatedAt: string;`:

```ts
  /** Laporan/draft memakai lewati preventif. */
  preventiveSkipped?: boolean;
```

`app/reports/actions/draft.ts`:
- Pada **kedua** `select` di `getDraft` dan `getDraftByReportNumber`, tambahkan `preventiveSkipped: true,` setelah `updatedAt: true,`.
- `DraftRecord`: tambahkan `preventiveSkipped: boolean;` setelah `updatedAt: Date;`.
- `serializeDraft`: tambahkan `preventiveSkipped: draft.preventiveSkipped,` setelah `updatedAt: draft.updatedAt.toISOString(),`.
- `saveServerDraft`, objek `data` di `prisma.report.updateMany`: tambahkan setelah `estimations: estimationsJson,`:

```ts
                preventiveSkipped: parsed.data.skipPreventive ?? false,
```

- [ ] **Step 5: Revisi laporan skip membuang item I**

`app/reports/actions/resubmit.ts`:
- Tambah import: `import { resolvePreventiveSubmission } from "@/lib/preventive-cooldown";`
- Di `select` laporan, tambahkan `preventiveSkipped: true,`.
- Ganti `data = parsed.data;` menjadi:

```ts
        data = parsed.data;

        // Laporan skip tetap tanpa kategori I saat revisi (cegah bypass UI).
        if (report.preventiveSkipped) {
            data = {
                ...data,
                checklistItems: resolvePreventiveSubmission(
                    data.checklistItems,
                    { core: true, signage: true },
                ).items,
            };
        }
```

(`report.update` di resubmit tidak menyentuh `preventiveSkipped`, jadi flag tetap.)

- [ ] **Step 6: Jalankan test terkait dan typecheck**

Run:
- `npx tsx lib/preventive-cooldown.spec.ts`
- `npx tsx lib/reports/drive-draft-service.spec.ts`
- `npx tsx app/reports/actions/submit-draft-source.spec.ts`
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`

Expected: semua script mencetak pesan "passed"-nya masing-masing; tsc tanpa error baru di luar `.next/`.

- [ ] **Step 7: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-server.md`.

```bash
git add app/reports/actions/submit.ts app/reports/actions/draft.ts app/reports/actions/resubmit.ts lib/reports/drive-draft-service.ts lib/reports/drive-draft-prisma-repository.ts "app/reports/(bms)/create/components/types.ts" docs/agent-notes/
git commit -m "feat(reports): enforce preventive skip on submit"
```

---

### Task 4: State skip di form BMS (hook, draft, revisi)

**Files:**
- Modify: `app/reports/(bms)/create/hooks/use-checklist.ts`
- Modify: `app/reports/(bms)/create/hooks/use-draft.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx:64-104, 265`
- Modify: `app/reports/(bms)/revisi/[reportNumber]/page.tsx:26-40, 59-66`

**Interfaces:**
- Consumes: `canSkipPreventive` (Task 1); `hasSkippedPreventiveThisQuarter` dari `@/app/reports/actions`, `DraftData.skipPreventive` (Task 2); `SerializedDraft.preventiveSkipped` (Task 3)
- Produces (return `useChecklist`):
  - `canSkipPreventive: boolean` — opsi skip boleh ditampilkan (selalu `false` di mode revisi)
  - `isPreventiveSkipped: boolean` — skip efektif aktif
  - `setSkipPreventive: (value: boolean) => void`
- Produces (`useDraft` param baru): `skipPreventive: boolean`, `setSkipPreventive: (value: boolean) => void`

- [ ] **Step 1: State dan kelayakan di `use-checklist.ts`**

Import:

```ts
import {
    getLastCategoryIDate,
    getLastSignageDate,
    hasSkippedPreventiveThisQuarter,
} from "@/app/reports/actions";
import { canSkipPreventive as isSkipEligible } from "@/lib/preventive-skip";
```

Setelah state `categoryIAvailableDate`:

```ts
    const [skipPreventive, setSkipPreventive] = useState(false);
    const [isSkipAllowed, setIsSkipAllowed] = useState(false);

    // Revisi: skip mengikuti flag laporan. Laporan baru: hanya bila masih layak.
    const isPreventiveSkipped = isEditMode
        ? skipPreventive
        : skipPreventive && isSkipAllowed;
    const canSkipPreventive = !isEditMode && isSkipAllowed;
```

Ganti argumen `filterActiveCategories`:

```ts
    const activeCategories = filterActiveCategories(checklistCategories, {
        coreCooling: isCategoryICoolingDown || isPreventiveSkipped,
        signageCooling: isSignageCoolingDown || isPreventiveSkipped,
        isEditMode: Boolean(isEditMode),
        checklistItemIds: new Set(checklist.keys()),
    });
```

Di `handleStoreChange`, tepat setelah `setStore(selectedStore.name);` tambahkan `setSkipPreventive(false);`. Ganti isi blok `try`/`catch`:

```ts
            try {
                const [lastCoreDate, lastSignageDate, alreadySkipped] =
                    await Promise.all([
                        getLastCategoryIDate(selectedStore.code),
                        getLastSignageDate(selectedStore.code),
                        hasSkippedPreventiveThisQuarter(selectedStore.code),
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
                setIsSkipAllowed(
                    isSkipEligible({
                        coreCooling,
                        alreadySkippedThisQuarter: alreadySkipped,
                        now,
                    }),
                );
            } catch {
                setIsCategoryICoolingDown(false);
                setIsSignageCoolingDown(false);
                setCategoryIAvailableDate(null);
                setIsSkipAllowed(false);
            }
```

Di `validateStep1`, ganti `if (isCategoryICoolingDown) {` menjadi `if (isCategoryICoolingDown || isPreventiveSkipped) {`, dan tambahkan `isPreventiveSkipped,` ke dependency array `useCallback` setelah `isCategoryICoolingDown,`.

Di objek return, setelah `categoryIAvailableDate,`:

```ts
        canSkipPreventive,
        isPreventiveSkipped,
        setSkipPreventive,
```

- [ ] **Step 2: Persist/restore skip di `use-draft.ts`**

Di `UseDraftParams`, setelah `handleStoreChange: ...;`:

```ts
    /** Pilihan lewati preventif, ikut disimpan di draft. */
    skipPreventive: boolean;
    setSkipPreventive: (value: boolean) => void;
```

Tambahkan `skipPreventive,` dan `setSkipPreventive,` ke destrukturisasi parameter `useDraft` (setelah `handleStoreChange,`).

Di `handleContinueDraft`, tepat setelah blok `if (sourceDraft.storeCode) { ... }` (setelah `await handleStoreChange(s.code)` beserta kurung penutupnya):

```ts
                setSkipPreventive(
                    isServerSource
                        ? Boolean(existingDraft?.preventiveSkipped)
                        : Boolean(localDraftData?.skipPreventive),
                );
```

Tambahkan `setSkipPreventive` ke dependency array `handleContinueDraft`.

Di effect autosave localStorage, objek `draftDataPayload`, setelah `draftCreatedAt,` tambahkan `skipPreventive,`; tambahkan `skipPreventive` ke dependency array effect itu.

Di `buildDraftData`, objek return, setelah `draftCreatedAt,` tambahkan `skipPreventive,`; tambahkan `skipPreventive` ke dependency array-nya.

- [ ] **Step 3: Wiring di `create-form.tsx`**

Pada destrukturisasi `useChecklist(...)`, tambahkan setelah `isCategoryICoolingDown,`:

```tsx
    canSkipPreventive,
    isPreventiveSkipped,
    setSkipPreventive,
```

Pada pemanggilan `useDraft({...})`, tambahkan setelah `handleStoreChange,`:

```tsx
    skipPreventive: isPreventiveSkipped,
    setSkipPreventive,
```

Tambahkan `isPreventiveSkipped` ke dependency array effect `markDirty` (yang berisi `bmsItems, checklist, grandTotalBms, ...`) supaya toggle skip memicu autosave server.

Ganti baris `isRepairOnlyMode`:

```tsx
  const isRepairOnlyMode =
    (isCategoryICoolingDown || isPreventiveSkipped) &&
    (!isEditMode || !hasPreventiveItemsInChecklist);
```

- [ ] **Step 4: Halaman revisi meneruskan flag**

`app/reports/(bms)/revisi/[reportNumber]/page.tsx`: di `select` tambahkan `preventiveSkipped: true,` setelah `updatedAt: true,`; di `serializedReport` tambahkan `preventiveSkipped: report.preventiveSkipped,` setelah baris `updatedAt: formatJakartaDateTime(report.updatedAt),`.

- [ ] **Step 5: Typecheck dan test hook terkait**

Run:
- `npx tsx "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts"`
- `npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts"`
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`

Expected: kedua script lolos; tsc tanpa error baru di luar `.next/`.

- [ ] **Step 6: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-form-state.md`.

```bash
git add "app/reports/(bms)/create/hooks/use-checklist.ts" "app/reports/(bms)/create/hooks/use-draft.ts" "app/reports/(bms)/create/create-form.tsx" "app/reports/(bms)/revisi/[reportNumber]/page.tsx" docs/agent-notes/
git commit -m "feat(checklist): preventive skip state in BMS form"
```

---

### Task 5: UI tombol "Lewati Preventif" di langkah checklist

**Files:**
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx:38-42` (props), `:77-80` (destrukturisasi), `:127-130`, `:185-206` (kartu banner mode)
- Modify: `app/reports/(bms)/create/create-form.tsx:372-394` (props `<ChecklistStep>`)

**Interfaces:**
- Consumes: `canSkipPreventive`, `isPreventiveSkipped`, `setSkipPreventive` dari `useChecklist` (Task 4)
- Produces: props `ChecklistStep` baru `canSkipPreventive: boolean`, `isPreventiveSkipped: boolean`, `onSkipPreventiveChange: (skip: boolean) => void`

- [ ] **Step 1: Props dan import**

Di `ChecklistStepProps`, setelah `isRepairOnlyMode: boolean; ...`:

```tsx
  /** Opsi lewati preventif tersedia (bulan pertama kuartal, jatah toko belum dipakai). */
  canSkipPreventive: boolean;
  isPreventiveSkipped: boolean;
  onSkipPreventiveChange: (skip: boolean) => void;
```

Tambahkan ketiganya ke destrukturisasi `ChecklistStep({ ... })` setelah `isRepairOnlyMode,`.

Tambah import (cek dulu `Button` sudah di-import — sudah, dipakai tombol Autofill):

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

- [ ] **Step 2: `hasPendingSignage` tidak berlaku saat skip**

Ganti:

```tsx
  const hasPendingSignage =
    isRepairOnlyMode &&
    activeCategories.some((cat) => cat.items.some((item) => item.signage));
```

menjadi:

```tsx
  const hasPendingSignage =
    isRepairOnlyMode &&
    !isPreventiveSkipped &&
    activeCategories.some((cat) => cat.items.some((item) => item.signage));
```

- [ ] **Step 3: Banner mode dengan aksi skip**

Ganti seluruh isi `<div className="min-w-0">` di kartu banner mode (yang berisi `<h3>` "Mode Perbaikan"/"Mode Checklist Wajib" dan `<p>` penjelasan) menjadi:

```tsx
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  {isPreventiveSkipped
                    ? "Mode Perbaikan · Preventif dilewati"
                    : isRepairOnlyMode
                      ? "Mode Perbaikan"
                      : "Mode Checklist Wajib"}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isPreventiveSkipped
                    ? "Preventif toko ini dilewati untuk laporan ini. Cukup pilih item yang rusak. Checklist preventif tetap wajib di kunjungan berikutnya kuartal ini."
                    : isRepairOnlyMode
                      ? hasPendingSignage
                        ? "Toko sudah mengisi item preventif I.1–I.10 kuartal ini. Item signage I.11–I.13 tetap wajib diisi sekali; item lain cukup pilih yang rusak."
                        : "Toko sudah mengisi item preventif. Anda cukup memilih item yang rusak dan mengisi detail perbaikannya."
                      : "Toko belum mengisi item preventif. Anda wajib mengevaluasi semua item checklist."}
                </p>
              </div>

              {canSkipPreventive && !isPreventiveSkipped ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="self-start">
                      Lewati Preventif
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Lewati checklist preventif?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Gunakan hanya untuk perbaikan urgent/insidentil. Opsi ini
                        hanya ada di bulan pertama kuartal dan hanya sekali per
                        toko per kuartal. Laporan akan ditandai &quot;Preventif
                        dilewati&quot; untuk BMC dan BNM, dan checklist preventif
                        tetap wajib di kunjungan berikutnya.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onSkipPreventiveChange(true)}>
                        Lewati Preventif
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              {canSkipPreventive && isPreventiveSkipped ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => onSkipPreventiveChange(false)}
                >
                  Batalkan, isi checklist lengkap
                </Button>
              ) : null}
            </div>
```

(`canSkipPreventive` selalu `false` di mode revisi, jadi tombol tidak muncul di sana.)

- [ ] **Step 4: Teruskan props dari `create-form.tsx`**

Pada `<ChecklistStep ...>`, setelah `isRepairOnlyMode={isRepairOnlyMode}`:

```tsx
            canSkipPreventive={canSkipPreventive}
            isPreventiveSkipped={isPreventiveSkipped}
            onSkipPreventiveChange={setSkipPreventive}
```

- [ ] **Step 5: Typecheck dan lint**

Run:
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
- `npx eslint "app/reports/(bms)/create/components/checklist-step.tsx" "app/reports/(bms)/create/create-form.tsx"`

Expected: tidak ada error baru.

- [ ] **Step 6: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-ui.md`.

```bash
git add "app/reports/(bms)/create/components/checklist-step.tsx" "app/reports/(bms)/create/create-form.tsx" docs/agent-notes/
git commit -m "feat(checklist): skip preventive button and banner"
```

---

### Task 6: Badge "Preventif dilewati" untuk reviewer

**Files:**
- Modify: `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts:114-148` (`RawReportDetailInput`)
- Modify: `app/dashboard/reports/[reportNumber]/queries.ts:30-60` (select) dan `:112-125` (objek `raw`)
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-header.tsx:92` (setelah badge status)

**Interfaces:**
- Consumes: kolom `Report.preventiveSkipped` (Task 2)
- Produces: `RawReportDetailInput.preventiveSkipped?: boolean` (opsional agar fixture test dan builder lain tidak perlu diubah)

- [ ] **Step 1: Model dan query detail**

`detail-data.ts`, `RawReportDetailInput`, setelah `status: string;`:

```ts
    /** BMS melewati checklist preventif untuk laporan ini. */
    preventiveSkipped?: boolean;
```

`queries.ts`: di `select` tambahkan `preventiveSkipped: true,` setelah `pjumExportedAt: true,`; di objek `raw` tambahkan `preventiveSkipped: report.preventiveSkipped,` setelah `status: report.status,`.

- [ ] **Step 2: Badge di header**

`report-header.tsx`: tambahkan `CalendarX2` ke import `lucide-react` yang sudah ada. Tepat setelah `</Badge>` badge status (`{statusLabel}`), sebelum `{isRekananWithoutBmsCost ? (`:

```tsx
                        {report.preventiveSkipped ? (
                            <Badge
                                variant="outline"
                                className="h-6 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                title="BMS melewati checklist preventif (bulan pertama kuartal). Preventif toko tetap wajib di kunjungan berikutnya."
                            >
                                <CalendarX2 data-icon="inline-start" />
                                Preventif dilewati
                            </Badge>
                        ) : null}
```

- [ ] **Step 3: Test dan typecheck**

Run:
- `npx tsx "app/dashboard/reports/[reportNumber]/_lib/detail-data.spec.ts"`
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`

Expected: spec lolos; tsc tanpa error baru.

- [ ] **Step 4: Catatan agent dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-badge.md`.

```bash
git add "app/dashboard/reports/[reportNumber]" docs/agent-notes/
git commit -m "feat(reports): show preventive skipped badge to reviewers"
```

---

### Task 7: Verifikasi end-to-end

**Files:** tidak ada perubahan kode kecuali perbaikan yang ditemukan (catat di agent note task terkait).

- [ ] **Step 1: Jalankan semua unit test terkait**

```bash
npx tsx lib/preventive-skip.spec.ts
npx tsx lib/preventive-cooldown.spec.ts
npx tsx app/reports/actions/types.spec.ts
npx tsx "app/reports/(bms)/create/hooks/preventive-visibility.spec.ts"
npx tsx "app/dashboard/reports/[reportNumber]/_lib/detail-data.spec.ts"
```

Expected: setiap script mencetak pesan "passed".

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 3: Uji manual di browser (`npm run dev`, login sebagai BMS)**

Tanggal hari ini harus di bulan pertama kuartal (mis. Oktober). Untuk bulan ke-2/3, sementara ubah `now` lokal (mis. `new Date("2026-11-05T05:00:00Z")`) di `handleStoreChange` dan `submit.ts`, lalu kembalikan.

1. Pilih toko yang belum preventif kuartal ini → banner "Mode Checklist Wajib" + tombol "Lewati Preventif".
2. Klik → dialog → "Lewati Preventif" → banner "Mode Perbaikan · Preventif dilewati", kategori I hilang, hanya opsi Rusak.
3. "Batalkan, isi checklist lengkap" → kembali wajib, isian sebelumnya masih ada.
4. Skip lagi, isi satu item rusak, refresh halaman → lanjutkan draft → skip masih aktif.
5. Submit → sukses. Cek DB (`npm run db:studio`): `preventiveSkipped = true`, ActivityLog `SUBMITTED` notes `Preventif dilewati (bulan pertama kuartal)`, tidak ada item I.
6. Buat laporan baru untuk toko yang sama → Mode Checklist Wajib, **tanpa** tombol skip.
7. Simulasi bulan ke-2 → tombol skip tidak muncul.
8. Login BMC → detail laporan dari langkah 5 menampilkan badge "Preventif dilewati". Tolak dengan revisi → login BMS → buka revisi → tetap Mode Perbaikan tanpa kategori I → resubmit sukses, flag tetap `true`.
9. Bypass: kirim `skipPreventive: true` untuk toko yang jatahnya sudah terpakai (mis. via mengubah `now` client saja) → server menolak "Preventif tidak dapat dilewati".

- [ ] **Step 4: Catatan akhir dan commit**

Buat `docs/agent-notes/<YYYY-MM-DD-HHMM>-preventive-skip-verification.md` berisi hasil langkah 1–3.

```bash
git add docs/agent-notes/
git commit -m "docs(notes): verify preventive skip flow"
```
