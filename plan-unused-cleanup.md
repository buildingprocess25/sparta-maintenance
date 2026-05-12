# Plan Cleanup Fitur Tidak Dipakai (2026-05-12)

## Scope

- Status DRAFT pada Report
- Snapshot PDF di Google Drive selain completedPdfPath
- uploadthingFileKeys dan dependensi UploadThing
- PUM fields pada PjumExport
- Model PjumBankAccount

## Audit ringkas (referensi kode yang masih aktif)

- DRAFT masih dipakai di server actions dan query filter: [app/reports/actions/draft.ts](app/reports/actions/draft.ts), [app/reports/actions/queries.ts](app/reports/actions/queries.ts)
- Snapshot PDF non-completed masih direferensikan di snapshot helper dan approval PJUM: [lib/pdf/report-snapshots.ts](lib/pdf/report-snapshots.ts), [app/reports/pjum/approval-actions.ts](app/reports/pjum/approval-actions.ts)
- uploadthingFileKeys masih dipakai pada start-work, submit-completion, dan cleanup job: [app/reports/actions/start-work-with-photos.ts](app/reports/actions/start-work-with-photos.ts), [app/reports/actions/submit-completion-work.ts](app/reports/actions/submit-completion-work.ts), [lib/jobs/cleanup-pending-reports.ts](lib/jobs/cleanup-pending-reports.ts)
- PUM fields masih di-parse dan ditulis saat approve PJUM, serta digunakan di PDF generator: [app/reports/pjum/approval-actions.ts](app/reports/pjum/approval-actions.ts), [lib/pdf/generate-pjum-form-pdf.ts](lib/pdf/generate-pjum-form-pdf.ts)
- PjumBankAccount masih di-query dan di-upsert pada approval PJUM: [app/reports/pjum/approval-actions.ts](app/reports/pjum/approval-actions.ts)

## Plan

### 1) Validasi data produksi (read-only)

- Cek apakah ada Report berstatus DRAFT di DB.
- Cek apakah pendingEstimationPdfPath, estimationApprovedPdfPath, approvedBmcPdfPath masih terisi.
- Cek apakah uploadthingFileKeys masih berisi data.
- Cek apakah PUM fields di PjumExport masih terisi.
- Cek apakah tabel PjumBankAccount masih memiliki row.

### 2) Hapus alur DRAFT di server

- Hapus penggunaan DRAFT dari query BMS dan server action draft.
- Hapus logic getDraft dan endpoint terkait bila tidak lagi dibutuhkan.
- Update UI agar tidak menampilkan status DRAFT dari DB.

### 3) Simplifikasi snapshot PDF

- Hapus pendingEstimationPdfPath, estimationApprovedPdfPath, approvedBmcPdfPath dari flow snapshot dan approval.
- Pastikan hanya completedPdfPath yang dipakai untuk link PDF.

### 4) Hapus legacy UploadThing

- Hapus penggunaan uploadthingFileKeys dari start-work, submit-completion, dan cleanup job.
- Hapus route dan helper UploadThing jika sudah tidak dipakai sama sekali.

### 5) Hapus PUM fields dan PjumBankAccount

- Hapus input, validation, dan update PUM fields pada approval PJUM.
- Hapus PjumBankAccount query/upsert dan semua dependensinya.

### 6) Update schema dan migrasi

- Drop kolom yang sudah tidak dipakai pada Report dan PjumExport.
- Drop model PjumBankAccount jika benar-benar tidak dipakai.
- Gunakan prisma migrate (bukan db:push). Pastikan backup dan persetujuan eksplisit sebelum migrasi destructive.

### 7) Update dokumentasi dan uji

- Update AI_CONTEXT dan docs terkait agar konsisten.
- Jalankan smoke test alur laporan dan approval PJUM.

## Risiko dan catatan

- Menghapus enum value DRAFT dari Postgres butuh migrasi khusus. Jika tidak wajib, bisa dibiarkan tapi tidak digunakan.
- Semua penghapusan schema bersifat destructive. Perlu persetujuan eksplisit dan rencana backup/restore.
