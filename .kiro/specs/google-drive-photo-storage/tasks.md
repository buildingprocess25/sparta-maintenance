# Implementation Plan: Google Drive Photo Storage

## Overview

Implementasi ini menggantikan UploadThing sebagai backend penyimpanan foto utama dengan Google Drive CDN pada akun Google kedua yang terdedikasi. Pendekatan incremental: mulai dari fondasi (CDN client + URL discriminator), lanjut ke service layer dan API route, kemudian hook client-side, migrasi alur upload yang ada, schema DB, cron job cleanup, dan terakhir integrasi PDF generation.

UploadThing dipertahankan sebagai fallback untuk laporan lama — tidak ada penghapusan dependency UploadThing.

## Tasks

- [x] 1. Set up Drive CDN client and URL discriminator utilities
  - Buat `lib/google-drive/cdn-client.ts` — singleton Google Drive client untuk akun CDN kedua, menggunakan env vars `DRIVE_CDN_CLIENT_ID`, `DRIVE_CDN_CLIENT_SECRET`, `DRIVE_CDN_REFRESH_TOKEN`, `DRIVE_CDN_ROOT_FOLDER_ID`
  - Implementasikan `getDriveCdnClient()` yang throw error deskriptif jika salah satu dari keempat env var tidak ada, menyebutkan nama variabel yang hilang
  - Pastikan client hanya dapat diakses server-side (tidak di-export dari barrel client-side)
  - Buat `lib/storage/photo-url.ts` dengan konstanta `GOOGLE_DRIVE_CDN_PREFIX` dan fungsi pure `isGoogleDriveCdnUrl(url: string): boolean` serta `buildCdnUrl(fileId: string): string`
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

  - [ ]* 1.1 Write property test for CDN URL discriminator (P1)
    - **Property 1: CDN URL Discriminator — Round Trip**
    - Test bahwa setiap string yang diawali `GOOGLE_DRIVE_CDN_PREFIX` mengembalikan `true`, dan setiap string yang tidak diawali prefix tersebut mengembalikan `false`
    - Gunakan `fast-check` dengan `fc.string()` dan CDN URL variants, minimum 100 iterasi
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 1.2 Write unit tests for `getDriveCdnClient` env var validation
    - Test bahwa missing `DRIVE_CDN_CLIENT_ID` throw error dengan nama variabel yang benar
    - Test bahwa missing `DRIVE_CDN_CLIENT_SECRET`, `DRIVE_CDN_REFRESH_TOKEN`, `DRIVE_CDN_ROOT_FOLDER_ID` masing-masing throw error deskriptif
    - Test bahwa semua env var tersedia → client berhasil diinisialisasi
    - _Requirements: 1.2_

- [x] 2. Add `drivePhotoFileIds` field to Prisma schema and run migration
  - Tambahkan field `drivePhotoFileIds Json @default("[]")` pada model `Report` di `prisma/schema.prisma`
  - Buat dan jalankan migration SQL: `ALTER TABLE "Report" ADD COLUMN "drivePhotoFileIds" JSONB NOT NULL DEFAULT '[]'`
  - Verifikasi field `uploadthingFileKeys` tidak diubah
  - _Requirements: 3.2, 10.2_

- [x] 3. Implement Drive Photo Service
  - Buat `lib/storage/drive-photo-service.ts` dengan tipe `DrivePhotoUploadResult`, `DrivePhotoUploadFailure`, `DrivePhotoUploadOutcome`
  - Implementasikan `uploadPhotoToDriveCdn(blob: Blob | File, fileName: string): Promise<DrivePhotoUploadOutcome>` — upload ke Drive CDN, set permission `anyone/reader`, retry hingga 3x dengan exponential backoff (`[500, 1000, 2000]` ms), kembalikan `{ success: true, fileId, url }` atau `{ success: false, error }`
  - Implementasikan `deletePhotoFromDriveCdn(fileId: string): Promise<boolean>` — hapus file dari Drive CDN, return `true` sukses / `false` gagal (non-throwing)
  - Gunakan `getDriveCdnClient()` dari `lib/google-drive/cdn-client.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3_

  - [ ]* 3.1 Write property test for upload result shape (P2)
    - **Property 2: Upload Result Shape**
    - Mock Drive API; test bahwa setiap successful upload mengembalikan `url` yang match CDN URL pattern dan `fileId` non-empty string
    - Gunakan `fast-check` dengan arbitrary file names dan arbitrary fileIds, minimum 100 iterasi
    - **Validates: Requirements 2.1, 2.3**

  - [ ]* 3.2 Write unit tests for `uploadPhotoToDriveCdn` retry logic
    - Test bahwa setelah 3 kali gagal, fungsi mengembalikan `{ success: false }` tanpa fallback ke UploadThing
    - Test bahwa permission creation failure di-log sebagai warning tapi upload tetap dianggap sukses
    - _Requirements: 2.4_

- [x] 4. Implement Upload API route
  - Buat `app/api/photos/upload/route.ts` — Next.js API route `POST /api/photos/upload`
  - Implementasikan auth check: return HTTP 401 jika unauthenticated, HTTP 403 jika bukan BMS role
  - Implementasikan file validation: return HTTP 400 jika bukan image MIME type, HTTP 400 jika file > 4 MB sebelum kompresi
  - Implementasikan kompresi gambar ke maksimum 70 KB dan 1280px pada sisi terpanjang sebelum upload
  - Teruskan compressed blob ke `uploadPhotoToDriveCdn`, kembalikan `{ url: string; fileId: string }` pada sukses atau HTTP 500 pada gagal
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.1 Write property test for image compression constraints (P9)
    - **Property 9: Image Compression Constraints**
    - Test bahwa output kompresi untuk arbitrary input image menghasilkan file size ≤ 70 KB DAN longest dimension ≤ 1280 pixels
    - Gunakan `fast-check` dengan arbitrary image sizes dan formats, minimum 100 iterasi
    - **Validates: Requirements 8.4**

  - [ ]* 4.2 Write unit tests for Upload API route auth and validation
    - Test HTTP 401 untuk unauthenticated request
    - Test HTTP 403 untuk user tanpa BMS role
    - Test HTTP 400 untuk non-image MIME type
    - Test HTTP 400 untuk file > 4 MB
    - Test successful upload flow mengembalikan `{ url, fileId }`
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

- [x] 5. Checkpoint — Ensure all tests pass
  - Pastikan semua unit test dan property test untuk task 1–4 lulus. Tanyakan ke user jika ada pertanyaan sebelum melanjutkan.

- [x] 6. Implement `usePhotoUpload` client hook
  - Buat `lib/hooks/use-photo-upload.ts` — React hook yang mengekspos `uploadPhoto(file: File): Promise<PhotoUploadResult | null>` dan `isUploading: boolean`
  - Hook memanggil `POST /api/photos/upload` via `fetch` dengan `multipart/form-data`
  - Pada sukses, kembalikan `{ url, fileId }`; pada gagal, kembalikan `null` dan log error ke console
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 6.1 Write unit tests for `usePhotoUpload` hook
    - Test bahwa sukses upload mengembalikan `{ url, fileId }`
    - Test bahwa gagal upload mengembalikan `null` dan log error
    - Test `isUploading` state transitions (false → true → false)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 7. Migrate existing photo upload flows to use `usePhotoUpload`
  - Identifikasi semua pemanggilan `compressAndUploadToUT` di alur checklist photo, start-work selfie, start-work receipt, dan completion photo
  - Ganti setiap pemanggilan `compressAndUploadToUT` dengan `uploadPhoto` dari `usePhotoUpload` hook
  - Pastikan `fileId` yang dikembalikan disimpan bersama URL pada state komponen yang relevan
  - Verifikasi tidak ada pemanggilan `compressAndUploadToUT` yang tersisa di alur foto BMS
  - _Requirements: 9.4_

- [x] 8. Persist `drivePhotoFileIds` on successful photo upload
  - Update Upload API route (`app/api/photos/upload/route.ts`) untuk menerima `reportNumber` dari request body
  - Setelah upload Drive CDN sukses, append `fileId` ke `drivePhotoFileIds` array pada `Report` yang sesuai menggunakan Prisma
  - Pastikan append bersifat atomic (gunakan Prisma JSON update yang aman terhadap concurrent writes)
  - _Requirements: 3.1_

  - [ ]* 8.1 Write property test for Drive file ID persistence — append (P3)
    - **Property 3: Drive File ID Persistence — Append**
    - Mock DB; test bahwa untuk report dengan initial `drivePhotoFileIds` array panjang N, setelah upload sukses array memiliki panjang N+1 dan mengandung `fileId` baru
    - Gunakan `fast-check` dengan arbitrary initial arrays dan arbitrary fileIds, minimum 100 iterasi
    - **Validates: Requirements 3.1**

- [x] 9. Implement cron job cleanup script
  - Buat `scripts/cleanup-approved-pjum-photos.ts` sebagai pengganti `scripts/archive-approved-pjum-photos.ts`
  - Implementasikan query eligibility: report dengan `status = COMPLETED` DAN `reportNumber` ada di `PjumExport` dengan `status = APPROVED` dan `approvedAt IS NOT NULL` — referensi logika dari script lama
  - Untuk setiap eligible report: hapus semua file ID di `drivePhotoFileIds` langsung dari Drive CDN menggunakan `deletePhotoFromDriveCdn` (tidak ada move/archive); jika semua berhasil, clear `drivePhotoFileIds = []` di DB
  - Jika delete satu file ID gagal: log failure dengan fileId dan reportNumber, lanjutkan ke file berikutnya; JANGAN clear `drivePhotoFileIds` untuk report tersebut
  - Implementasikan UploadThing legacy cleanup untuk eligible reports menggunakan logika dari `scripts/archive-approved-pjum-photos.ts` (delete UT files + clear `uploadthingFileKeys`)
  - Implementasikan flag `--dry-run` yang log planned deletions tanpa melakukan delete atau DB update
  - Output summary: total reports processed, total Drive files deleted, total Drive deletion failures, total UploadThing keys processed
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 9.1 Write property test for cron job eligibility filter (P5)
    - **Property 5: Cron Job Eligibility Filter**
    - Test bahwa untuk arbitrary set of reports dengan berbagai status dan PJUM associations, eligibility query hanya mengembalikan reports dengan `status = COMPLETED` DAN ada di `PjumExport` dengan `status = APPROVED` dan `approvedAt IS NOT NULL`
    - Gunakan `fast-check` dengan arbitrary combinations of status + PJUM associations, minimum 100 iterasi
    - **Validates: Requirements 7.1**

  - [ ]* 9.2 Write property test for cron job dry run idempotence (P6)
    - **Property 6: Cron Job Dry Run Idempotence**
    - Mock Drive + DB; test bahwa `--dry-run` tidak memodifikasi `drivePhotoFileIds`, `uploadthingFileKeys`, atau field DB lainnya, dan tidak melakukan delete call ke Drive CDN atau UploadThing
    - Gunakan `fast-check` dengan arbitrary eligible report sets, minimum 100 iterasi
    - **Validates: Requirements 7.6**

  - [ ]* 9.3 Write property test for cron job summary completeness (P7)
    - **Property 7: Cron Job Summary Completeness**
    - Mock Drive + DB; test bahwa output summary selalu mengandung semua required fields: total reports processed, total Drive files deleted (atau planned), total Drive deletion failures, dan total UploadThing keys processed
    - Gunakan `fast-check` dengan arbitrary run scenarios, minimum 100 iterasi
    - **Validates: Requirements 7.7**

  - [ ]* 9.4 Write unit tests for cron job Drive deletion failure handling
    - Test bahwa jika satu file ID gagal dihapus, `drivePhotoFileIds` tidak di-clear untuk report tersebut
    - Test bahwa jika semua file ID berhasil dihapus, `drivePhotoFileIds` di-clear ke `[]`
    - Test bahwa failure satu report tidak menghentikan pemrosesan report berikutnya
    - _Requirements: 7.3, 7.4_

- [x] 10. Remove `drivePhotoFileIds` on Drive file deletion (cron job path)
  - Pastikan `deletePhotoFromDriveCdn` di `drive-photo-service.ts` sudah digunakan oleh cron job
  - Verifikasi bahwa setelah delete berhasil, `drivePhotoFileIds` di-update di DB (hapus fileId yang sudah dihapus)
  - _Requirements: 3.3_

  - [ ]* 10.1 Write property test for Drive file ID persistence — remove (P4)
    - **Property 4: Drive File ID Persistence — Remove**
    - Mock DB; test bahwa untuk report dengan `drivePhotoFileIds` yang mengandung `fileId` tertentu, setelah file dihapus dari Drive CDN array tidak lagi mengandung `fileId` tersebut
    - Gunakan `fast-check` dengan arbitrary arrays yang mengandung target fileId, minimum 100 iterasi
    - **Validates: Requirements 3.3**

- [x] 11. Checkpoint — Ensure all tests pass
  - Pastikan semua unit test dan property test untuk task 6–10 lulus. Tanyakan ke user jika ada pertanyaan sebelum melanjutkan.

- [x] 12. Update report detail views for CDN/legacy URL resolution
  - Identifikasi semua komponen yang merender foto laporan (checklist item photos, start-work selfie, start-work receipt, completion additional photos)
  - Gunakan `isGoogleDriveCdnUrl` untuk routing: CDN URL → gunakan langsung sebagai `src`; Legacy URL → gunakan UploadThing URL path yang sudah ada
  - Pastikan logika resolusi URL yang sama diterapkan konsisten di semua view
  - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 12.1 Write unit tests for URL resolution routing in report detail
    - Test bahwa CDN URL di-render langsung sebagai `src`
    - Test bahwa Legacy URL di-route ke UploadThing path
    - Test semua kategori foto (checklist, startwork, completion) menggunakan logika yang sama
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 13. Update PDF generation for CDN/legacy URL resolution
  - Identifikasi semua tempat di PDF generator yang fetch foto untuk di-embed
  - Gunakan `isGoogleDriveCdnUrl` untuk routing: CDN URL → fetch langsung dari CDN URL; Legacy URL → fetch dari UploadThing URL
  - Implementasikan error handling: jika fetch mengembalikan non-2xx, skip foto tersebut, log failure dengan URL dan reportNumber, lanjutkan generate PDF
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 13.1 Write unit tests for PDF photo fetch error handling
    - Test bahwa non-2xx response menyebabkan foto di-skip dan PDF tetap di-generate
    - Test bahwa failure di-log dengan URL dan reportNumber
    - Test bahwa CDN URL dan Legacy URL keduanya di-fetch dengan benar
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 14. Wire up GitHub Actions cron job trigger
  - Buat atau update `app/api/cron/cleanup-approved-photos/route.ts` — Next.js API route yang dipanggil oleh GitHub Actions untuk menjalankan cleanup script
  - Pastikan route hanya dapat dipanggil dengan credentials yang valid (secret header atau token)
  - Update GitHub Actions workflow file untuk memanggil route ini sesuai jadwal
  - _Requirements: 7.1, 7.2_

- [x] 15. Verify backward compatibility — UploadThing retained for legacy
  - Verifikasi `/api/uploadthing` route dan file router configuration tidak diubah atau dinonaktifkan
  - Verifikasi tidak ada nilai `uploadthingFileKeys` yang diubah pada existing `Report` records
  - Verifikasi bahwa Legacy Photo URL yang ditemui di report detail, PDF generation, dan cron job tetap resolve dan digunakan via UploadThing path tanpa error
  - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 15.1 Write property test for legacy URL backward compatibility (P8)
    - **Property 8: Legacy URL Backward Compatibility**
    - Test bahwa untuk arbitrary URL yang tidak match CDN URL pattern (`isGoogleDriveCdnUrl(url) === false`), URL resolution path me-route ke UploadThing fallback tanpa error
    - Gunakan `fast-check` dengan arbitrary non-CDN URLs, minimum 100 iterasi
    - **Validates: Requirements 4.2, 10.3**

- [x] 16. Final checkpoint — Ensure all tests pass
  - Pastikan semua unit test, property test, dan integration test lulus. Verifikasi tidak ada pemanggilan `compressAndUploadToUT` yang tersisa. Tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- UploadThing dependency TIDAK dihapus — tetap sebagai fallback untuk laporan lama
- Cron job menghapus foto Drive secara langsung (deleted outright), tidak ada proses move/archive
- Script lama `scripts/archive-approved-pjum-photos.ts` digunakan sebagai referensi logika eligibility query dan UT legacy cleanup
- Property tests menggunakan `fast-check` (TypeScript PBT library), minimum 100 iterasi per property
- Checkpoints memastikan validasi incremental sebelum melanjutkan ke fase berikutnya
