# Laporan Lengkap PDF dengan Foto Checklist

## Scope

Menambahkan fitur untuk meng-generate "Laporan Lengkap PDF" yang berisi dokumen laporan final + halaman tambahan berisi foto-foto dokumentasi dari setiap item checklist. PDF ini digenerate on-demand pertama kali lalu disimpan ke Google Drive, dan URL-nya di-cache di database agar tidak perlu meng-generate ulang.

Di luar scope: Modifikasi terhadap format Laporan Final PDF existing (laporan standar tetap tidak berubah).

## Context and Sources

- Diskusi dengan user mengenai kebutuhan laporan maintenance yang menyertakan foto dokumentasi setiap item (max 3 halaman foto, 4-6 foto per baris).
- Requirement: File PDF full harus di-cache ke Drive (mirip dengan laporan PDF final standar).
- File: `lib/pdf/generate-report-pdf.ts`, `lib/pdf/report-snapshots.ts`, `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`

## Changed Files

- `prisma/schema.prisma`: Menambah field `fullPdfDriveUrl` di model `Report`.
- `lib/pdf/generate-report-pdf.ts`: Menambah fungsi `generateReportPdfFull()` dan `buildChecklistPhotoPages()` dengan style `docPhotoPageStyles`.
- `lib/pdf/report-pdf-full-builder.ts`: File baru untuk menyiapkan data `ReportPdfData` + ekstrak `ChecklistItemWithPhotos`.
- `lib/pdf/report-snapshots.ts`: Menambah `generateAndSaveFullReportSnapshot()` dan `resolveFullReportSnapshotUrl()`.
- `app/api/reports/[reportNumber]/pdf-full/route.ts`: Endpoint GET baru untuk trigger/serve PDF lengkap.
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`: Memasukkan `fullPdfDriveUrl` ke tipe data detail laporan.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`: Menambahkan tombol "Laporan Lengkap PDF" ke UI.
- `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`: Menambah icon `Images` dan styling warna teal/green untuk membedakan tombol PDF lengkap.

## Decisions

1. **PDF Caching**: Seperti Laporan Final, Laporan Lengkap ini di-upload ke Google Drive dan URL-nya disimpan di field DB baru (`fullPdfDriveUrl`) agar mempercepat akses ke depannya dan mengurangi beban server.
2. **Layout Foto**: Foto diatur dalam grid 5 kolom per baris agar muat banyak di 1 halaman. Limit dipasang maksimal 3 halaman tambahan.
3. **Re-use Logic**: `generateReportPdfFull` menggunakan ulang logic `buildReportDocument` untuk 2 halaman utama dan merangkai halaman foto di belakangnya, sehingga mengurangi duplikasi kode layout.

## Verification

- `npm run build`: Ditunda berdasarkan permintaan user.
- Migrasi DB: Prisma client sudah digenerate. Perlu jalankan `npx prisma migrate dev` secara manual oleh user.

## Remaining Work and Risks

- User **HARUS** menjalankan `npx prisma migrate dev --name add-full-pdf-drive-url` karena perintah `npx prisma db push` / `migrate dev` diblokir oleh environment.
- Tidak ada validasi end-to-end (karena build di-skip).