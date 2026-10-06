# Fix Ekspor XLSX Laporan Maintenance

## Scope
Memperbaiki 4 bug pada fitur ekspor XLSX di /dashboard/reports:
1. Dropdown cabang kosong di popup filter ekspor (ADMIN).
2. Crash/OOM karena Raw SQL dengan 38.000+ bind parameter (Prisma.join).
3. Kolom "Timestamp Pekerjaan Disetujui BMC" kosong untuk laporan fast-track (preventif/rekanan bypass).
Di luar scope: mengubah skema DB, mengubah flow penyimpanan di approve-estimation.ts.

## Context and Sources
- Analisis celah bug: sesi brainstorming 2026-10-06.
- `app/dashboard/reports/page.tsx` — branches prop dikirim [] ke dialog untuk ADMIN.
- `app/admin/export/queries.ts` — Raw SQL dengan Prisma.join(38.000+ items) menyebabkan crash.
- `lib/report-preventive.ts` — isRecordedPreventiveReport() tersedia untuk cek di JavaScript.
- Schema: ActivityLog hanya menyimpan ESTIMATION_APPROVED (bukan WORK_APPROVED) untuk fast-track.

## Changed Files
- `app/dashboard/reports/page.tsx`: tambah fetchAllBranchNames(), teruskan ke ExportReportsDialog.
- `app/admin/export/queries.ts`: hapus Raw SQL preventif, cek di JS via isRecordedPreventiveReport, tambah fallback workApprovedAt ke ESTIMATION_APPROVED.

## Decisions
- Pengecekan preventif dipindah dari SQL (JSONB) ke JavaScript — hindari batas parameter PostgreSQL.
- Fallback timestamp BMC menggunakan ESTIMATION_APPROVED (tidak menyimpan log baru ke DB, tidak ada migrasi).
- TIDAK membatasi filter tanggal — user tetap bisa ekspor YTD tanpa batasan.

## Verification
- `npx tsc --noEmit` → exit 0.
- Ekspor tanpa filter → file XLSX berhasil diunduh, kolom Jenis Laporan terisi.
- Ekspor dengan filter cabang → data sesuai cabang yang dipilih.
- Laporan preventif di XLSX → kolom "Timestamp Pekerjaan Disetujui BMC" tidak kosong.

## Remaining Work and Risks
- Performa ekspor data YTD (38.000+ baris) masih bisa lambat karena XLSX.write sinkron — belum di-tackle.
- Laporan historis yang sudah pernah diekspor tidak berubah (fix ini hanya berlaku untuk ekspor baru).
