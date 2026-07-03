# Operations

## Setup Lokal

```bash
npm install
npm run db:generate
npm run dev
```

Jangan menjalankan migration atau script data massal sebelum memastikan `DATABASE_URL` dan `DIRECT_URL` mengarah ke database yang benar.

## Build

```bash
npm run build
npm run start
```

Build Docker production memakai standalone output Next.js.

## Migration

Development:

```bash
npx prisma migrate dev --name <migration_name>
```

Production atau staging:

```bash
npx prisma migrate deploy
```

Aturan:

- Jangan pakai `prisma db push` ke database shared atau production.
- Branch git tidak memisahkan database.
- Jika branch testing memakai production database, migration tetap mengubah production database.
- Untuk perubahan destructive, backup dulu dan pastikan kode production lama masih kompatibel.

## Render

Konfigurasi Render ada di `render.yaml`.

- Runtime: Docker.
- Health check: `/api/health`.
- Auto deploy: aktif.
- Service timezone: UTC.
- Default `DATABASE_POOL_MAX`: 5.

Jika env berubah:

1. Update env di Render.
2. Redeploy service.
3. Untuk env `NEXT_PUBLIC_*`, pastikan image dibuild ulang.

## Backup

Gunakan script backup:

```bash
npm run backup:db
```

Env terkait:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `BACKUP_DRIVE_FOLDER_ID`

Simpan backup sebelum migration destructive atau script data massal.

## Script Penting

| Command | Fungsi |
| --- | --- |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:studio` | Buka Prisma Studio. |
| `npm run db:seed` | Seed data awal. |
| `npm run create-user` | Buat user dari CLI. |
| `npm run backup:db` | Backup database. |
| `npm run cleanup:pending` | Cleanup laporan pending lama. |
| `npm run cleanup-photos` | Dry-run archive foto PJUM approved. |
| `npm run cleanup-photos:execute` | Execute archive foto PJUM approved. |
| `npm run cleanup-photos-v2` | Dry-run cleanup foto approved versi baru. |
| `npm run cleanup-photos-v2:execute` | Execute cleanup foto approved versi baru. |
| `npm run import:stores` | Import data toko. |
| `npm run prune:stores` | Prune toko by branch. |
| `npm run fix:store-branch` | Perbaiki branch toko dari XLSX. |
| `npm run export:preventive-photos` | Export foto preventif. |
| `npm run auth:google` | Generate Google refresh token. |
| `npm run test:gdrive` | Test koneksi Google Drive. |
| `npx tsx scripts/merge-branch-scopes.ts --self-test` | Self-test script merge cabang/area. |
| `npx tsx scripts/merge-branch-scopes.ts --execute` | Execute merge cabang/area. |

## Troubleshooting Cepat

### Prisma P1001 ke Aiven

Cek port:

```powershell
Test-NetConnection <host> -Port <port>
```

Cek IPv4:

```powershell
Resolve-DnsName <host> -Type A
```

Jika gagal dari WiFi lokal tetapi production normal, coba hotspot, VPN, atau jalankan command dari environment cloud.

### Timeout atau Too Many Connections

Cek:

- `DATABASE_POOL_MAX`
- jumlah instance Render
- query paralel dalam satu request
- interactive transaction terlalu panjang

Jangan langsung menaikkan pool tanpa menghitung limit koneksi database.

### Server Action Not Found

Biasanya stale client setelah deploy. Refresh halaman atau pastikan user tidak memakai bundle lama.

### Web Push Tidak Muncul

Cek:

- browser mendukung Service Worker, Notification, dan PushManager,
- permission browser tidak diblok,
- PWA/service worker aktif,
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` tersedia di bundle client,
- `VAPID_PRIVATE_KEY` dan `VAPID_SUBJECT` tersedia di server,
- site berjalan di HTTPS.

### UploadThing Missing Token

Jika muncul error `Missing token`, berarti masih ada flow legacy yang memanggil UploadThing server. Pilih salah satu:

- isi kembali `UPLOADTHING_TOKEN`, atau
- hapus/ubah flow legacy tersebut agar tidak memanggil UploadThing.
