# API Endpoints Terkait PDF

Dokumen ini merangkum seluruh endpoint API pada project yang berhubungan dengan PDF, baik yang:

- menghasilkan stream PDF langsung, maupun
- terkait alur arsip PDF (redirect ke folder Google Drive arsip PDF).

## Ringkasan Cepat

### Endpoint yang Menghasilkan PDF Langsung

1. `GET /api/reports/[reportNumber]/pdf`
2. `GET /api/reports/pjum-pdf`
3. `GET /api/reports/preview-pdf` (non-production only)
4. `GET /api/preview-pjum` (non-production only)

### Endpoint Terkait Arsip PDF (Tidak stream PDF langsung)

1. `GET /api/drive/report-archive`
2. `GET /api/drive/pjum-archive`

## Detail Endpoint

## 1) GET /api/reports/[reportNumber]/pdf

- File route: `app/api/reports/[reportNumber]/pdf/route.ts`
- Tujuan: Generate PDF laporan maintenance berdasarkan `reportNumber`.
- Output: Binary PDF (`Content-Type: application/pdf`) dengan `Content-Disposition: inline; filename="{reportNumber}.pdf"`.
- Caching: `Cache-Control: private, max-age=3600, immutable`.

### Otorisasi Report PDF

- Wajib login (`getAuthUser`).
- Aturan akses:
- `BMS`: hanya report miliknya sendiri.
- `BMC`: hanya report di branch yang ada di `branchNames` user.
- `BNM_MANAGER`: hanya report status `COMPLETED` dan branch sesuai `branchNames`.
- `ADMIN`: akses penuh.

### Error utama Report PDF

- `401 Unauthorized` jika belum login.
- `404 Report not found` jika report tidak ada.
- `403 Forbidden` jika role tidak berhak akses report.
- `500 Failed to generate PDF` jika proses generate gagal.

### Dependensi PDF Report

- Generator: `generateReportPdf` dari `lib/pdf/generate-report-pdf.ts`.
- Data sumber: Prisma (`report`, `createdBy`, `store`, `activities`) + parsing field JSON/JSONB.
- Asset logo dari `public/assets` dibaca saat module init.

## 2) GET /api/reports/pjum-pdf

- File route: `app/api/reports/pjum-pdf/route.ts`
- Tujuan: Generate satu paket PDF PJUM dari kumpulan report.
- Output: Binary PDF (`Content-Type: application/pdf`) dengan `Content-Disposition: inline; filename="{fileName}"`.
- Caching: `Cache-Control: no-store`.

### Otorisasi PJUM PDF

- Wajib login dan role harus `BMC` atau `BNM_MANAGER`.
- Jika tidak, return `403 Forbidden`.

### Query parameter

- `ids` (wajib): daftar reportNumber dipisah koma.
- `bmsNIK` (opsional): NIK BMS.
- `from` (opsional): tanggal awal/filter.
- `to` (opsional): tanggal akhir/filter.
- `week` (wajib valid): integer 1..5.

### Validasi penting

- `ids` tidak boleh kosong.
- `week` harus integer rentang 1 sampai 5.

### Error utama PJUM PDF

- `400 Missing ids parameter` jika `ids` tidak ada.
- `400 No report IDs provided` jika hasil parsing kosong.
- `400 Minggu ke harus di antara 1 sampai 5` jika `week` invalid.
- `500 Failed to generate PJUM PDF` jika generate gagal.

### Dependensi PDF PJUM

- Generator: `generatePjumPackagePdf` dari `lib/pdf/generate-pjum-package-pdf.ts`.

## 3) GET /api/reports/preview-pdf

- File route: `app/api/reports/preview-pdf/route.ts`
- Tujuan: Preview layout PDF report menggunakan mock data.
- Output: Binary PDF (`Content-Type: application/pdf`) dengan filename `preview_report.pdf`.

### Environment gate Preview Report

- Di `production` endpoint dinonaktifkan (`404 Not Found`).
- Hanya aktif untuk development/non-production.

### Dependensi Preview Report

- Generator: `generateReportPdf` dari `lib/pdf/generate-report-pdf.ts`.

## 4) GET /api/preview-pjum

- File route: `app/api/preview-pjum/route.ts`
- Tujuan: Preview layout PDF form PJUM/PUM dengan mock data.
- Output: Binary PDF (`Content-Type: application/pdf`) dengan filename `preview-pjum-form.pdf`.

### Environment gate Preview PJUM

- Di `production` endpoint dinonaktifkan (`404 Not Found`).
- Hanya aktif untuk development/non-production.

### Dependensi Preview PJUM

- Generator: `generatePjumFormPdf` dari `lib/pdf/generate-pjum-form-pdf.ts`.

## Endpoint Arsip Terkait PDF (Tidak Return PDF Langsung)

## 5) GET /api/drive/report-archive

- File route: `app/api/drive/report-archive/route.ts`
- Tujuan: Redirect user `BMC` ke folder Google Drive arsip report (folder PDF report branch).
- Response: HTTP redirect ke URL folder Drive.

### Otorisasi Report Archive

- Wajib role `BMC` (`requireRole("BMC")`).

### Dependensi Report Archive

- `ensureBmcReportArchiveFolder` + `buildDriveFolderUrl` dari `lib/google-drive/archive.ts`.

## 6) GET /api/drive/pjum-archive

- File route: `app/api/drive/pjum-archive/route.ts`
- Tujuan: Redirect user `BMC` ke folder Google Drive arsip PJUM (folder PDF PJUM branch).
- Response: HTTP redirect ke URL folder Drive.

### Otorisasi PJUM Archive

- Wajib role `BMC` (`requireRole("BMC")`).

### Dependensi PJUM Archive

- `ensureBmcPjumArchiveFolder` + `buildDriveFolderUrl` dari `lib/google-drive/archive.ts`.

## Catatan Alur (Di Luar API Route, tapi terkait PDF)

- `app/reports/actions/approve-final.ts` menyiapkan snapshot PDF status `COMPLETED` di Supabase.
- `app/reports/pjum/approval-actions.ts` memanggil `generatePjumPackagePdf` dan mengarsipkan PDF final PJUM serta PDF final report ke Google Drive.
- Keduanya bukan endpoint `/api/...`, namun bagian penting alur bisnis PDF.

## Kesimpulan

Endpoint API yang benar-benar mengembalikan file PDF ada 4, dan endpoint API yang terkait arsip PDF (redirect folder) ada 2. Total endpoint API terkait PDF pada codebase saat ini: **6 endpoint**.
