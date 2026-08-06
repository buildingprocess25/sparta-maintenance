# Task: Draft CreatedAt Timestamp Fix

## Tanggal
2026-08-06 (Asia/Jakarta)

## Masalah
Kolom "Tanggal Dibuat" di export XLSX bernilai sama dengan "Timestamp Laporan Diajukan" karena `Report.createdAt` diisi server saat submit, bukan saat BMS pertama membuka form. Atasan tidak bisa melihat durasi kerja BMS dari export tersebut.

## Solusi
Pendekatan: client-side timestamp injector (tanpa schema migration).

- Tambah `draftCreatedAt?: string` ke `DraftData` type dan Zod schema (`types.ts`).
- `useDraft` hook menyimpan `draftCreatedAt` ke localStorage hanya sekali via `getOrSetDraftCreatedAt()` — autosave berikutnya membaca nilai yang sudah ada.
- `buildDraftData()` menyertakan `draftCreatedAt` di payload submit.
- `submitReport` Server Action membaca `data.draftCreatedAt`, parse ke `Date`, dan men-set `Report.createdAt` jika valid; fallback ke server time (default Prisma) jika tidak.

## File yang Diubah
- `app/reports/actions/types.ts`
- `app/reports/(bms)/create/hooks/use-draft.ts`
- `app/reports/actions/submit.ts`

## Keterbatasan
`draftCreatedAt` berasal dari browser (jam HP BMS), bukan server. Untuk kebutuhan laporan operasional ini masih cukup. Tidak ada validasi ketat di backend.
