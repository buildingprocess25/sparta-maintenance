# Design Contextual Checklist Labels

## Scope

Mendokumentasikan desain perbaikan teks submit, aktivitas, filter, dan
notifikasi checklist-only tanpa mengubah schema atau flow laporan.

## Context and Sources

- Screenshot halaman review submit dan dashboard BNM dari pengujian akun
  simulasi `HEAD OFFICE`.
- `prisma/schema.prisma` dan migration
  `20260812104702_add_pending_checklist_review_status`.
- `app/reports/(bms)/create/components/review-step.tsx`.
- `app/reports/actions/approve-estimation.ts`.
- `app/dashboard/queries.ts` dan formatter aktivitas dashboard.
- Database lokal: laporan uji terakhir tidak memiliki handler BMS, tetapi
  riwayat aktivitasnya mencatat `ESTIMATION_APPROVED`.

## Changed Files

- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`:
  desain yang disetujui untuk label kontekstual tanpa migration.
- `docs/agent-notes/2026-08-14-1138-design-contextual-checklist-labels.md`:
  catatan task desain.

## Decisions

- Mempertahankan enum dan transisi status yang ada.
- Menentukan jenis flow dari keberadaan handler BMS.
- Memformat aktivitas lama dan baru secara kontekstual tanpa backfill.
- Menggunakan label netral pada filter yang menaungi aktivitas checklist dan
  estimasi.

## Verification

- `PENDING_CHECKLIST_REVIEW` terverifikasi di schema, migration, database, dan
  jalur submit/approval.
- Transaksi uji terbaru terverifikasi mengikuti flow status yang benar, dengan
  ketidaksesuaian hanya pada `ActivityAction.ESTIMATION_APPROVED` dan copy UI.

## Remaining Work and Risks

Implementasi dan regression test belum dikerjakan; langkah berikutnya adalah
review design spec dan penulisan implementation plan.
