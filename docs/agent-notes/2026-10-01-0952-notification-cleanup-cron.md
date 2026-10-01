# Notification Cleanup Cron

## Perubahan
- Tambah `lib/jobs/cleanup-notifications.ts` — logika delete notifikasi > 7 hari
- Tambah `app/api/cron/cleanup-notifications/route.ts` — endpoint cron
- Tambah `NOTIFICATION_RETENTION_DAYS=7` ke `render.yaml`
- Tambah `scripts/one-time-cleanup-notifications.ts` — script cleanup 310K baris lama

## Keputusan
- Retention 7 hari: notifikasi > 7 hari sudah tidak actionable (UI hanya tampil 10 terbaru)
- Tidak ada perubahan schema — cukup cron delete biasa
- Ikuti pattern `cleanup-pending-reports` yang sudah ada

## Cara test
- GET /api/cron/cleanup-notifications dengan Bearer CRON_SECRET
- Expected: { ok: true, deleted: N, threshold: ISO string }

## Tindak lanjut
- Jadwalkan cron di Render dashboard: schedule "0 1 * * *", URL /api/cron/cleanup-notifications
