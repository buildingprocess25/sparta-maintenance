# Item Signage I.11–I.13 & Popup Contoh Foto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah item preventif signage I11–I13 (Material → Kondisi, Pudar/Rusak otomatis Rekanan, satu tiket AHO per grup) dan popup contoh foto terkunci 5 detik untuk item KwH/Panel Listrik.

**Architecture:** Konfigurasi baru di katalog `lib/checklist-data.ts` (`signage`, `ahoTicketGroup`, `photoGuide`) dibaca oleh helper murni (`lib/signage.ts`, `lib/aho-ticket-groups.ts`, `lib/photo-guides.ts`). Kondisi signage diturunkan ke field lama (`condition`/`preventiveCondition`/`handler`) sehingga alur status, estimasi, saldo, dan PDF tetap memakai logika yang ada; field asli `signageMaterial`/`signageCondition` disimpan berdampingan di JSON item. Syarat "preventif lengkap" dibekukan ke I1–I10.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Zod v4 (`zod/v4`), shadcn/ui, @react-pdf/renderer. Test: file `*.spec.ts` dengan `node:assert/strict`, dijalankan `npx tsx <file>`.

**Spec:** `docs/superpowers/specs/2026-10-26-signage-items-and-photo-guide-design.md`

## Global Constraints

- Tidak ada perubahan `prisma/schema.prisma` dan tidak ada migration.
- ID item lama tidak boleh berubah; item baru: `I11`, `I12`, `I13`.
- Nama item: "Kondisi Fisik Shop Sign", "Kondisi Fisik List Plank", "Kondisi Fisik Pole Sign".
- Material: I11 `Embos`, `Acrylic`; I12 `Embos`, `Acrylic`, `ACP/Alucopan`; I13 `Acrylic`, `Vynil` + Tidak Ada.
- Kondisi signage: Baik, Kotor, Pudar, Rusak. Baik/Kotor → `OK` tanpa handler; Pudar/Rusak → `NOT_OK` + `REKANAN`, wajib Catatan + No Tiket AHO.
- Item KwH: `A22`. Item Panel Listrik: `A18`, `C6`, `E7`, `I3`.
- Durasi hitung mundur: `PHOTO_GUIDE_COUNTDOWN_SECONDS = 5`.
- Indentasi: ikuti file yang diedit (file `lib/` dan hooks 4 spasi; komponen `.tsx` di `create/components` dan `completion` 2 spasi).
- Jangan menambah padding/margin/gap manual pada komponen shadcn (lihat `AI_RULES.md`); atur tata letak lewat wrapper.
- Commit memakai Conventional Commits. **Jangan** menambahkan baris `Co-Authored-By` atau "Generated with".
- Setiap file spec diakhiri `console.log("<nama> tests passed")` seperti spec yang sudah ada.

---

## File Structure

**Dibuat**
- `lib/signage.ts` — konstanta & helper signage (config lookup, pemetaan form↔JSON, label).
- `lib/signage.spec.ts`
- `lib/aho-ticket-groups.ts` — aturan kunci/konflik tiket AHO berbasis grup.
- `lib/aho-ticket-groups.spec.ts`
- `lib/photo-guides.ts` — data contoh foto + keputusan gate.
- `lib/photo-guides.spec.ts`
- `app/reports/(bms)/create/hooks/signage-checklist.ts` — transisi state form signage & sinkronisasi tiket grup.
- `app/reports/(bms)/create/hooks/signage-checklist.spec.ts`
- `app/reports/(bms)/create/components/checklist-photo-field.tsx` — blok "Foto Bukti" (dipindah dari `checklist-step.tsx`).
- `app/reports/(bms)/create/components/checklist-damage-fields.tsx` — blok Catatan + No Tiket AHO (dipindah dari `checklist-step.tsx`).
- `app/reports/(bms)/create/components/signage-checklist-item.tsx` — kartu item signage.
- `components/photo-guide/photo-guide-dialog.tsx`
- `components/photo-guide/use-photo-guide-gate.ts`
- `components/photo-guide/photo-guide-link.tsx`
- `public/assets/photo-guides/kwh.png`, `public/assets/photo-guides/panel-listrik.png`

**Diubah**
- `lib/checklist-data.ts`, `lib/report-preventive.ts`, `lib/report-preventive-sql.ts`, `lib/report-preventive.spec.ts`
- `types/report.ts`
- `app/reports/actions/types.ts`, `types.spec.ts`, `report-json-helpers.ts`, `report-json-helpers.spec.ts`, `submit.ts`, `resubmit.ts`, `draft.ts`
- `app/reports/(bms)/create/hooks/draft-data.ts`, `draft-data.spec.ts`, `use-draft.ts`, `use-checklist.ts`
- `app/reports/(bms)/create/components/types.ts`, `checklist-step.tsx`, `local-aho-input.tsx`, `review-step.tsx`
- `app/reports/(bms)/create/create-form.tsx`
- `app/reports/(bms)/edit/[id]/page.tsx`, `app/reports/(bms)/revisi/[reportNumber]/page.tsx`
- `lib/pdf/generate-report-pdf.ts`, `lib/pdf/checklist-photo-gallery.ts`, `lib/pdf/report-pdf-full-builder.ts`
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`
- `app/reports/[reportNumber]/report-detail-view.tsx`
- `scripts/export-preventive-photos.ts`
- `app/reports/[reportNumber]/completion/completion-client.tsx`, `components/completion-item-section.tsx`

---

# Bagian A — Item Signage

### Task 1: Katalog signage & helper `lib/signage.ts`

**Files:**
- Modify: `lib/checklist-data.ts`
- Create: `lib/signage.ts`
- Test: `lib/signage.spec.ts`

**Interfaces:**
- Produces (dari `lib/checklist-data.ts`):
  - `type SignageCondition = "baik" | "kotor" | "pudar" | "rusak"`
  - `type AhoTicketGroup = "signage"`
  - `interface SignageConfig { materials: readonly string[]; allowNotAvailable?: boolean }`
  - `interface ChecklistCatalogItem { id; name; desc?; signage?: SignageConfig; ahoTicketGroup?: AhoTicketGroup }`
  - `ChecklistItem` mendapat `signageMaterial?: string; signageCondition?: SignageCondition | ""`
- Produces (dari `lib/signage.ts`):
  - `SIGNAGE_NOT_AVAILABLE = "TIDAK_ADA"`
  - `SIGNAGE_CONDITIONS: readonly SignageCondition[]`
  - `type SignageConditionJson = "BAIK" | "KOTOR" | "PUDAR" | "RUSAK"`
  - `SIGNAGE_CONDITION_LABELS: Record<SignageCondition, string>`
  - `getSignageConfig(itemId: string): SignageConfig | undefined`
  - `isSignageDamaged(condition: string | null | undefined): boolean`
  - `toChecklistCondition(condition: SignageCondition | ""): ChecklistCondition`
  - `toSignageJsonFields(item): { signageMaterial?: string; signageCondition?: SignageConditionJson }`
  - `fromSignageJsonFields(item): { signageMaterial?: string; signageCondition?: SignageCondition }`
  - `describeSignageCondition(item): SignageConditionDescription | null` dengan `{ label; material?; text; isDamaged }`

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/signage.spec.ts`:

```ts
import assert from "node:assert/strict";
import { REPORT_CHECKLIST_ITEMS } from "./checklist-data";
import {
    SIGNAGE_NOT_AVAILABLE,
    describeSignageCondition,
    fromSignageJsonFields,
    getSignageConfig,
    isSignageDamaged,
    toChecklistCondition,
    toSignageJsonFields,
} from "./signage";

// Katalog
assert.deepEqual(getSignageConfig("I11")?.materials, ["Embos", "Acrylic"]);
assert.deepEqual(getSignageConfig("I12")?.materials, [
    "Embos",
    "Acrylic",
    "ACP/Alucopan",
]);
assert.deepEqual(getSignageConfig("I13")?.materials, ["Acrylic", "Vynil"]);
assert.equal(getSignageConfig("I13")?.allowNotAvailable, true);
assert.equal(getSignageConfig("I11")?.allowNotAvailable, undefined);
assert.equal(getSignageConfig("A1"), undefined);
assert.equal(
    REPORT_CHECKLIST_ITEMS.find((item) => item.id === "I11")?.ahoTicketGroup,
    "signage",
);

// Kondisi
assert.equal(isSignageDamaged("pudar"), true);
assert.equal(isSignageDamaged("RUSAK"), true);
assert.equal(isSignageDamaged("kotor"), false);
assert.equal(isSignageDamaged(undefined), false);
assert.equal(toChecklistCondition("baik"), "baik");
assert.equal(toChecklistCondition("kotor"), "baik");
assert.equal(toChecklistCondition("pudar"), "rusak");
assert.equal(toChecklistCondition("rusak"), "rusak");
assert.equal(toChecklistCondition(""), "");

// Form → JSON
assert.deepEqual(
    toSignageJsonFields({
        id: "I11",
        signageMaterial: "Acrylic",
        signageCondition: "kotor",
    }),
    { signageMaterial: "Acrylic", signageCondition: "KOTOR" },
);
assert.deepEqual(
    toSignageJsonFields({
        id: "I13",
        signageMaterial: SIGNAGE_NOT_AVAILABLE,
        signageCondition: "",
    }),
    {},
);
assert.deepEqual(
    toSignageJsonFields({ id: "I11", signageMaterial: "Acrylic" }),
    {},
);
assert.deepEqual(
    toSignageJsonFields({
        id: "A1",
        signageMaterial: "Acrylic",
        signageCondition: "baik",
    }),
    {},
);

// JSON → form
assert.deepEqual(
    fromSignageJsonFields({
        itemId: "I12",
        preventiveCondition: "NOT_OK",
        signageMaterial: "ACP/Alucopan",
        signageCondition: "PUDAR",
    }),
    { signageMaterial: "ACP/Alucopan", signageCondition: "pudar" },
);
assert.deepEqual(
    fromSignageJsonFields({ itemId: "I13", preventiveCondition: "TIDAK_ADA" }),
    { signageMaterial: SIGNAGE_NOT_AVAILABLE },
);
assert.deepEqual(
    fromSignageJsonFields({ itemId: "A1", preventiveCondition: "OK" }),
    {},
);

// Label
assert.deepEqual(
    describeSignageCondition({
        signageCondition: "RUSAK",
        signageMaterial: "Acrylic",
    }),
    {
        label: "Rusak",
        material: "Acrylic",
        text: "Rusak · Acrylic",
        isDamaged: true,
    },
);
assert.deepEqual(describeSignageCondition({ signageCondition: "kotor" }), {
    label: "Kotor",
    material: undefined,
    text: "Kotor",
    isDamaged: false,
});
assert.equal(describeSignageCondition({}), null);
assert.equal(describeSignageCondition({ signageCondition: "OK" }), null);

console.log("signage tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/signage.spec.ts`
Expected: FAIL — `Cannot find module './signage'`.

- [ ] **Step 3: Ubah tipe katalog di `lib/checklist-data.ts`**

Ganti blok tipe di awal file (baris 1–24) menjadi:

```ts
// Data checklist berdasarkan FCKT BnM Menu Ceklist
export type ChecklistCondition = "baik" | "rusak" | "tidak_ada" | "";
export type SignageCondition = "baik" | "kotor" | "pudar" | "rusak";
export type AhoTicketGroup = "signage";

export interface SignageConfig {
    materials: readonly string[];
    allowNotAvailable?: boolean;
}

export interface ChecklistItem {
    id: string;
    name: string;
    desc?: string;
    condition: ChecklistCondition;
    photo?: File;
    photoUrl?: string;
    photoKey?: string;
    handler?: "BMS" | "Rekanan" | "";
    notes?: string;
    ahoTicketNumber?: string;
    /** Item signage: material terpilih, atau "TIDAK_ADA". */
    signageMaterial?: string;
    /** Item signage: kondisi asli sebelum diturunkan ke `condition`. */
    signageCondition?: SignageCondition | "";
}

export interface ChecklistCatalogItem {
    id: string;
    name: string;
    desc?: string;
    /** Item dengan alur Material → Kondisi (Baik/Kotor/Pudar/Rusak). */
    signage?: SignageConfig;
    /** Item dalam grup yang sama berbagi satu nomor tiket AHO. */
    ahoTicketGroup?: AhoTicketGroup;
}

export interface ChecklistCategory {
    id: string;
    title: string;
    isPreventive?: boolean; // true = Category I (OK/Not OK + foto wajib jika OK)
    items: ChecklistCatalogItem[];
}
```

- [ ] **Step 4: Tambah item I11–I13**

Di kategori `I`, tepat setelah objek item `I10` (yang `desc`-nya diawali "Pembersihan unit dari sampah/kotoran"), sebelum `],` penutup `items`, tambahkan:

```ts
            {
                id: "I11",
                name: "Kondisi Fisik Shop Sign",
                signage: { materials: ["Embos", "Acrylic"] },
                ahoTicketGroup: "signage",
            },
            {
                id: "I12",
                name: "Kondisi Fisik List Plank",
                signage: { materials: ["Embos", "Acrylic", "ACP/Alucopan"] },
                ahoTicketGroup: "signage",
            },
            {
                id: "I13",
                name: "Kondisi Fisik Pole Sign",
                signage: {
                    materials: ["Acrylic", "Vynil"],
                    allowNotAvailable: true,
                },
                ahoTicketGroup: "signage",
            },
```

- [ ] **Step 5: Buat `lib/signage.ts`**

```ts
import {
    REPORT_CHECKLIST_ITEMS,
    type ChecklistCondition,
    type SignageCondition,
    type SignageConfig,
} from "@/lib/checklist-data";

/** Nilai `signageMaterial` di state form saat signage tidak dimiliki toko. */
export const SIGNAGE_NOT_AVAILABLE = "TIDAK_ADA";

export const SIGNAGE_CONDITIONS: readonly SignageCondition[] = [
    "baik",
    "kotor",
    "pudar",
    "rusak",
];

export type SignageConditionJson = "BAIK" | "KOTOR" | "PUDAR" | "RUSAK";

export const SIGNAGE_CONDITION_LABELS: Record<SignageCondition, string> = {
    baik: "Baik",
    kotor: "Kotor",
    pudar: "Pudar",
    rusak: "Rusak",
};

const signageConfigById = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.signage ? [[item.id, item.signage] as const] : [],
    ),
);

export function getSignageConfig(itemId: string): SignageConfig | undefined {
    return signageConfigById.get(itemId);
}

function normalizeSignageCondition(
    condition: string | null | undefined,
): SignageCondition | undefined {
    const normalized = condition?.trim().toLowerCase();
    return SIGNAGE_CONDITIONS.find((value) => value === normalized);
}

export function isSignageDamaged(
    condition: string | null | undefined,
): boolean {
    const normalized = normalizeSignageCondition(condition);
    return normalized === "pudar" || normalized === "rusak";
}

/** Baik/Kotor dihitung "baik", Pudar/Rusak dihitung "rusak". */
export function toChecklistCondition(
    condition: SignageCondition | "",
): ChecklistCondition {
    if (!condition) return "";
    return isSignageDamaged(condition) ? "rusak" : "baik";
}

/** Form → JSON. Hanya diisi untuk item signage yang punya material + kondisi. */
export function toSignageJsonFields(item: {
    id: string;
    signageMaterial?: string;
    signageCondition?: SignageCondition | "";
}): { signageMaterial?: string; signageCondition?: SignageConditionJson } {
    if (!getSignageConfig(item.id)) return {};
    if (
        !item.signageMaterial ||
        item.signageMaterial === SIGNAGE_NOT_AVAILABLE ||
        !item.signageCondition
    ) {
        return {};
    }
    return {
        signageMaterial: item.signageMaterial,
        signageCondition:
            item.signageCondition.toUpperCase() as SignageConditionJson,
    };
}

/** JSON → form. Signage Tidak Ada disimpan sebagai `preventiveCondition: TIDAK_ADA`. */
export function fromSignageJsonFields(item: {
    itemId: string;
    preventiveCondition?: string | null;
    signageMaterial?: string | null;
    signageCondition?: string | null;
}): { signageMaterial?: string; signageCondition?: SignageCondition } {
    if (!getSignageConfig(item.itemId)) return {};
    if (item.preventiveCondition === "TIDAK_ADA") {
        return { signageMaterial: SIGNAGE_NOT_AVAILABLE };
    }
    return {
        signageMaterial: item.signageMaterial || undefined,
        signageCondition: normalizeSignageCondition(item.signageCondition),
    };
}

export type SignageConditionDescription = {
    label: string;
    material?: string;
    /** Label siap tampil, mis. "Rusak · Acrylic". */
    text: string;
    isDamaged: boolean;
};

/**
 * Label kondisi khusus signage. `null` berarti bukan data signage (atau
 * signage Tidak Ada) — pemanggil memakai label kondisi lamanya.
 */
export function describeSignageCondition(item: {
    signageCondition?: string | null;
    signageMaterial?: string | null;
}): SignageConditionDescription | null {
    const condition = normalizeSignageCondition(item.signageCondition);
    if (!condition) return null;

    const label = SIGNAGE_CONDITION_LABELS[condition];
    const material = item.signageMaterial?.trim() || undefined;
    return {
        label,
        material,
        text: material ? `${label} · ${material}` : label,
        isDamaged: isSignageDamaged(condition),
    };
}
```

- [ ] **Step 6: Jalankan test, pastikan lolos**

Run: `npx tsx lib/signage.spec.ts`
Expected: `signage tests passed`

- [ ] **Step 7: Cek tipe**

Run: `npx tsc --noEmit`
Expected: tidak ada error. Jika ada error di tempat yang memakai `ChecklistCategory["items"]` sebagai `ChecklistItem`, ganti anotasinya ke `ChecklistCatalogItem`.

- [ ] **Step 8: Commit**

```bash
git add lib/checklist-data.ts lib/signage.ts lib/signage.spec.ts
git commit -m "feat(checklist): add signage items I11-I13 to catalog"
```

---

### Task 2: Bekukan syarat preventif lengkap ke I1–I10

**Files:**
- Modify: `lib/report-preventive.ts`
- Modify: `lib/report-preventive-sql.ts`
- Test: `lib/report-preventive.spec.ts`

**Interfaces:**
- Produces: `PREVENTIVE_REQUIRED_ITEM_IDS: readonly string[]` (I1–I10). `PREVENTIVE_ITEM_IDS` tetap berisi semua item kategori I (I1–I13).

- [ ] **Step 1: Ubah test**

Di `lib/report-preventive.spec.ts`, ganti import dan `completeItems` menjadi:

```ts
import assert from "node:assert/strict";
import {
    PREVENTIVE_ITEM_IDS,
    PREVENTIVE_REQUIRED_ITEM_IDS,
    hasCompletePreventiveEvidence,
    isRecordedPreventiveReport,
} from "./report-preventive";

assert.deepEqual(PREVENTIVE_REQUIRED_ITEM_IDS, [
    "I1",
    "I2",
    "I3",
    "I4",
    "I5",
    "I6",
    "I7",
    "I8",
    "I9",
    "I10",
]);
assert.equal(PREVENTIVE_ITEM_IDS.includes("I11"), true);
assert.equal(PREVENTIVE_ITEM_IDS.includes("I13"), true);

// Laporan lama (sebelum I11–I13 ada) tetap dihitung lengkap.
const completeItems = PREVENTIVE_REQUIRED_ITEM_IDS.map((itemId, index) => ({
    itemId,
    preventiveCondition:
        index % 3 === 0 ? "OK" : index % 3 === 1 ? "NOT_OK" : "TIDAK_ADA",
}));
```

Lalu di assertion yang memakai `PREVENTIVE_ITEM_IDS.at(-1)`, ganti menjadi `PREVENTIVE_REQUIRED_ITEM_IDS.at(-1)`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/report-preventive.spec.ts`
Expected: FAIL — `PREVENTIVE_REQUIRED_ITEM_IDS` undefined / assertion error.

- [ ] **Step 3: Implementasi di `lib/report-preventive.ts`**

Tepat setelah deklarasi `PREVENTIVE_ITEM_IDS`, tambahkan:

```ts
// Set item yang menentukan laporan "preventif lengkap". Sengaja dibekukan ke
// I1–I10: laporan sebelum I11–I13 ada tetap harus dihitung lengkap (cooldown,
// KPI, coverage, matriks, export). Item preventif baru diwajibkan lewat
// validasi submit, bukan lewat set ini. Jangan diganti menjadi turunan katalog.
export const PREVENTIVE_REQUIRED_ITEM_IDS: readonly string[] = [
    "I1",
    "I2",
    "I3",
    "I4",
    "I5",
    "I6",
    "I7",
    "I8",
    "I9",
    "I10",
];
```

Di `hasCompletePreventiveEvidence`, ganti `return PREVENTIVE_ITEM_IDS.every((requiredId) =>` menjadi `return PREVENTIVE_REQUIRED_ITEM_IDS.every((requiredId) =>`.

- [ ] **Step 4: Implementasi di `lib/report-preventive-sql.ts`**

Ganti import menjadi `import { PREVENTIVE_REQUIRED_ITEM_IDS } from "@/lib/report-preventive";`, lalu:

```ts
            WHERE item->>'itemId' IN (${Prisma.join([...PREVENTIVE_REQUIRED_ITEM_IDS])})
              AND item->>'preventiveCondition' IN ('OK', 'NOT_OK', 'TIDAK_ADA')
        ) = ${PREVENTIVE_REQUIRED_ITEM_IDS.length}
```

- [ ] **Step 5: Jalankan test, pastikan lolos**

Run: `npx tsx lib/report-preventive.spec.ts`
Expected: `report preventive assertions passed`

- [ ] **Step 6: Commit**

```bash
git add lib/report-preventive.ts lib/report-preventive-sql.ts lib/report-preventive.spec.ts
git commit -m "fix(preventive): freeze completeness check to items I1-I10"
```

---

### Task 3: Aturan grup tiket AHO `lib/aho-ticket-groups.ts`

**Files:**
- Create: `lib/aho-ticket-groups.ts`
- Test: `lib/aho-ticket-groups.spec.ts`

**Interfaces:**
- Consumes: `REPORT_CHECKLIST_ITEMS`, `AhoTicketGroup` (Task 1).
- Produces:
  - `type AhoTicketHolder = { itemId: string; ahoTicketNumber?: string | null }`
  - `type AhoTicketConflict = { itemId: string; ticket: string; reason: "used_by_other_item" | "group_ticket_mismatch" }`
  - `getAhoTicketGroup(itemId: string): AhoTicketGroup | undefined`
  - `getLockedAhoTickets(itemId: string, holders: Iterable<AhoTicketHolder>): Set<string>`
  - `getGroupAhoTicket(group: AhoTicketGroup, holders: Iterable<AhoTicketHolder>, excludeItemId?: string): string | undefined`
  - `findAhoTicketConflict(holders: readonly AhoTicketHolder[]): AhoTicketConflict | null`
- Pemanggil wajib hanya mengirim holder dari item yang rusak/NOT_OK.

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/aho-ticket-groups.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    findAhoTicketConflict,
    getAhoTicketGroup,
    getGroupAhoTicket,
    getLockedAhoTickets,
} from "./aho-ticket-groups";

assert.equal(getAhoTicketGroup("I11"), "signage");
assert.equal(getAhoTicketGroup("I12"), "signage");
assert.equal(getAhoTicketGroup("I13"), "signage");
assert.equal(getAhoTicketGroup("A22"), undefined);

const holders = [
    { itemId: "A22", ahoTicketNumber: "ABC" },
    { itemId: "I11", ahoTicketNumber: "BCD" },
    { itemId: "I13", ahoTicketNumber: " BCD " },
];

// Item non-signage: tiket semua item lain terkunci.
assert.deepEqual([...getLockedAhoTickets("A18", holders)].sort(), [
    "ABC",
    "BCD",
]);
// Tiket milik item itu sendiri tidak terkunci.
assert.equal(getLockedAhoTickets("A22", holders).has("ABC"), false);
assert.equal(getLockedAhoTickets("A22", holders).has("BCD"), true);
// Item signage: tiket grup bebas, tiket non-signage terkunci.
assert.deepEqual([...getLockedAhoTickets("I12", holders)], ["ABC"]);

assert.equal(getGroupAhoTicket("signage", holders), "BCD");
assert.equal(getGroupAhoTicket("signage", holders, "I11"), "BCD");
assert.equal(
    getGroupAhoTicket("signage", [{ itemId: "A1", ahoTicketNumber: "X" }]),
    undefined,
);

assert.equal(findAhoTicketConflict(holders), null);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "X" },
        { itemId: "A2", ahoTicketNumber: "X" },
    ]),
    { itemId: "A2", ticket: "X", reason: "used_by_other_item" },
);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "X" },
        { itemId: "I11", ahoTicketNumber: "X" },
    ]),
    { itemId: "I11", ticket: "X", reason: "used_by_other_item" },
);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "I11", ahoTicketNumber: "X" },
        { itemId: "I12", ahoTicketNumber: "Y" },
    ]),
    { itemId: "I12", ticket: "Y", reason: "group_ticket_mismatch" },
);
assert.equal(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "" },
        { itemId: "A2", ahoTicketNumber: "  " },
        { itemId: "A3", ahoTicketNumber: null },
    ]),
    null,
);

console.log("aho ticket group tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/aho-ticket-groups.spec.ts`
Expected: FAIL — `Cannot find module './aho-ticket-groups'`.

- [ ] **Step 3: Implementasi**

Buat `lib/aho-ticket-groups.ts`:

```ts
import {
    REPORT_CHECKLIST_ITEMS,
    type AhoTicketGroup,
} from "@/lib/checklist-data";

export type AhoTicketHolder = {
    itemId: string;
    ahoTicketNumber?: string | null;
};

export type AhoTicketConflict = {
    itemId: string;
    ticket: string;
    reason: "used_by_other_item" | "group_ticket_mismatch";
};

const groupByItemId = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.ahoTicketGroup ? [[item.id, item.ahoTicketGroup] as const] : [],
    ),
);

export function getAhoTicketGroup(itemId: string): AhoTicketGroup | undefined {
    return groupByItemId.get(itemId);
}

// Item dalam satu grup berbagi "pemilik" tiket; item lain berdiri sendiri.
function getTicketOwner(itemId: string): string {
    const group = getAhoTicketGroup(itemId);
    return group ? `group:${group}` : `item:${itemId}`;
}

function normalizeTicket(ticket: string | null | undefined): string {
    return ticket?.trim() ?? "";
}

/** Tiket yang tidak boleh dipilih oleh `itemId` karena dimiliki pemilik lain. */
export function getLockedAhoTickets(
    itemId: string,
    holders: Iterable<AhoTicketHolder>,
): Set<string> {
    const owner = getTicketOwner(itemId);
    const locked = new Set<string>();

    for (const holder of holders) {
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (!ticket || holder.itemId === itemId) continue;
        if (getTicketOwner(holder.itemId) !== owner) locked.add(ticket);
    }

    return locked;
}

/** Tiket yang sedang dipakai grup, untuk mengisi otomatis item grup lain. */
export function getGroupAhoTicket(
    group: AhoTicketGroup,
    holders: Iterable<AhoTicketHolder>,
    excludeItemId?: string,
): string | undefined {
    for (const holder of holders) {
        if (holder.itemId === excludeItemId) continue;
        if (getAhoTicketGroup(holder.itemId) !== group) continue;
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (ticket) return ticket;
    }
    return undefined;
}

/**
 * Konflik pertama: satu tiket dipakai lebih dari satu pemilik, atau satu grup
 * memakai lebih dari satu tiket.
 */
export function findAhoTicketConflict(
    holders: readonly AhoTicketHolder[],
): AhoTicketConflict | null {
    const ownerByTicket = new Map<string, string>();
    const ticketByGroupOwner = new Map<string, string>();

    for (const holder of holders) {
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (!ticket) continue;

        const owner = getTicketOwner(holder.itemId);
        if (owner.startsWith("group:")) {
            const groupTicket = ticketByGroupOwner.get(owner);
            if (groupTicket && groupTicket !== ticket) {
                return {
                    itemId: holder.itemId,
                    ticket,
                    reason: "group_ticket_mismatch",
                };
            }
            ticketByGroupOwner.set(owner, ticket);
        }

        const ticketOwner = ownerByTicket.get(ticket);
        if (ticketOwner && ticketOwner !== owner) {
            return {
                itemId: holder.itemId,
                ticket,
                reason: "used_by_other_item",
            };
        }
        ownerByTicket.set(ticket, owner);
    }

    return null;
}
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx lib/aho-ticket-groups.spec.ts`
Expected: `aho ticket group tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/aho-ticket-groups.ts lib/aho-ticket-groups.spec.ts
git commit -m "feat(aho): add grouped AHO ticket locking rules"
```

---

### Task 4: Validasi server, JSON item, dan cek kelengkapan preventif saat submit

**Files:**
- Modify: `types/report.ts`
- Modify: `app/reports/actions/types.ts`
- Modify: `app/reports/actions/report-json-helpers.ts`
- Modify: `app/reports/actions/submit.ts`
- Modify: `app/reports/actions/resubmit.ts`
- Test: `app/reports/actions/types.spec.ts`, `app/reports/actions/report-json-helpers.spec.ts`

**Interfaces:**
- Consumes: `getSignageConfig`, `isSignageDamaged`, `SignageConditionJson` (Task 1); `findAhoTicketConflict` (Task 3).
- Produces: `ChecklistItemData` dan `ReportItemJson` punya `signageMaterial` + `signageCondition` (huruf besar). `buildItemsJson` meneruskan keduanya.

- [ ] **Step 1: Tulis test zod yang gagal**

Di `app/reports/actions/types.spec.ts`, ubah import menjadi:

```ts
import {
    createResubmitDataSchema,
    draftAutosaveDataSchema,
    draftDataSchema,
} from "./types";
```

Lalu sisipkan tepat sebelum `console.log("report action type tests passed");`:

```ts
function makeSignageItem(overrides: Record<string, unknown> = {}) {
    return {
        itemId: "I11",
        itemName: "Kondisi Fisik Shop Sign",
        categoryName: "I. Preventif Equipment Toko",
        preventiveCondition: "NOT_OK",
        signageMaterial: "Acrylic",
        signageCondition: "RUSAK",
        handler: "REKANAN",
        notes: "Huruf lepas",
        ahoTicketNumber: "AHO-SIGN",
        ...overrides,
    };
}

const isValid = (items: unknown[]) =>
    draftDataSchema.safeParse(makeDraft(items)).success;

assert.equal(isValid([makeSignageItem()]), true);
assert.equal(isValid([makeSignageItem({ signageMaterial: "Kayu" })]), false);
assert.equal(isValid([makeSignageItem({ handler: "BMS" })]), false);
assert.equal(isValid([makeSignageItem({ signageCondition: "KOTOR" })]), false);
assert.equal(
    isValid([
        makeSignageItem({
            preventiveCondition: "OK",
            signageCondition: "KOTOR",
            handler: undefined,
            notes: undefined,
            ahoTicketNumber: undefined,
        }),
    ]),
    true,
);
assert.equal(
    isValid([
        makeSignageItem({
            preventiveCondition: "OK",
            signageCondition: "BAIK",
            signageMaterial: undefined,
            handler: undefined,
            notes: undefined,
            ahoTicketNumber: undefined,
        }),
    ]),
    false,
);
const notAvailable = {
    preventiveCondition: "TIDAK_ADA",
    signageMaterial: undefined,
    signageCondition: undefined,
    handler: undefined,
    notes: undefined,
    ahoTicketNumber: undefined,
};
assert.equal(isValid([makeSignageItem(notAvailable)]), false);
assert.equal(
    isValid([makeSignageItem({ ...notAvailable, itemId: "I13" })]),
    true,
);
assert.equal(isValid([makeItem({ signageCondition: "BAIK" })]), false);

// Tiket AHO grup signage
assert.equal(
    isValid([makeSignageItem(), makeSignageItem({ itemId: "I12" })]),
    true,
);
assert.equal(
    isValid([
        makeSignageItem(),
        makeSignageItem({ itemId: "I12", ahoTicketNumber: "AHO-LAIN" }),
    ]),
    false,
);
assert.equal(
    isValid([makeItem(), makeSignageItem({ ahoTicketNumber: "AHO-001" })]),
    false,
);
assert.equal(
    isValid([makeItem(), makeItem({ itemId: "A2", itemName: "Dekker" })]),
    false,
);
// Autosave draft tidak memeriksa konflik tiket.
assert.equal(
    draftAutosaveDataSchema.safeParse(
        makeDraft([
            makeSignageItem(),
            makeSignageItem({ itemId: "I12", ahoTicketNumber: "AHO-LAIN" }),
        ]),
    ).success,
    true,
);
```

- [ ] **Step 2: Tulis test JSON helper yang gagal**

Di `app/reports/actions/report-json-helpers.spec.ts`, sisipkan sebelum `console.log("report-json-helpers tests passed");`:

```ts
assert.deepEqual(
    buildItemsJson({
        checklistItems: [
            {
                itemId: "I12",
                itemName: "Kondisi Fisik List Plank",
                categoryName: "I. Preventif Equipment Toko",
                preventiveCondition: "OK",
                signageMaterial: "Embos",
                signageCondition: "KOTOR",
                photoUrl: "https://example.com/i12.jpg",
            },
        ],
        bmsEstimations: {},
    }),
    [
        {
            itemId: "I12",
            preventiveCondition: "OK",
            signageMaterial: "Embos",
            signageCondition: "KOTOR",
            photoUrl: "https://example.com/i12.jpg",
        },
    ],
);
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npx tsx app/reports/actions/types.spec.ts`
Expected: FAIL (assertion error — field signage dibuang/validasi belum ada).

Run: `npx tsx app/reports/actions/report-json-helpers.spec.ts`
Expected: FAIL (deepEqual: field signage hilang).

- [ ] **Step 4: Tambah field ke tipe JSON**

Di `types/report.ts`, di `interface ReportItemJson`, setelah baris `ahoTicketNumber?: string | null;` tambahkan:

```ts
    signageMaterial?: string | null; // Item signage (I11–I13): material
    signageCondition?: "BAIK" | "KOTOR" | "PUDAR" | "RUSAK" | null; // Item signage: kondisi asli
```

Di `app/reports/actions/types.ts`, ubah `ChecklistItemData` menjadi:

```ts
export type ChecklistItemData = {
    itemId: string;
    itemName: string;
    categoryName: string;
    condition?: "BAIK" | "RUSAK" | "TIDAK_ADA";
    preventiveCondition?: "OK" | "NOT_OK" | "TIDAK_ADA";
    handler?: "BMS" | "REKANAN";
    photoUrl?: string;
    photoKey?: string;
    notes?: string;
    ahoTicketNumber?: string;
    signageMaterial?: string;
    signageCondition?: SignageConditionJson;
};
```

Dan tambahkan di bawah import `REPORT_CHECKLIST_ITEMS` yang sudah ada:

```ts
import {
    getSignageConfig,
    isSignageDamaged,
    type SignageConditionJson,
} from "@/lib/signage";
import { findAhoTicketConflict } from "@/lib/aho-ticket-groups";
```

- [ ] **Step 5: Ubah skema zod**

Di `buildDraftDataSchema`, pada `z.object({...})` item, setelah `ahoTicketNumber: z.string().trim().max(100).optional(),` tambahkan:

```ts
            signageMaterial: z.string().trim().max(50).optional(),
            signageCondition: z
                .enum(["BAIK", "KOTOR", "PUDAR", "RUSAK"])
                .optional(),
```

Ganti seluruh `.superRefine((item, ctx) => { ... })` milik item menjadi:

```ts
        .superRefine((item, ctx) => {
            const signage = getSignageConfig(item.itemId);

            if (!signage && (item.signageMaterial || item.signageCondition)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["signageCondition"],
                    message: "Data signage hanya untuk item signage",
                });
            }
            if (
                signage &&
                item.signageMaterial &&
                !signage.materials.includes(item.signageMaterial)
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["signageMaterial"],
                    message: "Material signage tidak dikenal",
                });
            }

            if (!options.requireDamagedDetails) return;

            if (signage) {
                if (
                    item.preventiveCondition === "TIDAK_ADA" &&
                    !signage.allowNotAvailable
                ) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["preventiveCondition"],
                        message: `${item.itemName} tidak boleh Tidak Ada`,
                    });
                }
                if (
                    item.preventiveCondition === "OK" ||
                    item.preventiveCondition === "NOT_OK"
                ) {
                    const isNotOk = item.preventiveCondition === "NOT_OK";
                    if (!item.signageMaterial) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["signageMaterial"],
                            message: `Material ${item.itemName} wajib dipilih`,
                        });
                    }
                    if (
                        !item.signageCondition ||
                        isSignageDamaged(item.signageCondition) !== isNotOk
                    ) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["signageCondition"],
                            message: `Kondisi ${item.itemName} tidak sesuai`,
                        });
                    }
                    if (isNotOk && item.handler !== "REKANAN") {
                        ctx.addIssue({
                            code: "custom",
                            path: ["handler"],
                            message: `${item.itemName} Pudar/Rusak wajib ditangani Rekanan`,
                        });
                    }
                }
            }

            const isDamaged =
                item.condition === "RUSAK" ||
                item.preventiveCondition === "NOT_OK";

            if (isDamaged && !item.notes?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notes"],
                    message: "Catatan wajib diisi untuk item rusak",
                });
            }
            if (isDamaged && !item.ahoTicketNumber?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["ahoTicketNumber"],
                    message: "Nomor tiket AHO wajib diisi untuk item rusak",
                });
            }
        });
```

Di `.superRefine((data, ctx) => { ... })` milik draft (yang mengecek duplikat `itemId`), tambahkan tepat sebelum loop `for (const itemId of Object.keys(data.bmsEstimations))`:

```ts
            if (options.requireDamagedDetails) {
                const conflict = findAhoTicketConflict(
                    data.checklistItems
                        .filter(
                            (item) =>
                                item.condition === "RUSAK" ||
                                item.preventiveCondition === "NOT_OK",
                        )
                        .map((item) => ({
                            itemId: item.itemId,
                            ahoTicketNumber: item.ahoTicketNumber,
                        })),
                );
                if (conflict) {
                    ctx.addIssue({
                        code: "custom",
                        path: [
                            "checklistItems",
                            data.checklistItems.findIndex(
                                (item) => item.itemId === conflict.itemId,
                            ),
                            "ahoTicketNumber",
                        ],
                        message:
                            conflict.reason === "group_ticket_mismatch"
                                ? "Item signage wajib memakai satu nomor tiket AHO yang sama"
                                : `Nomor tiket AHO ${conflict.ticket} sudah dipakai item lain`,
                    });
                }
            }
```

- [ ] **Step 6: Teruskan field di `buildItemsJson`**

Di `app/reports/actions/report-json-helpers.ts`, pada objek yang di-return di `buildItemsJson`, setelah baris `ahoTicketNumber: ...` tambahkan:

```ts
                    signageMaterial: item.signageMaterial,
                    signageCondition: item.signageCondition,
```

- [ ] **Step 7: Jalankan kedua test, pastikan lolos**

Run: `npx tsx app/reports/actions/types.spec.ts`
Expected: `report action type tests passed`

Run: `npx tsx app/reports/actions/report-json-helpers.spec.ts`
Expected: `report-json-helpers tests passed`

- [ ] **Step 8: Cek kelengkapan kategori I saat submit**

Di `app/reports/actions/submit.ts`, di cabang `else` (bukan cooldown), tepat setelah blok `if (missingItem) { return {...}; }` dan sebelum `}` penutup `else`, tambahkan:

```ts
        // Laporan preventif triwulan wajib membawa seluruh item kategori I,
        // termasuk item yang tidak ikut syarat "lengkap" historis (I11–I13).
        const hasPreventiveItems = checklistItems.some((item) =>
            preventiveItemIds.has(item.itemId),
        );
        if (hasPreventiveItems) {
            const missingPreventiveItem = [...preventiveItemIds].find(
                (id) =>
                    !checklistItems.some(
                        (item) =>
                            item.itemId === id && item.preventiveCondition,
                    ),
            );
            if (missingPreventiveItem) {
                return {
                    error: "Data laporan tidak lengkap",
                    detail: `Item preventif ${missingPreventiveItem} wajib diisi`,
                };
            }
        }
```

- [ ] **Step 9: Tampilkan pesan zod pertama**

Di `submit.ts`, ubah blok `if (!parsed.success)` menjadi:

```ts
  if (!parsed.success) {
    return {
      error: "Data laporan tidak valid",
      detail:
        parsed.error.issues[0]?.message ??
        "Periksa kembali data laporan yang diisi.",
    };
  }
```

Di `app/reports/actions/resubmit.ts`, ubah blok `if (!parsed.success)` yang sama menjadi:

```ts
        if (!parsed.success) {
            return {
                error: "Data laporan tidak valid",
                detail:
                    parsed.error.issues[0]?.message ??
                    "Periksa kembali data laporan yang diisi.",
            };
        }
```

- [ ] **Step 10: Jalankan spec terkait dan cek tipe**

Run: `npx tsx app/reports/actions/submit-draft-source.spec.ts && npx tsx app/reports/actions/draft-autosave-schema.spec.ts && npx tsc --noEmit`
Expected: kedua spec lolos, `tsc` tanpa error.

- [ ] **Step 11: Commit**

```bash
git add types/report.ts app/reports/actions/types.ts app/reports/actions/types.spec.ts app/reports/actions/report-json-helpers.ts app/reports/actions/report-json-helpers.spec.ts app/reports/actions/submit.ts app/reports/actions/resubmit.ts
git commit -m "feat(reports): validate signage items and grouped AHO tickets"
```

---

### Task 5: State form signage — serialisasi, restore draft, dan sinkronisasi tiket grup

**Files:**
- Create: `app/reports/(bms)/create/hooks/signage-checklist.ts`
- Test: `app/reports/(bms)/create/hooks/signage-checklist.spec.ts`
- Modify: `app/reports/(bms)/create/hooks/draft-data.ts`
- Test: `app/reports/(bms)/create/hooks/draft-data.spec.ts`
- Modify: `app/reports/(bms)/create/components/types.ts`
- Modify: `app/reports/actions/draft.ts`
- Modify: `app/reports/(bms)/edit/[id]/page.tsx`, `app/reports/(bms)/revisi/[reportNumber]/page.tsx`
- Modify: `app/reports/(bms)/create/hooks/use-draft.ts`

**Interfaces:**
- Consumes: Task 1 helpers, `getAhoTicketGroup`/`getGroupAhoTicket`/`AhoTicketHolder` (Task 3).
- Produces (dari `signage-checklist.ts`):
  - `type SignageChange = { field: "material"; value: string } | { field: "condition"; value: SignageCondition | "" }`
  - `applySignageSelection(item: ChecklistItem, change: SignageChange): ChecklistItem`
  - `toAhoTicketHolders(checklist: ReadonlyMap<string, ChecklistItem>): AhoTicketHolder[]` (hanya item `condition === "rusak"`)
  - `fillGroupAhoTicket(checklist: Map<string, ChecklistItem>, itemId: string): Map<string, ChecklistItem>`
  - `propagateGroupAhoTicket(checklist: Map<string, ChecklistItem>, sourceItemId: string): Map<string, ChecklistItem>`

- [ ] **Step 1: Tulis test yang gagal**

Buat `app/reports/(bms)/create/hooks/signage-checklist.spec.ts`:

```ts
import assert from "node:assert/strict";
import type { ChecklistItem } from "@/lib/checklist-data";
import { SIGNAGE_NOT_AVAILABLE } from "@/lib/signage";
import {
    applySignageSelection,
    fillGroupAhoTicket,
    propagateGroupAhoTicket,
    toAhoTicketHolders,
} from "./signage-checklist";

const base: ChecklistItem = {
    id: "I11",
    name: "Kondisi Fisik Shop Sign",
    condition: "",
};

let item = applySignageSelection(base, { field: "material", value: "Acrylic" });
assert.equal(item.signageMaterial, "Acrylic");
assert.equal(item.condition, "");

item = applySignageSelection(item, { field: "condition", value: "kotor" });
assert.equal(item.signageCondition, "kotor");
assert.equal(item.condition, "baik");
assert.equal(item.handler, "");

item = applySignageSelection(item, { field: "condition", value: "pudar" });
assert.equal(item.condition, "rusak");
assert.equal(item.handler, "Rekanan");

// Ganti material tidak menghapus kondisi.
item = applySignageSelection(item, { field: "material", value: "Embos" });
assert.equal(item.signageCondition, "pudar");
assert.equal(item.condition, "rusak");

// Batal pilih kondisi.
const cleared = applySignageSelection(item, { field: "condition", value: "" });
assert.equal(cleared.condition, "");
assert.equal(cleared.handler, "");

// Tidak Ada menghapus kondisi, catatan, tiket.
const pole = applySignageSelection(
    {
        id: "I13",
        name: "Kondisi Fisik Pole Sign",
        condition: "rusak",
        signageMaterial: "Vynil",
        signageCondition: "rusak",
        handler: "Rekanan",
        notes: "Retak",
        ahoTicketNumber: "T1",
    },
    { field: "material", value: SIGNAGE_NOT_AVAILABLE },
);
assert.equal(pole.condition, "tidak_ada");
assert.equal(pole.signageCondition, "");
assert.equal(pole.handler, "");
assert.equal(pole.notes, undefined);
assert.equal(pole.ahoTicketNumber, undefined);

// Kembali dari Tidak Ada mengosongkan kondisi.
const poleBack = applySignageSelection(pole, {
    field: "material",
    value: "Acrylic",
});
assert.equal(poleBack.condition, "");
assert.equal(poleBack.signageMaterial, "Acrylic");

// Tiket grup
const checklist = new Map<string, ChecklistItem>([
    [
        "A22",
        {
            id: "A22",
            name: "KwH",
            condition: "rusak",
            handler: "BMS",
            ahoTicketNumber: "ABC",
        },
    ],
    [
        "I11",
        {
            id: "I11",
            name: "Shop Sign",
            condition: "rusak",
            signageMaterial: "Acrylic",
            signageCondition: "rusak",
            handler: "Rekanan",
            ahoTicketNumber: "BCD",
        },
    ],
    [
        "I13",
        {
            id: "I13",
            name: "Pole Sign",
            condition: "rusak",
            signageMaterial: "Vynil",
            signageCondition: "pudar",
            handler: "Rekanan",
            ahoTicketNumber: "STALE",
        },
    ],
]);

const filled = fillGroupAhoTicket(checklist, "I13");
assert.equal(filled.get("I13")?.ahoTicketNumber, "BCD");
assert.equal(fillGroupAhoTicket(checklist, "A22"), checklist);

filled.set("I11", { ...filled.get("I11")!, ahoTicketNumber: "EFG" });
const propagated = propagateGroupAhoTicket(filled, "I11");
assert.equal(propagated.get("I13")?.ahoTicketNumber, "EFG");
assert.equal(propagated.get("A22")?.ahoTicketNumber, "ABC");
assert.equal(propagateGroupAhoTicket(filled, "A22"), filled);

assert.deepEqual(
    toAhoTicketHolders(
        new Map([
            [
                "A1",
                {
                    id: "A1",
                    name: "Bahu Jalan",
                    condition: "baik",
                    ahoTicketNumber: "OLD",
                } satisfies ChecklistItem,
            ],
        ]),
    ),
    [],
);

console.log("signage checklist tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx "app/reports/(bms)/create/hooks/signage-checklist.spec.ts"`
Expected: FAIL — `Cannot find module './signage-checklist'`.

- [ ] **Step 3: Implementasi `signage-checklist.ts`**

```ts
import type { ChecklistItem, SignageCondition } from "@/lib/checklist-data";
import {
    getAhoTicketGroup,
    getGroupAhoTicket,
    type AhoTicketHolder,
} from "@/lib/aho-ticket-groups";
import {
    SIGNAGE_NOT_AVAILABLE,
    isSignageDamaged,
    toChecklistCondition,
} from "@/lib/signage";

export type SignageChange =
    | { field: "material"; value: string }
    | { field: "condition"; value: SignageCondition | "" };

/** Turunkan pilihan signage ke field checklist lama (`condition`, `handler`). */
export function applySignageSelection(
    item: ChecklistItem,
    change: SignageChange,
): ChecklistItem {
    if (change.field === "material") {
        if (change.value === SIGNAGE_NOT_AVAILABLE) {
            return {
                ...item,
                signageMaterial: SIGNAGE_NOT_AVAILABLE,
                signageCondition: "",
                condition: "tidak_ada",
                handler: "",
                notes: undefined,
                ahoTicketNumber: undefined,
            };
        }

        const wasNotAvailable = item.signageMaterial === SIGNAGE_NOT_AVAILABLE;
        return {
            ...item,
            signageMaterial: change.value,
            ...(wasNotAvailable
                ? { signageCondition: "" as const, condition: "" as const }
                : {}),
        };
    }

    return {
        ...item,
        signageCondition: change.value,
        condition: toChecklistCondition(change.value),
        handler: isSignageDamaged(change.value) ? "Rekanan" : "",
    };
}

/** Holder tiket hanya dari item yang sedang rusak/NOT OK. */
export function toAhoTicketHolders(
    checklist: ReadonlyMap<string, ChecklistItem>,
): AhoTicketHolder[] {
    return Array.from(checklist.values())
        .filter((item) => item.condition === "rusak")
        .map((item) => ({
            itemId: item.id,
            ahoTicketNumber: item.ahoTicketNumber,
        }));
}

/** Item grup yang (baru) rusak memakai tiket grup yang sedang berlaku. */
export function fillGroupAhoTicket(
    checklist: Map<string, ChecklistItem>,
    itemId: string,
): Map<string, ChecklistItem> {
    const item = checklist.get(itemId);
    const group = getAhoTicketGroup(itemId);
    if (!item || !group || item.condition !== "rusak") return checklist;

    const ticket = getGroupAhoTicket(
        group,
        toAhoTicketHolders(checklist),
        itemId,
    );
    if (!ticket || ticket === item.ahoTicketNumber) return checklist;

    const next = new Map(checklist);
    next.set(itemId, { ...item, ahoTicketNumber: ticket });
    return next;
}

/** Samakan tiket semua item rusak di grup yang sama dengan item sumber. */
export function propagateGroupAhoTicket(
    checklist: Map<string, ChecklistItem>,
    sourceItemId: string,
): Map<string, ChecklistItem> {
    const source = checklist.get(sourceItemId);
    const group = getAhoTicketGroup(sourceItemId);
    if (!source || !group) return checklist;

    const next = new Map(checklist);
    for (const [id, item] of checklist) {
        if (id === sourceItemId || item.condition !== "rusak") continue;
        if (getAhoTicketGroup(id) !== group) continue;
        next.set(id, { ...item, ahoTicketNumber: source.ahoTicketNumber });
    }
    return next;
}
```

- [ ] **Step 4: Jalankan test, pastikan lolos**

Run: `npx tsx "app/reports/(bms)/create/hooks/signage-checklist.spec.ts"`
Expected: `signage checklist tests passed`

- [ ] **Step 5: Tulis test serialisasi yang gagal**

Di `app/reports/(bms)/create/hooks/draft-data.spec.ts`, sisipkan sebelum `console.log("draft-data tests passed");`:

```ts
const signageChecklist = new Map<string, ChecklistItem>([
    [
        "I11",
        {
            id: "I11",
            name: "Kondisi Fisik Shop Sign",
            condition: "rusak",
            signageMaterial: "Acrylic",
            signageCondition: "pudar",
            handler: "Rekanan",
            notes: "Warna pudar",
            ahoTicketNumber: "AHO-9",
        },
    ],
    [
        "I13",
        {
            id: "I13",
            name: "Kondisi Fisik Pole Sign",
            condition: "tidak_ada",
            signageMaterial: "TIDAK_ADA",
            signageCondition: "",
        },
    ],
]);
const signageResult = serializeChecklistItems(
    signageChecklist,
    checklistCategories,
);
const shopSign = signageResult.find((item) => item.itemId === "I11");
assert.equal(shopSign?.preventiveCondition, "NOT_OK");
assert.equal(shopSign?.handler, "REKANAN");
assert.equal(shopSign?.signageMaterial, "Acrylic");
assert.equal(shopSign?.signageCondition, "PUDAR");
const poleSign = signageResult.find((item) => item.itemId === "I13");
assert.equal(poleSign?.preventiveCondition, "TIDAK_ADA");
assert.equal(poleSign?.signageMaterial, undefined);
assert.equal(poleSign?.signageCondition, undefined);
```

Run: `npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts"`
Expected: FAIL — `signageMaterial` undefined.

- [ ] **Step 6: Implementasi serialisasi**

Di `app/reports/(bms)/create/hooks/draft-data.ts`, tambahkan import `import { toSignageJsonFields } from "@/lib/signage";`, lalu di objek yang di-return `.map((item) => { ... return {...} })`, setelah properti `ahoTicketNumber: ...`, tambahkan:

```ts
                ...toSignageJsonFields(item),
```

Run: `npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts"`
Expected: `draft-data tests passed`

- [ ] **Step 7: Bawa field signage di draft server, edit, dan revisi**

Di `app/reports/(bms)/create/components/types.ts`, di `SerializedDraft["items"]`, setelah `ahoTicketNumber?: string | null;` tambahkan:

```ts
    signageMaterial?: string | null;
    signageCondition?: string | null;
```

Di `app/reports/actions/draft.ts` (`serializeDraft`), `app/reports/(bms)/edit/[id]/page.tsx`, dan `app/reports/(bms)/revisi/[reportNumber]/page.tsx`, pada objek item yang dipetakan, setelah baris `ahoTicketNumber: item.ahoTicketNumber ?? null,` tambahkan:

```ts
            signageMaterial: item.signageMaterial ?? null,
            signageCondition: item.signageCondition ?? null,
```

(Sesuaikan indentasi dengan baris `ahoTicketNumber` di masing-masing file.)

- [ ] **Step 8: Restore field signage di `use-draft.ts`**

Tambahkan import `import { fromSignageJsonFields } from "@/lib/signage";`.

Pada **kedua** pemanggilan `restored.set(item.itemId, { ... })` (cabang `isServerSource` dan cabang `localDraftData`), tambahkan properti terakhir setelah `ahoTicketNumber: ...`:

```ts
                            ...fromSignageJsonFields(item),
```

- [ ] **Step 9: Cek tipe**

Run: `npx tsc --noEmit`
Expected: tanpa error.

- [ ] **Step 10: Commit**

```bash
git add "app/reports/(bms)/create/hooks/signage-checklist.ts" "app/reports/(bms)/create/hooks/signage-checklist.spec.ts" "app/reports/(bms)/create/hooks/draft-data.ts" "app/reports/(bms)/create/hooks/draft-data.spec.ts" "app/reports/(bms)/create/components/types.ts" app/reports/actions/draft.ts "app/reports/(bms)/edit/[id]/page.tsx" "app/reports/(bms)/revisi/[reportNumber]/page.tsx" "app/reports/(bms)/create/hooks/use-draft.ts"
git commit -m "feat(reports): persist signage selection in report drafts"
```

---

### Task 6: Hook `use-checklist` — updater signage, sinkron tiket grup, validasi material

**Files:**
- Modify: `app/reports/(bms)/create/hooks/use-checklist.ts`

**Interfaces:**
- Consumes: `applySignageSelection`, `fillGroupAhoTicket`, `propagateGroupAhoTicket`, `SignageChange` (Task 5); `getSignageConfig` (Task 1).
- Produces: `useChecklist()` mengembalikan tambahan `updateSignageItem(itemId: string, itemName: string, change: SignageChange): void`.

- [ ] **Step 1: Import**

Tambahkan di blok import:

```ts
import { getSignageConfig } from "@/lib/signage";
import {
    applySignageSelection,
    fillGroupAhoTicket,
    propagateGroupAhoTicket,
    type SignageChange,
} from "./signage-checklist";
```

- [ ] **Step 2: Sinkronkan tiket grup saat No Tiket AHO diubah**

Di `updateChecklistItem`, ganti:

```ts
                next.set(itemId, updated);
                return next;
```

menjadi:

```ts
                next.set(itemId, updated);
                return field === "ahoTicketNumber"
                    ? propagateGroupAhoTicket(next, itemId)
                    : next;
```

- [ ] **Step 3: Tambah `updateSignageItem`**

Tepat setelah `updateChecklistItem` (setelah `[]);` penutupnya), tambahkan:

```ts
    const updateSignageItem = useCallback(
        (itemId: string, itemName: string, change: SignageChange) => {
            setChecklist((prev) => {
                const existing = prev.get(itemId) || {
                    id: itemId,
                    name: itemName,
                    condition: "" as ChecklistCondition,
                    handler: "",
                };
                const next = new Map(prev);
                next.set(itemId, applySignageSelection(existing, change));
                return fillGroupAhoTicket(next, itemId);
            });
        },
        [],
    );
```

- [ ] **Step 4: Validasi material**

Di `validateStep1`, cabang cooldown, di dalam `for (const [, item] of checklist) {` tepat setelah deklarasi `const cat = ...;`, tambahkan:

```ts
                if (
                    item.condition &&
                    item.condition !== "tidak_ada" &&
                    getSignageConfig(item.id) &&
                    !item.signageMaterial
                ) {
                    toast.error(`Item "${item.name}" wajib pilih material`);
                    if (cat && !openCategories.has(cat.id))
                        toggleCategory(cat.id);
                    scrollToItem(item.id);
                    return false;
                }
```

Di cabang preventif triwulan (`else`), tepat setelah blok `if (!checkedItem || !checkedItem.condition) { ... return false; }`, tambahkan:

```ts
                    if (
                        checkedItem.condition !== "tidak_ada" &&
                        getSignageConfig(item.id) &&
                        !checkedItem.signageMaterial
                    ) {
                        toast.error(`Item "${item.name}" wajib pilih material`);
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
```

- [ ] **Step 5: Dev autofill untuk signage**

Di `devAutofill`, di dalam loop `for (const item of cat.items)`, ubah pemanggilan `next.set(item.id, { ... })` dengan menambahkan properti terakhir:

```ts
                        ...(getSignageConfig(item.id)
                            ? {
                                  signageMaterial:
                                      getSignageConfig(item.id)!.materials[0],
                                  signageCondition: "baik" as const,
                              }
                            : {}),
```

- [ ] **Step 6: Return**

Di objek return `useChecklist`, setelah `updateChecklistItem,` tambahkan `updateSignageItem,`.

- [ ] **Step 7: Cek tipe & lint**

Run: `npx tsc --noEmit && npx eslint "app/reports/(bms)/create/hooks/use-checklist.ts"`
Expected: tanpa error.

- [ ] **Step 8: Commit**

```bash
git add "app/reports/(bms)/create/hooks/use-checklist.ts"
git commit -m "feat(checklist): handle signage selection and group AHO sync"
```

---

### Task 7: UI form — kartu signage, blok foto/kerusakan bersama, kunci tiket AHO

**Files:**
- Create: `app/reports/(bms)/create/components/checklist-photo-field.tsx`
- Create: `app/reports/(bms)/create/components/checklist-damage-fields.tsx`
- Create: `app/reports/(bms)/create/components/signage-checklist-item.tsx`
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`
- Modify: `app/reports/(bms)/create/components/local-aho-input.tsx`
- Modify: `app/reports/(bms)/create/create-form.tsx`

**Interfaces:**
- Consumes: `updateSignageItem` (Task 6), `toAhoTicketHolders`/`SignageChange` (Task 5), `getLockedAhoTickets` (Task 3), helper signage (Task 1).
- Produces: prop baru `ChecklistStep.onSignageChange: (itemId: string, itemName: string, change: SignageChange) => void`. Komponen `ChecklistPhotoField` dan `ChecklistDamageFields` (dipakai juga oleh signage).

- [ ] **Step 1: Buat `checklist-photo-field.tsx`**

Pindahkan blok "Foto Bukti" dan `PhotoThumbnail` dari `checklist-step.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Camera, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolvePhotoUrl } from "@/lib/storage/photo-url";

export function ChecklistPhotoField({
  itemId,
  photo,
  photoUrl,
  onOpenCamera,
  onPreviewPhoto,
  onRemovePhoto,
}: {
  itemId: string;
  photo?: File;
  photoUrl?: string;
  onOpenCamera: (itemId: string) => void;
  onPreviewPhoto: (photo: File | string) => void;
  onRemovePhoto: (itemId: string) => void;
}) {
  const hasPhoto = !!photo || !!photoUrl;

  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-photo">
      <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        Foto Bukti <span className="text-destructive">*</span>
      </p>
      {!hasPhoto ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 border-dashed"
          onClick={() => onOpenCamera(itemId)}
        >
          <Camera data-icon="inline-start" className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      ) : (
        <PhotoThumbnail
          photo={photo}
          photoUrl={photoUrl}
          onPreview={onPreviewPhoto}
          onRemove={() => onRemovePhoto(itemId)}
        />
      )}
    </div>
  );
}

function PhotoThumbnail({
  photo,
  photoUrl,
  onPreview,
  onRemove,
}: {
  photo?: File;
  photoUrl?: string;
  onPreview: (photo: File | string) => void;
  onRemove: () => void;
}) {
  const displayPhotoUrl = photoUrl ? resolvePhotoUrl(photoUrl) : undefined;
  const localPhotoUrl = useMemo(
    () => (!displayPhotoUrl && photo ? URL.createObjectURL(photo) : ""),
    [displayPhotoUrl, photo],
  );
  const previewSrc = displayPhotoUrl || localPhotoUrl;

  if (!previewSrc) return null;

  return (
    <div className="space-y-2">
      <div
        className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-primary/20 bg-muted"
        onClick={() => onPreview(displayPhotoUrl ?? photo ?? previewSrc)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt="Preview"
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          <CheckCircle2 className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {photo?.name ?? "Foto tersimpan"}
            </p>
          </div>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Buat `checklist-damage-fields.tsx`**

```tsx
"use client";

import { Label } from "@/components/ui/label";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { LocalAhoInput } from "./local-aho-input";

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
      <div className="flex flex-col gap-2" data-tour="bms-checklist-notes">
        <Label
          htmlFor={`${itemId}-note`}
          className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Catatan <span className="text-destructive">*</span>
        </Label>
        <LocalNotesTextarea
          required={true}
          initialValue={notes || ""}
          onCommit={(val) => onNotesChange(itemId, itemName, val)}
        />
      </div>
      <div className="flex flex-col gap-2" data-tour="bms-checklist-aho">
        <Label
          htmlFor={`${itemId}-aho`}
          className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          No Tiket AHO <span className="text-destructive">*</span>
        </Label>
        <LocalAhoInput
          id={`${itemId}-aho`}
          storeCode={storeCode}
          initialValue={ahoTicketNumber || ""}
          selectedTickets={lockedAhoTickets}
          onCommit={(val) => onAhoTicketNumberChange(itemId, itemName, val)}
          required
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Buat `signage-checklist-item.tsx`**

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type {
  ChecklistCatalogItem,
  ChecklistItem,
  SignageCondition,
  SignageConfig,
} from "@/lib/checklist-data";
import {
  SIGNAGE_CONDITIONS,
  SIGNAGE_CONDITION_LABELS,
  SIGNAGE_NOT_AVAILABLE,
  isSignageDamaged,
} from "@/lib/signage";
import type { SignageChange } from "../hooks/signage-checklist";
import { ChecklistPhotoField } from "./checklist-photo-field";
import { ChecklistDamageFields } from "./checklist-damage-fields";

const OPTION_CLASS =
  "relative flex h-10 cursor-pointer items-center justify-center gap-0 rounded-lg text-center text-sm leading-none font-semibold transition-colors";
const SECTION_LABEL_CLASS =
  "text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase";

export function SignageChecklistItem({
  item,
  itemData,
  storeCode,
  lockedAhoTickets,
  onSignageChange,
  onNotesChange,
  onAhoTicketNumberChange,
  onOpenCamera,
  onPreviewPhoto,
  onRemovePhoto,
}: {
  item: ChecklistCatalogItem & { signage: SignageConfig };
  itemData?: ChecklistItem;
  storeCode?: string;
  lockedAhoTickets: Set<string>;
  onSignageChange: (
    itemId: string,
    itemName: string,
    change: SignageChange,
  ) => void;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
  onOpenCamera: (itemId: string) => void;
  onPreviewPhoto: (photo: File | string) => void;
  onRemovePhoto: (itemId: string) => void;
}) {
  const material = itemData?.signageMaterial ?? "";
  const condition = itemData?.signageCondition ?? "";
  const isNotAvailable = material === SIGNAGE_NOT_AVAILABLE;
  const isDamaged = isSignageDamaged(condition);
  const hasPhoto = !!itemData?.photo || !!itemData?.photoUrl;
  const materialOptions = item.signage.allowNotAvailable
    ? [...item.signage.materials, SIGNAGE_NOT_AVAILABLE]
    : [...item.signage.materials];

  const handleMaterialChange = (value: string) => {
    if (value === SIGNAGE_NOT_AVAILABLE && hasPhoto) onRemovePhoto(item.id);
    onSignageChange(item.id, item.name, { field: "material", value });
  };

  return (
    <Card
      id={`item-${item.id}`}
      size="sm"
      className={cn(
        "bg-card/95 shadow-sm ring-1 ring-border/60",
        isDamaged && "ring-destructive/45",
        isNotAvailable && "opacity-75",
      )}
    >
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-base font-semibold">{item.name}</h4>

            <div className="flex flex-col gap-2">
              <p className={SECTION_LABEL_CLASS}>
                Material <span className="text-destructive">*</span>
              </p>
              <RadioGroup
                value={material}
                onValueChange={handleMaterialChange}
                className={cn(
                  "grid gap-1 rounded-xl bg-muted",
                  materialOptions.length > 2 ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {materialOptions.map((value) => {
                  const isSelected = material === value;
                  return (
                    <Label
                      key={value}
                      htmlFor={`${item.id}-material-${value}`}
                      className={cn(
                        OPTION_CLASS,
                        isSelected
                          ? value === SIGNAGE_NOT_AVAILABLE
                            ? "bg-neutral-400 text-foreground shadow-sm dark:bg-neutral-700 dark:text-white"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      <RadioGroupItem
                        id={`${item.id}-material-${value}`}
                        value={value}
                        className="pointer-events-none absolute opacity-0"
                      />
                      <span className="leading-none">
                        {value === SIGNAGE_NOT_AVAILABLE ? "Tidak Ada" : value}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {material && !isNotAvailable ? (
              <div className="flex flex-col gap-2">
                <p className={SECTION_LABEL_CLASS}>
                  Kondisi <span className="text-destructive">*</span>
                </p>
                <RadioGroup
                  value={condition}
                  onValueChange={(value) =>
                    onSignageChange(item.id, item.name, {
                      field: "condition",
                      value: value as SignageCondition,
                    })
                  }
                  className="grid grid-cols-2 gap-1 rounded-xl bg-muted"
                >
                  {SIGNAGE_CONDITIONS.map((value) => (
                    <Label
                      key={value}
                      htmlFor={`${item.id}-signage-${value}`}
                      onClick={(e) => {
                        if (condition === value) {
                          e.preventDefault();
                          onSignageChange(item.id, item.name, {
                            field: "condition",
                            value: "",
                          });
                        }
                      }}
                      className={cn(
                        OPTION_CLASS,
                        condition === value
                          ? isSignageDamaged(value)
                            ? "bg-destructive text-white shadow-sm"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      <RadioGroupItem
                        id={`${item.id}-signage-${value}`}
                        value={value}
                        className="pointer-events-none absolute opacity-0"
                      />
                      <span className="leading-none">
                        {SIGNAGE_CONDITION_LABELS[value]}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            ) : null}
          </div>

          {condition ? (
            <div className="flex flex-col gap-4 border-t border-border/70 pt-4">
              {isDamaged ? (
                <div className="flex flex-col gap-2">
                  <p className={SECTION_LABEL_CLASS}>akan dihandle</p>
                  <p className="flex h-10 items-center justify-center rounded-xl bg-muted text-sm font-semibold">
                    Ditangani Rekanan
                  </p>
                </div>
              ) : null}

              <ChecklistPhotoField
                itemId={item.id}
                photo={itemData?.photo}
                photoUrl={itemData?.photoUrl}
                onOpenCamera={onOpenCamera}
                onPreviewPhoto={onPreviewPhoto}
                onRemovePhoto={onRemovePhoto}
              />

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
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Refactor `checklist-step.tsx`**

4a. Ganti blok import ikon dan import lokal. Hasil import akhir di atas file:

```tsx
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ClipboardCheck,
  InfoIcon,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getLockedAhoTickets } from "@/lib/aho-ticket-groups";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import {
  type ChecklistItem,
  type ChecklistCondition,
  type ChecklistCategory,
} from "@/lib/checklist-data";
import {
  toAhoTicketHolders,
  type SignageChange,
} from "../hooks/signage-checklist";
import { ChecklistPhotoField } from "./checklist-photo-field";
import { ChecklistDamageFields } from "./checklist-damage-fields";
import { SignageChecklistItem } from "./signage-checklist-item";
```

(Import `resolvePhotoUrl`, `LocalNotesTextarea`, `LocalAhoInput`, `Camera`, `CheckCircle2` dihapus karena sudah pindah.)

4b. Di `ChecklistStepProps`, setelah `onHandlerChange: ...;` tambahkan:

```tsx
  onSignageChange: (
    itemId: string,
    itemName: string,
    change: SignageChange,
  ) => void;
```

dan tambahkan `onSignageChange,` ke destructuring parameter `ChecklistStep` setelah `onHandlerChange,`.

4c. Ganti memo `selectedAhoTickets` (seluruh `const selectedAhoTickets = useMemo(() => { ... }, [checklist]);`) dengan:

```tsx
  const ahoTicketHolders = useMemo(
    () => toAhoTicketHolders(checklist),
    [checklist],
  );
```

4d. Di dalam `category.items.map((item) => {`, ganti dua baris:

```tsx
                        const itemData = checklist.get(item.id);
                        const condition = itemData?.condition;
```

menjadi:

```tsx
                        const itemData = checklist.get(item.id);

                        if (item.signage) {
                          return (
                            <SignageChecklistItem
                              key={item.id}
                              item={{ ...item, signage: item.signage }}
                              itemData={itemData}
                              storeCode={storeCode}
                              lockedAhoTickets={getLockedAhoTickets(
                                item.id,
                                ahoTicketHolders,
                              )}
                              onSignageChange={onSignageChange}
                              onNotesChange={onNotesChange}
                              onAhoTicketNumberChange={onAhoTicketNumberChange}
                              onOpenCamera={onOpenCamera}
                              onPreviewPhoto={onPreviewPhoto}
                              onRemovePhoto={onRemovePhoto}
                            />
                          );
                        }

                        const condition = itemData?.condition;
```

4e. Hapus deklarasi:

```tsx
                        const hasPhoto =
                          !!itemData?.photo || !!itemData?.photoUrl;
```

4f. Ganti seluruh elemen `<div className="flex flex-col gap-2" data-tour="bms-checklist-photo"> … </div>` (berisi label "Foto Bukti", tombol Upload Image, dan `PhotoThumbnail`) dengan:

```tsx
                                    <ChecklistPhotoField
                                      itemId={item.id}
                                      photo={itemData?.photo}
                                      photoUrl={itemData?.photoUrl}
                                      onOpenCamera={onOpenCamera}
                                      onPreviewPhoto={onPreviewPhoto}
                                      onRemovePhoto={onRemovePhoto}
                                    />
```

4g. Ganti blok terakhir `{isBroken ? ( <div className="flex flex-col gap-2"> … Catatan … No Tiket AHO … </div> ) : null}` (yang berisi `data-tour="bms-checklist-notes"` dan `data-tour="bms-checklist-aho"`) dengan:

```tsx
                                    {isBroken ? (
                                      <ChecklistDamageFields
                                        itemId={item.id}
                                        itemName={item.name}
                                        storeCode={storeCode}
                                        notes={itemData?.notes}
                                        ahoTicketNumber={
                                          itemData?.ahoTicketNumber
                                        }
                                        lockedAhoTickets={getLockedAhoTickets(
                                          item.id,
                                          ahoTicketHolders,
                                        )}
                                        onNotesChange={onNotesChange}
                                        onAhoTicketNumberChange={
                                          onAhoTicketNumberChange
                                        }
                                      />
                                    ) : null}
```

4h. Hapus seluruh fungsi `PhotoThumbnail` di bawah file (beserta komentar `/* ─── Photo Thumbnail (internal) ─── */`).

- [ ] **Step 5: Kunci input manual di `local-aho-input.tsx`**

Tepat sebelum `const handleSelect = ...`, tambahkan:

```tsx
    const trimmedManualInput = manualInput.trim();
    const isManualTicketTaken =
        selectedTickets.has(trimmedManualInput) &&
        trimmedManualInput !== localValue;
```

Ubah `handleManualSubmit` menjadi:

```tsx
    const handleManualSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (trimmedManualInput && !isManualTicketTaken) {
            handleSelect(trimmedManualInput);
        }
    };
```

Ubah prop `disabled` tombol "Pakai" menjadi:

```tsx
                            disabled={
                                isManualTicketTaken ||
                                !/^[A-Z0-9]{4}-P-[A-Z]\d{2}-\d+$/i.test(trimmedManualInput)
                            }
```

Tepat setelah elemen `</form>` (masih di dalam `PopoverContent`), tambahkan:

```tsx
                    {isManualTicketTaken ? (
                        <p className="text-[11px] text-destructive">
                            Nomor tiket ini sudah dipakai item lain.
                        </p>
                    ) : null}
```

- [ ] **Step 6: Wiring di `create-form.tsx`**

Tambahkan `updateSignageItem,` pada destructuring `useChecklist(...)` (setelah `updateChecklistItem,`). Pada `<ChecklistStep ...>`, setelah prop `onHandlerChange={...}` tambahkan:

```tsx
            onSignageChange={updateSignageItem}
```

- [ ] **Step 7: Cek tipe & lint**

Run: `npx tsc --noEmit && npx eslint "app/reports/(bms)/create"`
Expected: tanpa error.

- [ ] **Step 8: Verifikasi manual**

Jalankan dev server (`preview_start` dengan nama `dev`, port 3001), login sebagai BMS test, buka buat laporan untuk toko yang belum preventif kuartal ini, buka kategori I:
- I11/I12/I13 tampil dengan baris Material; I13 punya "Tidak Ada".
- Pilih material → baris Kondisi muncul (2×2). Kotor → hanya Foto Bukti. Rusak → "Ditangani Rekanan", Foto, Catatan, No Tiket AHO.
- Isi tiket di Shop Sign Rusak, lalu set Pole Sign Pudar → tiket terisi otomatis sama. Ganti tiket di Pole Sign → Shop Sign ikut berubah.
- Di item Panel Listrik (A18) Rusak, tiket grup signage tampil "Terpilih"; mengetik nomor itu manual → tombol "Pakai" nonaktif dengan keterangan.
- I13 Tidak Ada → kondisi/foto/catatan/tiket hilang.

- [ ] **Step 9: Commit**

```bash
git add "app/reports/(bms)/create/components" "app/reports/(bms)/create/create-form.tsx"
git commit -m "feat(checklist): add signage checklist card with shared AHO ticket"
```

---

### Task 8: Tampilan kondisi signage di PDF, detail, review, dan export

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`
- Modify: `lib/pdf/checklist-photo-gallery.ts`
- Modify: `lib/pdf/report-pdf-full-builder.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`
- Modify: `app/reports/[reportNumber]/report-detail-view.tsx`
- Modify: `app/reports/(bms)/create/components/review-step.tsx`
- Modify: `scripts/export-preventive-photos.ts`

**Interfaces:**
- Consumes: `describeSignageCondition` (Task 1); `ReportItemJson.signageCondition/signageMaterial` (Task 4).

- [ ] **Step 1: Tabel checklist PDF**

Di `lib/pdf/generate-report-pdf.ts`, tambahkan import `import { describeSignageCondition } from "@/lib/signage";`. Di `ItemRow`, ganti argumen teks kolom kondisi:

```ts
                                conditionLabel(
                                    item.condition,
                                    item.preventiveCondition,
                                ),
```

menjadi:

```ts
                                describeSignageCondition(item)?.text ??
                                    conditionLabel(
                                        item.condition,
                                        item.preventiveCondition,
                                    ),
```

- [ ] **Step 2: Tile foto PDF**

Di `ChecklistItemWithPhotos` (generate-report-pdf.ts) dan `ChecklistPhotoTile` (`lib/pdf/checklist-photo-gallery.ts`), setelah `preventiveCondition?: string | null;` tambahkan:

```ts
    signageCondition?: string | null;
    signageMaterial?: string | null;
```

Di `flattenChecklistPhotoTiles`, setelah `preventiveCondition: item.preventiveCondition,` tambahkan:

```ts
            signageCondition: item.signageCondition,
            signageMaterial: item.signageMaterial,
```

Di `lib/pdf/report-pdf-full-builder.ts`, setelah `preventiveCondition: item.preventiveCondition,` tambahkan:

```ts
                signageCondition: item.signageCondition,
                signageMaterial: item.signageMaterial,
```

Di `renderDocPhotoTile`, ganti tiga baris awal:

```ts
    const label = conditionLabel(tile.condition ?? null, tile.preventiveCondition ?? null);
    const isRusak = label === "Rusak" || label === "Not OK";
    const isBaik = label === "Baik" || label === "OK";
```

menjadi:

```ts
    const signage = describeSignageCondition(tile);
    const label =
        signage?.label ??
        conditionLabel(tile.condition ?? null, tile.preventiveCondition ?? null);
    const isRusak = signage
        ? signage.isDamaged
        : label === "Rusak" || label === "Not OK";
    const isBaik = signage
        ? !signage.isDamaged
        : label === "Baik" || label === "OK";
```

- [ ] **Step 3: Detail dashboard**

Di `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`, tambahkan import `import { describeSignageCondition } from "@/lib/signage";`. Di awal body `getConditionMeta`, sebelum `if (item.preventiveCondition === "OK")`, tambahkan:

```ts
    const signage = describeSignageCondition(item);
    if (signage) {
        return { label: signage.text, tone: signage.isDamaged ? "bad" : "good" };
    }
```

- [ ] **Step 4: Detail laporan BMS**

Di `app/reports/[reportNumber]/report-detail-view.tsx`, tambahkan import `import { describeSignageCondition } from "@/lib/signage";`. Di `visibleItems.map((ci) => {`, setelah deklarasi `const photos = ...;`, tambahkan:

```tsx
                const signageDescription = describeSignageCondition(ri ?? {});
```

Tepat setelah `</div>` penutup baris `<div className="flex items-start gap-2.5"> … {ci.name} … </div>`, tambahkan:

```tsx
                      {signageDescription ? (
                        <p className="text-xs text-muted-foreground mt-1 ml-[38px]">
                          {signageDescription.text}
                        </p>
                      ) : null}
```

- [ ] **Step 5: Review step**

Di `app/reports/(bms)/create/components/review-step.tsx`, tambahkan import `import { describeSignageCondition } from "@/lib/signage";` dan setelah konstanta `CHECKLIST_ASSIGNEE_LABELS` tambahkan:

```tsx
function formatBrokenItemDetail(item: ChecklistItem): string {
  const handler = CHECKLIST_ASSIGNEE_LABELS[item.handler || ""] ?? "";
  const signage = describeSignageCondition(item);
  return signage
    ? `Handler: ${handler} · ${signage.text}`
    : `Handler: ${handler}`;
}
```

Lalu ganti:

```tsx
                        Handler: {CHECKLIST_ASSIGNEE_LABELS[item.handler || ""]}
```

menjadi:

```tsx
                        {formatBrokenItemDetail(item)}
```

(Pastikan `ChecklistItem` sudah di-import sebagai type dari `@/lib/checklist-data` — file ini sudah memakainya di props.)

- [ ] **Step 6: Script export foto preventif**

Di `scripts/export-preventive-photos.ts`, tambahkan import `import { describeSignageCondition } from "../lib/signage";`. Di `getConditionLabel`, ubah tipe `record` dan tambahkan pengecekan signage sebelum `const value = ...`:

```ts
    const record = item as {
        condition?: unknown;
        preventiveCondition?: unknown;
        signageCondition?: unknown;
        signageMaterial?: unknown;
    };

    const signage = describeSignageCondition({
        signageCondition:
            typeof record.signageCondition === "string"
                ? record.signageCondition
                : null,
        signageMaterial:
            typeof record.signageMaterial === "string"
                ? record.signageMaterial
                : null,
    });
    if (signage) return signage.label;
```

- [ ] **Step 7: Jalankan spec PDF terkait & cek tipe**

Run: `npx tsx lib/pdf/generate-report-pdf-gallery.spec.ts && npx tsc --noEmit && npm run lint`
Expected: spec lolos, tanpa error tipe/lint.

- [ ] **Step 8: Verifikasi manual PDF**

Dengan dev server berjalan, buat laporan berisi I11 Kotor·Embos, I12 Rusak·Acrylic, I13 Tidak Ada lalu submit. Buka PDF laporan (atau `/api/preview-pdf` untuk laporan itu): kolom kondisi menampilkan "Kotor · Embos", "Rusak · Acrylic", "Tidak Ada"; badge tile foto I12 merah, I11 hijau. Buka detail laporan di dashboard: badge "Rusak · Acrylic" merah. Pastikan laporan masuk status `PENDING_CHECKLIST_REVIEW` jika tidak ada item rusak handler BMS.

- [ ] **Step 9: Commit**

```bash
git add lib/pdf/generate-report-pdf.ts lib/pdf/checklist-photo-gallery.ts lib/pdf/report-pdf-full-builder.ts "app/dashboard/reports/[reportNumber]/_lib/detail-data.ts" "app/reports/[reportNumber]/report-detail-view.tsx" "app/reports/(bms)/create/components/review-step.tsx" scripts/export-preventive-photos.ts
git commit -m "feat(reports): show signage condition and material in PDF and detail"
```

---

# Bagian B — Popup Contoh Foto

### Task 9: Data contoh foto & aset

**Files:**
- Modify: `lib/checklist-data.ts`
- Create: `lib/photo-guides.ts`
- Test: `lib/photo-guides.spec.ts`
- Create: `public/assets/photo-guides/kwh.png`, `public/assets/photo-guides/panel-listrik.png`

**Interfaces:**
- Produces:
  - `type PhotoGuideKey = "kwh" | "panel"` dan `ChecklistCatalogItem.photoGuide?: PhotoGuideKey` (di `lib/checklist-data.ts`)
  - `PHOTO_GUIDE_COUNTDOWN_SECONDS = 5`
  - `type PhotoGuide = { key: PhotoGuideKey; title: string; src: string; alt: string }`
  - `PHOTO_GUIDES: Record<PhotoGuideKey, PhotoGuide>`
  - `getPhotoGuideForItem(itemId: string): PhotoGuide | undefined`
  - `shouldGateCamera(itemId: string, seenItemIds: ReadonlySet<string>): boolean`

- [ ] **Step 1: Salin aset**

```bash
mkdir -p public/assets/photo-guides
cp "C:/Users/RENDIE~1/AppData/Local/Temp/claude/D--MAGANG-ALFA-sparta-maintenance/76475f95-c06b-408a-be1d-46a3ac367b2b/scratchpad/photo-guide-kwh.png" public/assets/photo-guides/kwh.png
cp "C:/Users/RENDIE~1/AppData/Local/Temp/claude/D--MAGANG-ALFA-sparta-maintenance/76475f95-c06b-408a-be1d-46a3ac367b2b/scratchpad/photo-guide-panel.png" public/assets/photo-guides/panel-listrik.png
ls -la public/assets/photo-guides
```

Expected: dua file PNG (~400 KB). Jika path scratchpad sudah tidak ada, minta user mengirim ulang dua gambar slide ("Contoh Foto KwH yang Benar", "Contoh Foto Panel yang Benar") dan simpan dengan nama di atas.

- [ ] **Step 2: Tulis test yang gagal**

Buat `lib/photo-guides.spec.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
    PHOTO_GUIDES,
    PHOTO_GUIDE_COUNTDOWN_SECONDS,
    getPhotoGuideForItem,
    shouldGateCamera,
} from "./photo-guides";

assert.equal(PHOTO_GUIDE_COUNTDOWN_SECONDS, 5);
assert.equal(getPhotoGuideForItem("A22")?.key, "kwh");
for (const itemId of ["A18", "C6", "E7", "I3"]) {
    assert.equal(getPhotoGuideForItem(itemId)?.key, "panel", itemId);
}
assert.equal(getPhotoGuideForItem("A1"), undefined);

assert.equal(shouldGateCamera("A22", new Set()), true);
assert.equal(shouldGateCamera("A22", new Set(["A22"])), false);
assert.equal(shouldGateCamera("A1", new Set()), false);

for (const guide of Object.values(PHOTO_GUIDES)) {
    assert.equal(
        existsSync(path.join(process.cwd(), "public", guide.src)),
        true,
        guide.src,
    );
}

console.log("photo guide tests passed");
```

Run: `npx tsx lib/photo-guides.spec.ts`
Expected: FAIL — `Cannot find module './photo-guides'`.

- [ ] **Step 3: Tambah `photoGuide` ke katalog**

Di `lib/checklist-data.ts`, setelah `export type AhoTicketGroup = "signage";` tambahkan:

```ts
export type PhotoGuideKey = "kwh" | "panel";
```

Di `ChecklistCatalogItem`, setelah `ahoTicketGroup?: AhoTicketGroup;` tambahkan:

```ts
    /** Contoh foto benar yang wajib dilihat sebelum memfoto item ini. */
    photoGuide?: PhotoGuideKey;
```

Ubah item berikut:

```ts
            { id: "A18", name: "Panel Listrik", photoGuide: "panel" },
            { id: "A22", name: "Segel Kwh meter listrik / MCB PLN", photoGuide: "kwh" },
            { id: "C6", name: "Panel Listrik", photoGuide: "panel" },
            { id: "E7", name: "Panel Listrik", photoGuide: "panel" },
```

dan item `I3` menjadi:

```ts
            {
                id: "I3",
                name: "Panel Listrik",
                desc: "Pembersihan Panel, Pengencangan baut MCB dan Perapihan Instalasi",
                photoGuide: "panel",
            },
```

- [ ] **Step 4: Buat `lib/photo-guides.ts`**

```ts
import {
    REPORT_CHECKLIST_ITEMS,
    type PhotoGuideKey,
} from "@/lib/checklist-data";

export const PHOTO_GUIDE_COUNTDOWN_SECONDS = 5;

export type PhotoGuide = {
    key: PhotoGuideKey;
    title: string;
    src: string;
    alt: string;
};

export const PHOTO_GUIDES: Record<PhotoGuideKey, PhotoGuide> = {
    kwh: {
        key: "kwh",
        title: "Contoh Foto KwH yang Benar",
        src: "/assets/photo-guides/kwh.png",
        alt: "Dua contoh foto KwH meter dengan segel terlihat jelas, ditandai lingkaran merah, agar segel KwH terlihat jelas",
    },
    panel: {
        key: "panel",
        title: "Contoh Foto Panel Listrik yang Benar",
        src: "/assets/photo-guides/panel-listrik.png",
        alt: "Dua contoh foto panel listrik terbuka agar kondisi MCB dan wiring terlihat jelas",
    },
};

const guideKeyByItemId = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.photoGuide ? [[item.id, item.photoGuide] as const] : [],
    ),
);

export function getPhotoGuideForItem(itemId: string): PhotoGuide | undefined {
    const key = guideKeyByItemId.get(itemId);
    return key ? PHOTO_GUIDES[key] : undefined;
}

/** Popup terkunci hanya sekali per item per halaman. */
export function shouldGateCamera(
    itemId: string,
    seenItemIds: ReadonlySet<string>,
): boolean {
    return Boolean(getPhotoGuideForItem(itemId)) && !seenItemIds.has(itemId);
}
```

- [ ] **Step 5: Jalankan test, pastikan lolos**

Run: `npx tsx lib/photo-guides.spec.ts`
Expected: `photo guide tests passed`

- [ ] **Step 6: Commit**

```bash
git add lib/checklist-data.ts lib/photo-guides.ts lib/photo-guides.spec.ts public/assets/photo-guides
git commit -m "feat(checklist): add photo guide data for KwH and panel items"
```

---

### Task 10: Komponen popup, hook gate, dan link

**Files:**
- Create: `components/photo-guide/photo-guide-dialog.tsx`
- Create: `components/photo-guide/use-photo-guide-gate.ts`
- Create: `components/photo-guide/photo-guide-link.tsx`

**Interfaces:**
- Consumes: `PHOTO_GUIDE_COUNTDOWN_SECONDS`, `PhotoGuide`, `getPhotoGuideForItem`, `shouldGateCamera` (Task 9).
- Produces:
  - `type PhotoGuideRequest = { guide: PhotoGuide; itemId: string; mode: "gate" | "view"; onConfirm?: () => void }`
  - `PhotoGuideDialog({ request, onUnlock, onClose })`
  - `usePhotoGuideGate(): { requestCamera(itemId: string, openCamera: () => void): void; showGuide(itemId: string): void; dialogProps: { request: PhotoGuideRequest | null; onUnlock(itemId: string): void; onClose(): void } }`
  - `PhotoGuideLink({ onClick })`

- [ ] **Step 1: Buat `photo-guide-dialog.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Camera, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PHOTO_GUIDE_COUNTDOWN_SECONDS,
  type PhotoGuide,
} from "@/lib/photo-guides";

export type PhotoGuideRequest = {
  guide: PhotoGuide;
  itemId: string;
  mode: "gate" | "view";
  onConfirm?: () => void;
};

export function PhotoGuideDialog({
  request,
  onUnlock,
  onClose,
}: {
  request: PhotoGuideRequest | null;
  onUnlock: (itemId: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {request ? (
        <PhotoGuideDialogBody
          key={`${request.itemId}-${request.mode}`}
          request={request}
          onUnlock={onUnlock}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function PhotoGuideDialogBody({
  request,
  onUnlock,
  onClose,
}: {
  request: PhotoGuideRequest;
  onUnlock: (itemId: string) => void;
  onClose: () => void;
}) {
  const isGate = request.mode === "gate";
  const [imageStatus, setImageStatus] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const [secondsLeft, setSecondsLeft] = useState(
    isGate ? PHOTO_GUIDE_COUNTDOWN_SECONDS : 0,
  );
  // Gambar gagal dimuat tidak boleh memblokir BMS.
  const isLocked = isGate && imageStatus !== "error" && secondsLeft > 0;

  // Hitung mundur baru berjalan setelah gambar tampil.
  useEffect(() => {
    if (!isGate || imageStatus !== "loaded" || secondsLeft <= 0) return;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [isGate, imageStatus, secondsLeft]);

  useEffect(() => {
    if (isGate && !isLocked) onUnlock(request.itemId);
  }, [isGate, isLocked, onUnlock, request.itemId]);

  const preventCloseWhileLocked = (event: Event) => {
    if (isLocked) event.preventDefault();
  };

  return (
    <DialogContent
      showCloseButton={!isLocked}
      onEscapeKeyDown={preventCloseWhileLocked}
      onInteractOutside={preventCloseWhileLocked}
      className="sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>{request.guide.title}</DialogTitle>
        <DialogDescription>
          {isGate
            ? "Perhatikan contoh foto berikut sebelum mengambil foto."
            : "Gunakan contoh ini sebagai acuan saat mengambil foto."}
        </DialogDescription>
      </DialogHeader>

      {imageStatus === "error" ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <ImageOff className="size-6" />
          Gambar contoh gagal dimuat.
        </div>
      ) : (
        <a
          href={request.guide.src}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.guide.src}
            alt={request.guide.alt}
            className="max-h-[65vh] w-full object-contain"
            onLoad={() => setImageStatus("loaded")}
            onError={() => setImageStatus("error")}
          />
        </a>
      )}

      {isGate ? (
        <DialogFooter>
          {!isLocked ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={isLocked}
            onClick={() => {
              onClose();
              request.onConfirm?.();
            }}
          >
            <Camera data-icon="inline-start" />
            {isLocked
              ? `Tunggu ${secondsLeft} detik…`
              : "Saya mengerti, ambil foto"}
          </Button>
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}
```

- [ ] **Step 2: Buat `use-photo-guide-gate.ts`**

```ts
"use client";

import { useCallback, useState } from "react";
import { getPhotoGuideForItem, shouldGateCamera } from "@/lib/photo-guides";
import type { PhotoGuideRequest } from "./photo-guide-dialog";

/**
 * Menahan pembukaan kamera untuk item ber-contoh foto sampai BMS melihat
 * contohnya sekali. State hanya di halaman (reload = tampil lagi).
 */
export function usePhotoGuideGate() {
  const [seenItemIds, setSeenItemIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [request, setRequest] = useState<PhotoGuideRequest | null>(null);

  const requestCamera = useCallback(
    (itemId: string, openCamera: () => void) => {
      const guide = getPhotoGuideForItem(itemId);
      if (!guide || !shouldGateCamera(itemId, seenItemIds)) {
        openCamera();
        return;
      }
      setRequest({ guide, itemId, mode: "gate", onConfirm: openCamera });
    },
    [seenItemIds],
  );

  const showGuide = useCallback((itemId: string) => {
    const guide = getPhotoGuideForItem(itemId);
    if (guide) setRequest({ guide, itemId, mode: "view" });
  }, []);

  const markSeen = useCallback((itemId: string) => {
    setSeenItemIds((prev) =>
      prev.has(itemId) ? prev : new Set(prev).add(itemId),
    );
  }, []);

  const close = useCallback(() => setRequest(null), []);

  return {
    requestCamera,
    showGuide,
    dialogProps: { request, onUnlock: markSeen, onClose: close },
  };
}
```

- [ ] **Step 3: Buat `photo-guide-link.tsx`**

```tsx
"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoGuideLink({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="link" size="sm" onClick={onClick}>
      <ImageIcon data-icon="inline-start" />
      Lihat contoh foto
    </Button>
  );
}
```

- [ ] **Step 4: Cek tipe & lint**

Run: `npx tsc --noEmit && npx eslint components/photo-guide`
Expected: tanpa error.

- [ ] **Step 5: Commit**

```bash
git add components/photo-guide
git commit -m "feat(photo-guide): add locked photo guide dialog and gate hook"
```

---

### Task 11: Pasang popup di form checklist dan halaman penyelesaian

**Files:**
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Modify: `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx`

**Interfaces:**
- Consumes: `usePhotoGuideGate`, `PhotoGuideDialog`, `PhotoGuideLink` (Task 10); `getPhotoGuideForItem` (Task 9).
- Produces: prop baru `ChecklistStep.onShowPhotoGuide: (itemId: string) => void`; prop baru `CompletionItemSection.onShowPhotoGuide?: () => void`.

- [ ] **Step 1: Link di `ChecklistStep`**

Tambahkan import `import { PhotoGuideLink } from "@/components/photo-guide/photo-guide-link";`. Di `ChecklistStepProps`, setelah `onOpenCamera: (itemId: string) => void;` tambahkan `onShowPhotoGuide: (itemId: string) => void;` dan tambahkan `onShowPhotoGuide,` ke destructuring parameter setelah `onOpenCamera,`.

Di kartu item biasa, ganti:

```tsx
                                    {item.desc ? (
                                      <p className="text-sm text-muted-foreground">
                                        {item.desc}
                                      </p>
                                    ) : null}
```

menjadi:

```tsx
                                    {item.desc ? (
                                      <p className="text-sm text-muted-foreground">
                                        {item.desc}
                                      </p>
                                    ) : null}
                                    {item.photoGuide ? (
                                      <PhotoGuideLink
                                        onClick={() =>
                                          onShowPhotoGuide(item.id)
                                        }
                                      />
                                    ) : null}
```

- [ ] **Step 2: Gate di `create-form.tsx`**

Tambahkan import:

```tsx
import { PhotoGuideDialog } from "@/components/photo-guide/photo-guide-dialog";
import { usePhotoGuideGate } from "@/components/photo-guide/use-photo-guide-gate";
```

Tepat sebelum baris `const {` yang membuka destructuring `usePhotoUpload({`, tambahkan:

```tsx
  const photoGuideGate = usePhotoGuideGate();
```

Pada `<ChecklistStep ...>`, ganti `onOpenCamera={handleOpenCamera}` menjadi:

```tsx
            onOpenCamera={(itemId) =>
              photoGuideGate.requestCamera(itemId, () => {
                void handleOpenCamera(itemId);
              })
            }
            onShowPhotoGuide={photoGuideGate.showGuide}
```

Tepat setelah elemen `<CameraModal ... />`, tambahkan:

```tsx
      <PhotoGuideDialog {...photoGuideGate.dialogProps} />
```

- [ ] **Step 3: Link di `CompletionItemSection`**

Tambahkan import `import { PhotoGuideLink } from "@/components/photo-guide/photo-guide-link";`. Tambahkan prop `onShowPhotoGuide` pada destructuring (setelah `onOpenCamera,`) dan tipe props (setelah `onOpenCamera: () => void;`):

```tsx
  onShowPhotoGuide?: () => void;
```

Di blok "Foto sesudah", tepat setelah `</div>` penutup `<div className="flex items-center justify-between gap-2">` (yang berisi Label "Foto sesudah" dan tombol Kamera), tambahkan:

```tsx
          {onShowPhotoGuide ? (
            <PhotoGuideLink onClick={onShowPhotoGuide} />
          ) : null}
```

- [ ] **Step 4: Gate di `completion-client.tsx`**

Tambahkan import:

```tsx
import { PhotoGuideDialog } from "@/components/photo-guide/photo-guide-dialog";
import { usePhotoGuideGate } from "@/components/photo-guide/use-photo-guide-gate";
import { getPhotoGuideForItem } from "@/lib/photo-guides";
```

Tepat setelah pernyataan `} = useCompletionWorkForm( … );` (sebelum `const onSubmitClick = () => {`), tambahkan:

```tsx
  const photoGuideGate = usePhotoGuideGate();
```

Pada `<CompletionItemSection ...>`, ganti prop `onOpenCamera` menjadi:

```tsx
                onOpenCamera={() =>
                  photoGuideGate.requestCamera(item.itemId, () =>
                    setCameraTarget({
                      target: "item",
                      itemId: item.itemId,
                    }),
                  )
                }
                onShowPhotoGuide={
                  getPhotoGuideForItem(item.itemId)
                    ? () => photoGuideGate.showGuide(item.itemId)
                    : undefined
                }
```

Tepat setelah elemen `<CameraModal ... />`, tambahkan:

```tsx
      <PhotoGuideDialog {...photoGuideGate.dialogProps} />
```

- [ ] **Step 5: Cek tipe & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tanpa error.

- [ ] **Step 6: Verifikasi manual**

Dev server berjalan, login BMS test:
- Form buat laporan → A18 Panel Listrik pilih Baik → tekan Upload Image: popup "Contoh Foto Panel Listrik yang Benar" muncul tanpa tombol X; Esc/klik luar tidak menutup; tombol "Tunggu 5 detik…" menghitung mundur setelah gambar tampil, lalu "Saya mengerti, ambil foto" membuka kamera.
- Hapus foto lalu Upload lagi → kamera langsung terbuka.
- Link "Lihat contoh foto" membuka popup tanpa hitung mundur, bisa ditutup langsung.
- A22 menampilkan slide KwH. Item lain (mis. A1) membuka kamera langsung.
- Pindah ke step Estimasi lalu kembali → A18 tetap tidak terkunci lagi.
- Halaman penyelesaian laporan yang punya Panel Listrik/KwH rusak handler BMS → tombol Kamera foto sesudah memunculkan popup terkunci sekali; link "Lihat contoh foto" ada.
- Simulasikan gambar gagal (DevTools → block URL `/assets/photo-guides/kwh.png`) → pesan "Gambar contoh gagal dimuat." dan tombol langsung aktif.

- [ ] **Step 7: Commit**

```bash
git add "app/reports/(bms)/create/components/checklist-step.tsx" "app/reports/(bms)/create/create-form.tsx" "app/reports/[reportNumber]/completion/components/completion-item-section.tsx" "app/reports/[reportNumber]/completion/completion-client.tsx"
git commit -m "feat(reports): require photo guide before KwH and panel photos"
```

---

### Task 12: Verifikasi akhir

**Files:** —

- [ ] **Step 1: Jalankan semua spec yang tersentuh**

```bash
npx tsx lib/signage.spec.ts && npx tsx lib/report-preventive.spec.ts && npx tsx lib/aho-ticket-groups.spec.ts && npx tsx lib/photo-guides.spec.ts && npx tsx app/reports/actions/types.spec.ts && npx tsx app/reports/actions/report-json-helpers.spec.ts && npx tsx app/reports/actions/submit-draft-source.spec.ts && npx tsx "app/reports/(bms)/create/hooks/draft-data.spec.ts" && npx tsx "app/reports/(bms)/create/hooks/signage-checklist.spec.ts" && npx tsx lib/pdf/generate-report-pdf-gallery.spec.ts
```

Expected: setiap spec mencetak pesan "... passed".

- [ ] **Step 2: Lint, tipe, build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: semuanya sukses.

- [ ] **Step 3: Regresi preventif data lama**

Di dev server sebagai admin, buka dashboard Checklist Preventif (matriks tahunan): toko yang sudah preventif kuartal ini (laporan lama I1–I10) tetap tercatat. Sebagai BMS, buat laporan baru untuk toko tersebut → kategori I tetap tersembunyi (cooldown) dan muncul Mode Perbaikan.

- [ ] **Step 4: Edit & revisi draft**

Simpan draft berisi signage (Rusak·Acrylic + tiket), reload, buka draft → material, kondisi, catatan, dan tiket kembali. Ulangi lewat halaman edit/revisi laporan yang ditolak.
