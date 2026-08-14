# Fix stale checklist handler copy

## Scope

Memperbaiki petunjuk `Setelah Submit` dan klasifikasi checklist-only ketika
item yang sudah bukan rusak masih membawa nilai handler BMS lama. Tidak ada
perubahan schema, migration, transisi status, atau data database.

## Context and Sources

- Hasil manual testing akun simulasi HEAD OFFICE pada halaman review laporan.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `app/reports/(bms)/create/hooks/use-checklist.ts` dan `draft-data.ts`.
- `app/reports/(bms)/create/components/review-step-copy.ts`.
- `lib/report-utils.ts`.

## Changed Files

- `app/reports/(bms)/create/hooks/use-checklist.ts`: membersihkan handler saat
  kondisi item bukan rusak.
- `app/reports/(bms)/create/hooks/draft-data.ts`: tidak menyimpan handler untuk
  item yang bukan rusak.
- `app/reports/(bms)/create/components/review-step-copy.ts`: memilih flow BMS
  hanya dari item rusak yang ditangani BMS.
- `lib/report-utils.ts`: membuat klasifikasi persisted report condition-aware.
- Spesifikasi dan regression specs terkait diperbarui.

## Decisions

Handler hanya relevan bagi item `rusak` / `NOT_OK`. Nilai handler pada item
lain dianggap state lama yang tidak boleh mengubah copy, payload, label
aktivitas, maupun notifikasi.

## Verification

- RED terkonfirmasi pada copy review, serialisasi handler, dan helper domain.
- GREEN: `review-step-copy.spec.ts`, `draft-data.spec.ts`, dan
  `report-utils.spec.ts` lulus.
- ESLint terfokus pada tujuh file source/spec selesai tanpa error.
- TypeScript `--noEmit --incremental false` dengan heap 4 GB lulus.

## Remaining Work and Risks

Pengguna perlu mengulang manual test HEAD OFFICE pada laporan yang sebelumnya
memicu copy estimasi untuk memastikan browser memuat bundle terbaru.
