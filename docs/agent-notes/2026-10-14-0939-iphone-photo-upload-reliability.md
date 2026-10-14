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
- Uji manual browser untuk alur Penyelesaian (plan Task 6 Step 7) belum dijalankan agent: butuh login BMS dan akan mengunggah foto sungguhan ke Drive.
- `npx tsc --noEmit` butuh `NODE_OPTIONS=--max-old-space-size=6144` (default heap habis). Satu error yang sudah ada sebelumnya di `.next/dev/types/validator.ts` (route `app/api/fix-pdf` yang sudah dihapus, file generate lama) — bukan dari perubahan ini.

## Remaining Work and Risks

- Task 2–9 di plan belum dikerjakan.
