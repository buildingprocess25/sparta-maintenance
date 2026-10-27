# Standar Kondisi Baik di Form Checklist BMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan standar kondisi baik (dari form FCKT) sebagai teks kecil yang selalu terlihat di bawah nama setiap item checklist kategori A–H di form BMS.

**Architecture:** Field opsional `standard` ditambahkan ke `ChecklistCatalogItem` dan diisi langsung pada 115 item A–H di `lib/checklist-data.ts`. `ChecklistStep` merender `item.standard` di kartu item biasa. Tidak ada perubahan database, server action, PDF, atau halaman detail.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui. Test: file `*.spec.ts` dengan `node:assert/strict`, dijalankan `npx tsx <file>`.

**Spec:** `docs/superpowers/specs/2026-10-27-checklist-good-condition-standard-design.md`

## Global Constraints

- Branch: `feature/signage-items-photo-guide` (sudah aktif). Jangan membuat branch baru, jangan switch branch, jangan push.
- Standar hanya untuk kategori A–H (115 item). Kategori I (I1–I13) tidak diberi `standard`.
- ID, nama, urutan, dan field lain item katalog tidak boleh berubah.
- Teks standar dipakai persis seperti di blok kode Task 1 (sudah dicocokkan berdasarkan nama item dan dibersihkan).
- Label tampilan persis: `Standar baik:` diikuti teks standar.
- Standar hanya tampil di form checklist BMS (`ChecklistStep`). Detail laporan, PDF, export, dan kartu signage tidak diubah.
- Jangan menambah padding/margin/gap manual pada komponen shadcn (`AI_RULES.md`).
- Repo pre-commit hook (`.githooks`) mewajibkan task note: salin `docs/agent-notes/TEMPLATE.md` ke `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (waktu Asia/Jakarta), isi singkat, dan ikutkan di commit. Jangan pakai `--no-verify`.
- Commit memakai Conventional Commits, tanpa baris `Co-Authored-By` / "Generated with".
- Jangan menjalankan `git stash`, `git reset`, atau `git checkout -- <file>`.
- `npx tsc --noEmit` mungkin menampilkan error di file generate `.next/` — abaikan yang di `.next/`, tidak boleh ada error di tempat lain.

---

## File Structure

- Modify: `lib/checklist-data.ts` — field `standard` di `ChecklistCatalogItem` dan data 115 item A–H.
- Create: `lib/checklist-standard.spec.ts` — menjaga kelengkapan dan pemetaan data standar.
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx` — render baris "Standar baik: …".

---

### Task 1: Data standar kondisi baik di katalog

**Files:**
- Modify: `lib/checklist-data.ts`
- Test: `lib/checklist-standard.spec.ts`

**Interfaces:**
- Produces: `ChecklistCatalogItem.standard?: string` — terisi untuk semua item kategori A–H, `undefined` untuk kategori I. Ikut terbawa ke `REPORT_CHECKLIST_ITEMS` (yang di-spread dari katalog).

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/checklist-standard.spec.ts`:

```ts
import assert from "node:assert/strict";
import { checklistCategories } from "./checklist-data";

const itemsWithCategory = checklistCategories.flatMap((category) =>
    category.items.map((item) => ({ ...item, categoryId: category.id })),
);

const nonPreventive = itemsWithCategory.filter((item) => item.categoryId !== "I");
const preventive = itemsWithCategory.filter((item) => item.categoryId === "I");

for (const item of nonPreventive) {
    assert.equal(
        typeof item.standard === "string" && item.standard.trim().length > 0,
        true,
        `${item.id} wajib punya standard`,
    );
}
for (const item of preventive) {
    assert.equal(item.standard, undefined, `${item.id} tidak boleh punya standard`);
}
assert.equal(itemsWithCategory.filter((item) => item.standard).length, 115);

const standardOf = (id: string) =>
    itemsWithCategory.find((item) => item.id === id)?.standard;

// Contoh item yang kodenya bergeser antara FCKT dan katalog aplikasi.
assert.equal(standardOf("D4"), "Tidak kusam, tidak berlubang");
assert.equal(standardOf("D9"), "Bersih, tidak tersumbat, tidak retak/pecah");
assert.equal(standardOf("H1"), "Tidak keropos, tidak patah");
assert.equal(
    standardOf("H3"),
    "Tidak retak/pecah, tidak berlubang, tidak sobek",
);
assert.equal(standardOf("B11"), "Tidak lepas, tidak pecah, ada arus listrik");
assert.equal(standardOf("B12"), "Tidak keropos, bisa terkunci");
assert.equal(standardOf("C11"), "Bersih, tidak tersumbat");
assert.equal(
    standardOf("A18"),
    "Bersih, kabel & MCB tertata rapih serta berfungsi",
);

console.log("checklist standard tests passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/checklist-standard.spec.ts`
Expected: FAIL — `AssertionError: A1 wajib punya standard`.

- [ ] **Step 3: Tambah field di tipe**

Di `lib/checklist-data.ts`, pada `interface ChecklistCatalogItem`, setelah baris `photoGuide?: PhotoGuideKey;`, tambahkan:

```ts
    /** Standar kondisi baik dari form FCKT (SAT/FRM/MED/001), kategori A–H. */
    standard?: string;
```

- [ ] **Step 4: Isi data standar untuk kategori A–H**

Di `lib/checklist-data.ts`, di dalam `export const checklistCategories: ChecklistCategory[] = [`, ganti seluruh objek kategori A sampai H — mulai dari baris `    {` yang diikuti `        id: "A",` sampai baris `    },` penutup kategori H (tepat sebelum `    {` yang diikuti `        id: "I",`) — dengan blok berikut. Objek kategori I tidak diubah. Satu-satunya perbedaan dari blok lama adalah tambahan `standard: "…"` di setiap item; `photoGuide` pada A18, A22, C6, E7 tetap ada.

```ts
    {
        id: "A",
        title: "A. Bagian Depan Bangunan",
        items: [
            { id: "A1", name: "Bahu Jalan", standard: "Tidak berlubang, tidak bergelombang" },
            { id: "A2", name: "Dekker/Grill Drainase", standard: "Tidak pecah, tidak retak, tidak patah" },
            { id: "A3", name: "Pagar/Rantai Besi", standard: "Tidak keropos, tidak patah" },
            { id: "A4", name: "Lampu Pole Sign", standard: "Tidak kusam, tidak mati" },
            { id: "A5", name: "Lampu Shop Sign", standard: "Tidak kusam, tidak mati" },
            { id: "A6", name: "Lampu Listplank", standard: "Tidak kusam, tidak mati" },
            { id: "A7", name: "Halaman Parkir", standard: "Tidak berlubang, tidak bergelombang" },
            { id: "A8", name: "Pompa air + Instalasi", standard: "Pompa hidup, mengeluarkan air, tidak bocor" },
            { id: "A9", name: "PDAM + Instalasi", standard: "Meter air tersegel, tidak bocor, mengeluarkan air" },
            { id: "A10", name: "Dinding Pembatas Halaman", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A11", name: "Tiang Lampu Parkir", standard: "Tidak patah, tidak keropos" },
            { id: "A12", name: "Lampu Parkir (LED Tube/LED Sorot)*", standard: "Hidup dan bersih" },
            { id: "A13", name: "Awning/kanopi + talang", standard: "Tidak bocor, tidak keropos" },
            { id: "A14", name: "Lampu Awning/kanopi & lampu tutup toko", standard: "Hidup dan bersih" },
            { id: "A15", name: "Folding Gate/Pintu Besi Lipat/Rolling Door", standard: "Tidak macet, tidak patah" },
            { id: "A16", name: "Lantai Keramik Teras", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A17", name: "Dinding Teras", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A18", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "A19", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "A20", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "A21", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "A22", name: "Segel Kwh meter listrik / MCB PLN", photoGuide: "kwh", standard: "Terpasang dan tidak putus" },
            { id: "A23", name: "Angkur Genset", standard: "Menempel kokoh di dinding" },
            { id: "A24", name: "Stop Kontak Genset + Kabel", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "A25", name: "Stop kontak Tenan", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "A26", name: "Plafon Teras", standard: "Tidak kusam, tidak berlubang" },
            { id: "A27", name: "Manhole dalam (plafon teras)", standard: "Tidak kusam, tidak berlubang" },
            { id: "A28", name: "Lampu Teras", standard: "Hidup dan bersih" },
            { id: "A29", name: "Rangka/Dudukan sarana promo", standard: "Tidak keropos, tidak patah, tidak korosi/karat" },
            { id: "A30", name: "Pintu Alumunium + Kaca Single/Double Swing", standard: "Tidak bergesekan, tidak ngebanting, tidak pecah" },
            { id: "A31", name: "Floor Hinge", standard: "Bersih, tidak bocor" },
            { id: "A32", name: "Kusen Alumunium & Kaca", standard: "Tidak pecah, tidak retak, tidak patah" },
        ],
    },
    {
        id: "B",
        title: "B. Ruangan Area Sales",
        items: [
            { id: "B1", name: "Lampu Sales", standard: "Hidup dan bersih" },
            { id: "B2", name: "Plafon Sales", standard: "Tidak kusam, tidak berlubang" },
            { id: "B3", name: "Dinding Sales", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B4", name: "Lantai Keramik Sales", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B5", name: "Tiang/Kolom", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B6", name: "Instalasi Listrik Area Kasir", standard: "Tertata rapih, berpengaman" },
            { id: "B7", name: "Stop Kontak Area Kasir", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B8", name: "Meja Kasir + Aksesoris", standard: "Tidak patah, tidak lepas, kunci laci berfungsi" },
            { id: "B9", name: "Stop Kontak Chiller", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B10", name: "Exhaust Fan Ruang Chiller", standard: "Berfungsi dan bersih" },
            { id: "B11", name: "Stop Kontak Freezer", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B12", name: "Kusen + Daun Pintu P1", standard: "Tidak keropos, bisa terkunci" },
        ],
    },
    {
        id: "C",
        title: "C. Selasar",
        items: [
            { id: "C1", name: "Lampu selasar", standard: "Hidup dan bersih" },
            { id: "C2", name: "Plafon Selasar", standard: "Tidak kusam, tidak berlubang" },
            { id: "C3", name: "Manhole dalam (plafon selasar)", standard: "Tidak kusam, tidak berlubang" },
            { id: "C4", name: "Manhole luar (dak toren air)", standard: "Tidak keropos, tidak korosi/karat, terkunci gembok" },
            { id: "C5", name: "Dinding Selasar", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "C6", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "C7", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "C8", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "C9", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "C10", name: "Lantai Keramik Selasar", standard: "Tidak retak/pecah, tidak kusam" },
            { id: "C11", name: "Janitor", standard: "Bersih, tidak tersumbat" },
            { id: "C12", name: "Kran Janitor", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "C13", name: "Floor Drain Janitor", standard: "Tidak tersumbat, tutup drain terpasang" },
            { id: "C14", name: "Kitchen Sink", standard: "Tidak bocor/keropos, bersih" },
            { id: "C15", name: "Kran Kitchen Sink", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "C16", name: "Saluran Air Bersih", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "C17", name: "Saluran Air Kotor", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "C18", name: "Pompa air + Instalasi", standard: "Pompa hidup, mengeluarkan air, tidak bocor" },
        ],
    },
    {
        id: "D",
        title: "D. Kamar Mandi",
        items: [
            { id: "D1", name: "Pintu Kamar Mandi", standard: "Tidak macet, tidak keropos, bisa terkunci" },
            { id: "D2", name: "Lampu Kamar Mandi", standard: "Hidup dan bersih" },
            { id: "D3", name: "Exhaust Fan", standard: "Tidak kotor, tidak mati" },
            { id: "D4", name: "Plafon Kamar Mandi", standard: "Tidak kusam, tidak berlubang" },
            { id: "D5", name: "Dinding Kamar Mandi", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "D6", name: "Lantai Kamar Mandi", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "D7", name: "Floor Drain Kamar Mandi", standard: "Tidak tersumbat, tutup drain terpasang" },
            { id: "D8", name: "Kran Air", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "D9", name: "Kloset", standard: "Bersih, tidak tersumbat, tidak retak/pecah" },
            { id: "D10", name: "Septictank", standard: "Tidak penuh, tidak mampet/tersumbat" },
            { id: "D11", name: "Saluran Air Bersih", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "D12", name: "Saluran Air Kotor", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
        ],
    },
    {
        id: "E",
        title: "E. Gudang + Kantor",
        items: [
            { id: "E1", name: "Kusen + daun pintu P2", standard: "Tidak keropos, bisa terkunci" },
            { id: "E2", name: "Lampu Gudang", standard: "Hidup dan bersih" },
            { id: "E3", name: "Plafon Gudang", standard: "Tidak kusam, tidak berlubang" },
            { id: "E4", name: "Exhaust Fan", standard: "Tidak kotor, tidak mati" },
            { id: "E5", name: "Dinding Gudang", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E6", name: "Partisi ruang kepala toko (T120)", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E7", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "E8", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "E9", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "E10", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "E11", name: "Stop kontak", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "E12", name: "Lantai keramik Gudang + kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E13", name: "Rooster", standard: "Tidak pecah" },
            { id: "E14", name: "Glasblok", standard: "Tidak pecah, tidak kusam" },
            { id: "E15", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "F",
        title: "F. Mess / R. Kantor",
        items: [
            { id: "F1", name: "Kusen + Daun Pintu + Jendela", standard: "Tidak keropos, bisa terkunci" },
            { id: "F2", name: "Lampu Mess/R. Kantor", standard: "Hidup dan bersih" },
            { id: "F3", name: "Exhaust Fan Mess/R. Kantor", standard: "Tidak kotor, tidak mati" },
            { id: "F4", name: "Plafon Mess/R. Kantor", standard: "Tidak kusam, tidak berlubang" },
            { id: "F5", name: "Dinding Mess/R. Kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "F6", name: "Saklar Lampu Mess/R. Kantor", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "F7", name: "Stop Kontak Mess/R. Kantor", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "F8", name: "Lantai Keramik Mess/R. Kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "F9", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "G",
        title: "G. Ruang Atas / Lt. 2",
        items: [
            { id: "G1", name: "Trap Anak Tangga", standard: "Tidak retak/pecah, tidak patah" },
            { id: "G2", name: "Railing Tangga", standard: "Tidak retak/pecah, tidak patah" },
            { id: "G3", name: "Kusen + Daun Pintu + Jendela", standard: "Tidak keropos" },
            { id: "G4", name: "Lampu Ruang Atas/Lt. 2", standard: "Hidup dan bersih" },
            { id: "G5", name: "Exhaust Fan Ruang Atas/Lt. 2", standard: "Berfungsi dan bersih" },
            { id: "G6", name: "Plafon Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak berlubang" },
            { id: "G7", name: "Dinding Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "G8", name: "Saklar Lampu Ruang Atas/Lt. 2", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "G9", name: "Stop Kontak Ruang Atas/Lt. 2", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "G10", name: "Lantai Keramik Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "G11", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "H",
        title: "H. Bagian Atap",
        items: [
            { id: "H1", name: "Rangka Atap", standard: "Tidak keropos, tidak patah" },
            { id: "H2", name: "Talang", standard: "Tidak retak/pecah, tidak ada sampah" },
            { id: "H3", name: "Atap Asbes/Zingalum/Genteng", standard: "Tidak retak/pecah, tidak berlubang, tidak sobek" },
            { id: "H4", name: "Listplank", standard: "Tidak patah/lepas" },
            { id: "H5", name: "Roof Drain", standard: "Tidak tersumbat, tutup drain terpasang (jika ada)" },
            { id: "H6", name: "Pipa Instalasi Air Hujan", standard: "Tidak pecah/bocor, tidak tersumbat" },
        ],
    },
```

- [ ] **Step 5: Jalankan test, pastikan lolos**

Run: `npx tsx lib/checklist-standard.spec.ts`
Expected: `checklist standard tests passed`

- [ ] **Step 6: Pastikan katalog lain tidak berubah**

Run: `npx tsx lib/signage.spec.ts && npx tsx lib/photo-guides.spec.ts && npx tsx lib/report-preventive.spec.ts && npx tsc --noEmit`
Expected: ketiga spec mencetak pesan "passed"; `tsc` tanpa error di luar `.next/`.

Run: `git diff --stat lib/checklist-data.ts`
Expected: hanya `lib/checklist-data.ts`, sekitar 117 baris berubah (115 item + 2 baris field tipe).

- [ ] **Step 7: Commit**

Buat task note `docs/agent-notes/<YYYY-MM-DD-HHMM>-checklist-good-standard-data.md` dari `docs/agent-notes/TEMPLATE.md`, lalu:

```bash
git add lib/checklist-data.ts lib/checklist-standard.spec.ts docs/agent-notes/
git commit -m "feat(checklist): add FCKT good-condition standards for items A-H"
```

---

### Task 2: Tampilkan "Standar baik" di form checklist

**Files:**
- Modify: `app/reports/(bms)/create/components/checklist-step.tsx`

**Interfaces:**
- Consumes: `ChecklistCatalogItem.standard?: string` (Task 1). `ChecklistStep` merender item dari `category.items`, jadi `item.standard` sudah tersedia tanpa perubahan props.

- [ ] **Step 1: Render baris standar**

Di `app/reports/(bms)/create/components/checklist-step.tsx`, di kartu item biasa (bukan cabang `if (item.signage)` yang merender `SignageChecklistItem`), ganti:

```tsx
                                    <h4 className="text-base font-semibold">
                                      {item.name}
                                    </h4>
                                    {item.desc ? (
```

menjadi:

```tsx
                                    <h4 className="text-base font-semibold">
                                      {item.name}
                                    </h4>
                                    {item.standard ? (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">
                                          Standar baik:
                                        </span>{" "}
                                        {item.standard}
                                      </p>
                                    ) : null}
                                    {item.desc ? (
```

- [ ] **Step 2: Cek tipe & lint**

Run: `npx tsc --noEmit && npx eslint "app/reports/(bms)/create/components/checklist-step.tsx"`
Expected: `tsc` tanpa error di luar `.next/`; eslint tanpa temuan baru. Untuk membandingkan dengan temuan yang sudah ada sebelumnya, jalankan:
`git show HEAD:"app/reports/(bms)/create/components/checklist-step.tsx" | npx eslint --stdin --stdin-filename "app/reports/(bms)/create/components/checklist-step.tsx"`

- [ ] **Step 3: Verifikasi manual**

Dengan dev server lokal (`npm run dev`, port 3001; `.env.local` mengarahkan redirect ke localhost) dan login BMS di viewport 375px, buka Buat Laporan → pilih toko → langkah Checklist:
- Item A–H menampilkan "Standar baik: …" di bawah nama item, mis. A1 "Standar baik: Tidak berlubang, tidak bergelombang".
- Kategori I (termasuk I3 Panel Listrik dan kartu signage I11–I13) tidak menampilkan "Standar baik".
- Panel Listrik A18 menampilkan urutan: nama → "Standar baik: …" → link "Lihat contoh foto" → tombol kondisi.
- Teks tidak keluar kartu dan tombol Baik/Rusak/Tidak Ada tidak bergeser.

- [ ] **Step 4: Commit**

Buat task note `docs/agent-notes/<YYYY-MM-DD-HHMM>-checklist-good-standard-ui.md` dari template, lalu:

```bash
git add "app/reports/(bms)/create/components/checklist-step.tsx" docs/agent-notes/
git commit -m "feat(checklist): show good-condition standard under checklist items"
```
