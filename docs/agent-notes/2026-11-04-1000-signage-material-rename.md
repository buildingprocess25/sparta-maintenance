# Rename material signage (Acrylic Flat / Acrylic Embos)

## Scope

Material I11–I13: `Acrylic` → `Acrylic Flat`, `Embos` → `Acrylic Embos`
(form, validasi server, PDF, detail laporan, export XLSX signage, Analisa
Kerusakan). Data JSONB lama tidak dimigrasi.

## Context and Sources

`lib/checklist-data.ts` (katalog material), `lib/signage.ts`
(`describeSignageCondition` dipakai PDF/detail/export), `lib/signage-export.ts`.

## Changed Files

- `lib/checklist-data.ts`: nama material baru.
- `lib/signage.ts`: `normalizeSignageMaterial` memetakan nama lama → baru;
  dipakai di `fromSignageJsonFields` (draft/revisi lolos validasi) dan
  `describeSignageCondition` (semua tampilan).
- `lib/signage-export.ts`: kolom material export memakai normalisasi.
- Spec terkait: nilai material diperbarui + tes nama lama.

## Decisions

Normalisasi saat baca, bukan migrasi DB: laporan/PDF lama tampil dengan
nama baru, draft lama otomatis tersimpan ulang dengan nama baru.
PDF snapshot yang sudah diarsip di Drive tetap memakai nama lama.

## Verification

`npx tsx` untuk signage, signage-export, types, report-json-helpers,
signage-checklist, draft-data spec: semua lolos. ESLint file berubah: OK.
`tsc --noEmit` kehabisan memori di mesin lokal (tidak terselesaikan).

## Remaining Work and Risks

None.
