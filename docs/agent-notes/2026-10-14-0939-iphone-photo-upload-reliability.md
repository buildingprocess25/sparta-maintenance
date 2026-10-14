# iPhone photo upload reliability

## Scope

Usulan 1–4 untuk keluhan upload foto BMS pengguna iPhone di alur Mulai
Pekerjaan dan Penyelesaian: penyebab error asli di toast, retry otomatis,
materialisasi file IndexedDB sebelum upload, dan upload eager saat foto
diambil dengan IndexedDB sebagai antrean cadangan. Di luar scope: bug
camera-modal, race di form create, pembersihan file Drive yatim.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-10-14-iphone-photo-upload-reliability.md`
- Screenshot user: toast "Gagal mengunggah foto sesudah untuk item ..." saat submit Penyelesaian.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, `lib/hooks/use-photo-upload.ts`, `app/api/photos/upload/handler.ts`.

## Changed Files

- `lib/photo-upload/upload-failure.ts`: tipe outcome/failure, aturan retry, teks error.
- `lib/photo-upload/upload-photo-request.ts`: request upload dengan retry + backoff.
- `lib/hooks/use-photo-upload.ts`: memakai `uploadPhotoRequest` dan mengembalikan outcome bertipe.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, `app/reports/[reportNumber]/start/start-work-client.tsx`: toast error submit kini memuat penyebab asli lewat `describePhotoUploadFailure`.
- `lib/photo-upload/materialize-photo.ts`: baca foto lokal ke memori sebelum upload, fallback ke blob URL preview.
- `lib/photo-upload/eager-upload-registry.ts`: registry status upload eager per foto + store localStorage.
- `lib/hooks/use-eager-photo-uploads.ts`, `components/photo-upload-status.tsx`: hook registry + overlay status per foto (spinner/centang/Ulangi).
- Kedua PhotoStrip (Penyelesaian dan Mulai Pekerjaan) merender `PhotoUploadStatusOverlay`.
- Alur Penyelesaian (`use-completion-work-form.ts`, `hooks/use-completion-autosave.ts`, `completion-client.tsx`): upload eager saat capture (hasil, dokumentasi tambahan, selfie/nota revisi); submit memakai `ensureUploaded`; `addPhoto` toleran IndexedDB gagal; restore memakai URL ter-upload sebagai cadangan.
- Alur Mulai Pekerjaan (`start-work-client.tsx`, `use-start-work-autosave.ts`): upload eager selfie/nota; foto toko material tetap di-upload saat submit; `file` di `StartWorkLocalPhoto` opsional; `addPhoto` toleran IndexedDB gagal.
- `lib/photo-upload/compress-photo.ts`: kompresi foto galeri tanpa web worker; dipakai di Mulai Pekerjaan (foto toko material) dan galeri revisi Penyelesaian (sebelumnya tidak dikompres).
- `docs/project/04-workflows.md`, `docs/project/09-testing-and-verification.md`: dokumentasi perilaku upload foto baru dan command spec.
- `lib/hooks/use-photo-upload.ts` dihapus (tidak ada caller lagi; hook `app/reports/(bms)/create/hooks/use-photo-upload.ts` berbeda dan tidak diubah).

## Decisions

- Retry untuk error jaringan dan HTTP 408/429/500/502/504; 503 tidak di-retry karena dipakai mode maintenance.
- Materialisasi dilakukan sebelum upload agar Blob IndexedDB yang tidak terbaca di WebKit muncul sebagai error "local-file" yang jelas, dan agar foto yang belum reload bisa diambil dari blob URL preview.
- Status upload eager disimpan di key localStorage terpisah (`sparta-eager-uploads-<reportNumber>`) agar versi draft lama tidak perlu dimigrasi.

## Verification

- `npx tsx lib/photo-upload/upload-failure.spec.ts` — pass.
- `npx tsx lib/photo-upload/upload-photo-request.spec.ts` — pass.
- `npx tsx lib/hooks/use-photo-upload.spec.ts` — pass.
- `npx tsx lib/photo-upload/materialize-photo.spec.ts` — pass.
- `npx tsx lib/photo-upload/eager-upload-registry.spec.ts` — pass.
- `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts` — pass (termasuk assertion wiring Penyelesaian).
- `npx tsx lib/photo-upload/compress-photo.spec.ts` — pass.
- Uji manual browser untuk alur Penyelesaian, Mulai Pekerjaan, dan kompresi galeri (plan Task 6–8 Step 7) belum dijalankan agent: butuh login BMS dan akan mengunggah foto sungguhan ke Drive.
- `npx tsx app/api/photos/upload/route.spec.ts` — pass (kontrak server tidak berubah).
- `npx tsc --noEmit` butuh `NODE_OPTIONS=--max-old-space-size=6144` (default heap habis); bersih untuk semua file proyek.
- `npx eslint` pada 20 file yang diubah: 0 error; 1 warning lama (`storeGalleryInputRef` tidak dipakai di `start-work-client.tsx`, sudah ada sebelum perubahan). `npm run lint` seluruh proyek masih melaporkan 97 error lama di file lain.
- `npm run build:memory` — sukses. Build pertama gagal karena file generate lama `.next/dev/types/validator.ts` merujuk route `app/api/fix-pdf` yang tidak ada di repo; folder `.next/dev/types` (di-ignore git, dibuat ulang oleh `next dev`) dihapus, lalu build sukses tanpa warning.

## Remaining Work and Risks

- Verifikasi di iPhone sungguhan belum dilakukan oleh agent. Checklist untuk tim:
  1. Safari iOS, laporan IN_PROGRESS: ambil 5+ foto sesudah → semua bercentang.
  2. Ambil foto, kunci layar 30 detik, buka lagi → foto bercentang atau "Ulangi" berfungsi.
  3. Mode pesawat, ambil foto → "Ulangi" muncul; matikan mode pesawat, kirim → sukses tanpa foto ulang.
  4. Tutup tab di tengah pengisian, buka lagi → foto bercentang tetap ada dan tidak di-upload ulang saat kirim.
  5. Kalau masih gagal, screenshot toast sekarang memuat penyebab asli — gunakan itu untuk diagnosis lanjutan.
- Uji manual browser desktop (plan Task 6–8 Step 7) juga belum dijalankan.
- File Drive yatim (foto ter-upload lalu dihapus / laporan tidak jadi dikirim) belum dibersihkan.
- Bug camera-modal (shutter diam saat video belum siap / errorMessage tidak di-reset) dan race di form create masih di luar scope.
