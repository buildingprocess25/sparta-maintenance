# Signage catalog items I11-I13 and signage helper

## Scope

Menambah item preventif signage I11-I13 ke katalog checklist
(`lib/checklist-data.ts`) dan modul helper murni `lib/signage.ts` beserta
spec-nya. Tidak mengubah schema, migration, validasi server, UI form, atau PDF;
itu dikerjakan task berikutnya.

## Context and Sources

- `.superpowers/sdd/signage-task-1-brief.md` dan `signage-global-constraints.md`.
- `lib/checklist-data.ts`: kategori I (Preventif Equipment Toko).

## Changed Files

- `lib/checklist-data.ts`: tipe `SignageCondition`, `AhoTicketGroup`,
  `SignageConfig`, `ChecklistCatalogItem`; field `signageMaterial` dan
  `signageCondition` pada `ChecklistItem`; `ChecklistCategory.items` kini
  `ChecklistCatalogItem[]`; item I11-I13.
- `lib/signage.ts`: konstanta, label, dan helper konversi form/JSON serta
  label kondisi signage.
- `lib/signage.spec.ts`: spec untuk katalog, kondisi, konversi, dan label.

## Decisions

- Pudar dan Rusak dihitung `rusak`; Baik dan Kotor dihitung `baik`
  (sesuai aturan OK/NOT_OK di constraints).
- ID item lama tidak berubah.

## Verification

- `npx tsx lib/signage.spec.ts`: `signage tests passed`.
- `npx eslint` pada file yang diubah: bersih.
- `npx tsc --noEmit`: tidak ada error di file yang diubah. Error yang muncul
  hanya dari `.next/dev/types/routes.d.ts` (file generated, di luar scope).

## Remaining Work and Risks

- Verifikasi manual di browser ditunda ke controller.
- Task 2 dan seterusnya membangun di atas helper ini.
