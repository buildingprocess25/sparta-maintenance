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
- Urutan build Prisma penting: folder `prisma/` harus di-`COPY` sebelum `npm ci`, karena `postinstall` menjalankan `prisma generate`.

## 6) Verifikasi setelah deploy

- Buka halaman login service.
- Login salah satu akun valid.
- Coba alur minimum: baca dashboard, buka report, dan akses upload/storage yang relevan.
- Cek log Render untuk error koneksi DB, Supabase, Gmail, atau Google Drive.

### Logging di Render

- Request log dicetak dari `proxy.ts` dalam format JSON (method, path, status, duration).
- Error yang di-handle di action/API tetap tercatat lewat `logger.error` pada blok `catch`.
- Unhandled error (uncaught exception / unhandled rejection) dicatat global melalui `instrumentation.ts`.
- Untuk traffic tinggi, request log memakai mode adaptif:
  status error (>= 400), redirect (3xx), dan request lambat selalu dicatat; request normal dicatat dengan sampling.
- Env tuning:
  `REQUEST_LOG_ENABLED` (default `true`), `REQUEST_LOG_SAMPLE_RATE` rentang `0..1` (default `0.15`), `REQUEST_LOG_SLOW_MS` ambang request lambat dalam ms (default `1200`).

## 7) Build image lokal (opsional)

```bash
docker build -t sparta-maintenance:render .
docker run --rm -p 3000:3000 --env-file .env sparta-maintenance:render
```

Jika Docker Desktop belum aktif, perintah build akan gagal.

### Optimize Build Speed (Lokal)

Untuk build lebih cepat saat development/testing lokal:

```bash
# Enable Docker BuildKit untuk parallel build & better caching
DOCKER_BUILDKIT=1 docker build -t sparta-maintenance:render .
```

BuildKit cache layer antar rebuild, jauh lebih cepat rebuild kedua+ dibanding rebuild pertama.

## 8) Render Build Performance

**Render otomatis cache Docker layers** antar rebuild, jadi:

- **Build pertama:** ~3-5 menit (full build, npm ci, Prisma generate, Next.js compile)
- **Build subsequent:** ~1-2 menit (layer cache hit, hanya changes di-rebuild)

**Tips mempercepat:**

1. Push hanya file yang perlu (minimize diff)
2. Hindari frequent re-push tanpa perubahan kode
3. Jika hanya env var berubah, tidak perlu rebuild — update env di Render dashboard saja
4. Jika code berubah drastis, rebuild akan lebih lama (layer cache miss)

**Monitoring build:**

- Render Dashboard → Your Service → Deploys
- Klik deploy terbaru → lihat build step logs
- "Building image..." section menunjukkan cache hit/miss untuk setiap layer

## 9) GitHub Actions Cron Jobs

Project ini menggunakan **GitHub Actions** untuk automated jobs (tidak tergantung Render):

1. **Daily Database Backup** (12 AM UTC)
    - Backup PostgreSQL ke Google Drive
    - Simpan 7 hari di GitHub Artifacts

2. **Cleanup Pending Reports** (1 AM UTC)
    - Hapus draft reports lebih tua dari 14 hari
    - Bersihkan UploadThing files terkait

**Setup:**

- Lihat [github-actions-cron-jobs.md](./github-actions-cron-jobs.md) untuk dokumentasi lengkap
- Tambahkan secrets di GitHub repo: `DATABASE_URL`, `DIRECT_URL`, `UPLOADTHING_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `BACKUP_DRIVE_FOLDER_ID`
- Workflows otomatis berjalan sesuai schedule atau bisa di-trigger manual dari Actions tab
