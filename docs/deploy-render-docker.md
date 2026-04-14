# Deploy ke Render (Docker)

Panduan ini menggunakan `Dockerfile` di root project dan template `render.yaml`.

## 1) Prasyarat

- Akun Render
- Repository sudah push ke GitHub/GitLab
- Database PostgreSQL sudah tersedia (Neon/Supabase/Aiven)
- Seluruh environment variable produksi sudah siap

## 2) Deploy via Blueprint (disarankan)

1. Buka Render Dashboard.
2. Pilih **New** -> **Blueprint**.
3. Pilih repository ini.
4. Render akan membaca `render.yaml` otomatis.
5. Isi semua env var yang bertanda `sync: false`.
6. Klik **Apply**.

## 3) Deploy manual (tanpa Blueprint)

1. Buka Render Dashboard.
2. Pilih **New** -> **Web Service**.
3. Connect repository.
4. Runtime pilih **Docker**.
5. Render akan build dari `Dockerfile` root.
6. Set semua env var produksi di menu **Environment**.

## 4) Environment variable wajib

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (isi URL service Render, contoh: `https://sparta-maintenance.onrender.com`)
- `GMAIL_USER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

Opsional:

- `MAINTENANCE_MODE` (default `false`)
- `MAINTENANCE_MESSAGE`
- `DEV_EMAIL_RECIPIENT`

## 5) Catatan penting Prisma

- Jangan jalankan `db:push` pada environment produksi.
- Gunakan migration workflow:
    1. `npx prisma migrate dev --name <migration_name>` di local/dev
    2. review SQL
    3. `npx prisma migrate deploy` di environment target
    4. `npm run db:generate`

## 5.1) Catatan build Docker

- `Dockerfile` sudah menyiapkan placeholder env non-secret di stage build.
- Tujuannya agar proses `next build` tidak gagal ketika ada modul yang memvalidasi env saat build.
- Placeholder ini hanya dipakai saat build image, bukan untuk runtime produksi.
- Saat service jalan di Render, nilai env runtime dari dashboard Render tetap yang dipakai aplikasi.

## 6) Verifikasi setelah deploy

- Buka halaman login service.
- Login salah satu akun valid.
- Coba alur minimum: baca dashboard, buka report, dan akses upload/storage yang relevan.
- Cek log Render untuk error koneksi DB, Supabase, Gmail, atau Google Drive.

## 7) Build image lokal (opsional)

```bash
docker build -t sparta-maintenance:render .
docker run --rm -p 3000:3000 --env-file .env sparta-maintenance:render
```

Jika Docker Desktop belum aktif, perintah build akan gagal.
