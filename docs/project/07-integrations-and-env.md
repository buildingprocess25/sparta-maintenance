# Integrations and Env

## Environment Variables

| Env | Fungsi |
| --- | --- |
| `DATABASE_URL` | Runtime database connection. |
| `DIRECT_URL` | Direct database connection untuk Prisma CLI dan migration. |
| `DATABASE_POOL_MAX` | Maksimum koneksi pool runtime. |
| `DATABASE_IDLE_TIMEOUT_MS` | Timeout koneksi idle pool. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Timeout membuka koneksi database. |
| `SESSION_SECRET` | Secret untuk session cookie dan token internal. |
| `APP_BASE_URL` | Base URL server-side. |
| `NEXT_PUBLIC_APP_URL` | Base URL client-side. |
| `GOOGLE_CLIENT_ID` | Google OAuth client untuk Drive/Gmail utama. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret untuk Drive/Gmail utama. |
| `GOOGLE_REFRESH_TOKEN` | Refresh token Google utama. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root folder arsip PDF laporan dan PJUM. |
| `GMAIL_USER` | Email sender Gmail OAuth2. |
| `DRIVE_CDN_CLIENT_ID` | Google OAuth client untuk foto/Drive CDN. |
| `DRIVE_CDN_CLIENT_SECRET` | Google OAuth secret untuk foto/Drive CDN. |
| `DRIVE_CDN_REFRESH_TOKEN` | Refresh token foto/Drive CDN. |
| `DRIVE_CDN_ROOT_FOLDER_ID` | Root folder foto. |
| `DRIVE_CDN_SHARE_MODE` | Mode share foto: `private`, `domain`, atau mode yang didukung service. |
| `DRIVE_CDN_SHARE_DOMAIN` | Domain share jika `DRIVE_CDN_SHARE_MODE=domain`. |
| `CRON_SECRET` | Secret endpoint cron. |
| `CLEANUP_PENDING_EXPIRY_DAYS` | Umur laporan pending sebelum cleanup. Default 14 hari. |
| `MAINTENANCE_MODE` | Hard override maintenance mode. |
| `REQUEST_LOG_ENABLED` | Enable structured request logging di `proxy.ts`. |
| `REQUEST_LOG_SAMPLE_RATE` | Sampling log request normal. |
| `REQUEST_LOG_SLOW_MS` | Threshold request lambat. |
| `NEXT_PUBLIC_NOTIFICATIONS_ENABLED` | Enable UI notifikasi. |
| `NEXT_PUBLIC_WEB_PUSH_ENABLED` | Enable Web Push client. |
| `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED` | Paksa gate permission notifikasi jika push aktif. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key untuk browser. |
| `VAPID_PRIVATE_KEY` | Private VAPID key untuk server. |
| `VAPID_SUBJECT` | Subject Web Push, biasanya `mailto:...`. |
| `BACKUP_DRIVE_FOLDER_ID` | Folder Drive tujuan upload backup database. |
| `RENDER_EXTERNAL_URL` | Fallback URL dari Render untuk generate PDF. |
| `UPLOADTHING_TOKEN` | Legacy UploadThing. Hanya diperlukan oleh flow lama yang masih menyentuh UploadThing. |

## Env Development Only

| Env | Fungsi |
| --- | --- |
| `PRELOAD_APP_SETTINGS_IN_DEV` | Paksa preload app settings saat development. |
| `DEV_EMAIL_RECIPIENT` | Override penerima email saat development. |
| `DEV_PJUM_REVISE_SECRET` | Secret route dev revise PJUM. |
| `DEV_DRIVE_PROXY_SECRET` | Secret route dev Drive proxy. |

Jangan isi env development-only di production kecuali memang route dan risikonya sudah dicek.

## Google Drive

- PDF report dan PJUM diarsipkan ke Google Drive utama.
- Foto memakai Drive CDN/proxy agar file dari akun perusahaan tetap bisa diakses aplikasi.
- File final seperti `completedPdfPath`, `reportFinalDriveUrl`, `pjumPdfPath`, dan `pjumFinalDriveUrl` jangan dihapus tanpa memastikan field database dan UI tidak lagi memakai link tersebut.
- `GoogleDriveFolderCache` dipakai untuk mengurangi pembuatan folder berulang.

### Approved hierarchy migration (not active yet)

Target yang sudah disetujui tetapi belum diimplementasikan memakai
`DOKUMEN SPARTA` sebagai root bersama:

```text
<CABANG>/
  Toko/
    <NO ULOK> - <NAMA TOKO> - <KODE TOKO>/
      Building/
      Maintenance/
        <NOMOR LAPORAN>/
          01 - Dokumen/
          02 - Foto Checklist/
          03 - Foto Mulai Pekerjaan/
          04 - Foto Penyelesaian/
  PJUM Sparta-Maintenance/
```

`GOOGLE_DRIVE_ROOT_FOLDER_ID` akan menjadi root canonical. Selama cutover,
`DRIVE_CDN_ROOT_FOLDER_ID` menunjuk ID yang sama untuk kompatibilitas, tetapi
credential `DRIVE_CDN_*` tetap dipakai untuk upload/proxy foto. Jangan mengganti
root production sebelum kode hierarchy-aware dideploy karena kode aktif masih
membuat path legacy dan upload foto langsung ke root CDN.

`BACKUP_DRIVE_FOLDER_ID` tetap independen dan harus menunjuk folder backup
terbatas di luar `DOKUMEN SPARTA`.

Desain lengkap: `docs/superpowers/specs/2026-08-26-google-drive-hierarchy-design.md`.

## Gmail

Email memakai Nodemailer dengan Gmail OAuth2.

Env minimum:

- `GMAIL_USER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

Flow yang memakai email antara lain reset password dan notifikasi PJUM jika fitur terkait aktif.

## Web Push

- PWA mendukung native notification.
- Subscription disimpan di `PushSubscription` per user dan device.
- Notifikasi bisnis disimpan di `Notification`, lalu Web Push dikirim jika subscription valid.
- Browser tertentu bisa memblok Web Push, terutama jika permission pernah ditolak atau PWA/service worker belum valid.
- Jangan menyalakan `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=true` sebelum service worker, HTTPS, dan VAPID valid di production.

Generate VAPID keys:

```bash
npx tsx scripts/generate-vapid-keys.ts
```

## Render

Render memakai Docker runtime. Env production didefinisikan di `render.yaml`, tetapi secret disimpan sebagai `sync: false`.

Catatan:

- `TZ=UTC` dipakai di service.
- Dockerfile juga set `TZ=UTC`.
- Build memakai nilai dummy non-secret agar import Prisma/Next tidak gagal.
- Jika env public `NEXT_PUBLIC_*` berubah, rebuild/redeploy diperlukan karena nilainya bisa masuk bundle client.

## UploadThing Legacy

UploadThing masih ada sebagai handler legacy:

- `app/api/uploadthing/*`
- `lib/uploadthing.ts`
- beberapa flow draft lama bisa memanggil cleanup UploadThing.

Jangan jadikan UploadThing dependency fitur baru jika Google Drive flow sudah cukup. Jika env `UPLOADTHING_TOKEN` dihapus, pastikan tidak ada flow aktif yang masih memanggil API UploadThing server.

## Cron

Endpoint cron aktif:

- `GET /api/cron/cleanup-pending-reports`

Endpoint ini membutuhkan:

```text
Authorization: Bearer <CRON_SECRET>
```

Job membaca `CLEANUP_PENDING_EXPIRY_DAYS` untuk batas umur laporan pending.
