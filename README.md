# SPARTA Maintenance

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

**SPARTA Maintenance** adalah aplikasi internal untuk pelaporan, approval, realisasi, arsip PDF, dan pertanggungjawaban uang muka maintenance toko.

Aplikasi ini dipakai oleh tim BMS, BMC, BnM Manager, Branch Admin, dan Admin untuk mengelola laporan kerusakan toko dari estimasi awal sampai pekerjaan selesai, final approval, arsip dokumen, dan PJUM.

---

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript 5 |
| UI | Tailwind CSS 4, shadcn/ui, Radix/Base UI, lucide-react, Tabler Icons, Recharts |
| Database | PostgreSQL |
| ORM | Prisma 7 (`@prisma/client`, adapter Neon/PG tersedia) |
| Auth | Session cookie JWT dengan `jose`, password hash `bcryptjs` |
| Upload foto | UploadThing dan Google Drive CDN/proxy |
| Arsip dokumen | Google Drive API |
| PDF | `@react-pdf/renderer`, `pdf-lib` |
| Email | Nodemailer + Gmail OAuth2 |
| Deploy | Docker standalone Next.js, Render Blueprint |
| PWA | Web manifest, service worker, offline page |

---

## Fitur Utama

- **Role-based dashboard** untuk BMS, BMC, BnM Manager, dan Admin.
- **Alur laporan maintenance BMS** dari draft, submit estimasi, approval BMC, mulai pekerjaan, penyelesaian, review BMC, sampai final approval BnM.
- **Checklist kondisi toko** dengan status item, foto, catatan, estimasi material, dan realisasi biaya.
- **Draft dan autosave** pada form laporan dan penyelesaian pekerjaan.
- **PJUM** untuk rekap pertanggungjawaban uang muka mingguan, approval BnM, data PUM, dan arsip final.
- **PDF report dan PJUM** dengan snapshot/arsip Google Drive.
- **Manajemen data master** user, toko, material, laporan, preventive checklist, dan PJUM di dashboard Admin.
- **Manajemen cabang oleh BMC** untuk user BMS/Branch Admin dan toko di cabang terkait.
- **Notifikasi email** untuk submit laporan dan approval PJUM.
- **Presence tracking** untuk menghitung user aktif/online.
- **Maintenance mode** via env hard override atau toggle Admin.
- **Cron cleanup** untuk laporan pending lama dan workflow cleanup foto approved.
- **Backup database** ke Google Drive melalui script dan GitHub Actions.

---

## Role dan Akses

| Role | Penggunaan utama |
| --- | --- |
| `BMS` | Membuat laporan, mengisi checklist/estimasi, mulai pekerjaan, submit penyelesaian, melihat status laporannya. |
| `BMC` | Review estimasi dan penyelesaian laporan cabang, membuat PJUM, melihat arsip Drive, mengelola BMS/Branch Admin/toko cabang. |
| `BNM_MANAGER` | Final approval laporan setelah disetujui BMC, approval/reject PJUM, melihat laporan/PJUM di branch yang ditangani. |
| `BRANCH_ADMIN` | Role data cabang yang dapat dikelola/import, tetapi saat ini tidak termasuk whitelist login aplikasi utama. |
| `ADMIN` | Dashboard admin, rekap laporan/material/PJUM/preventive, manajemen user/toko, export, settings, arsip, intervensi revisi laporan. |

Catatan login: `app/login/action.ts` hanya mengizinkan `BMS`, `BMC`, `BNM_MANAGER`, dan `ADMIN`.

---

## Alur Laporan

Status laporan mengikuti enum `ReportStatus` di Prisma:

```text
DRAFT
  -> PENDING_ESTIMATION
  -> ESTIMATION_APPROVED
  -> IN_PROGRESS
  -> PENDING_REVIEW
  -> APPROVED_BMC
  -> COMPLETED
```

Jalur revisi/penolakan:

- `ESTIMATION_REJECTED_REVISION`: estimasi dikembalikan ke BMS untuk revisi.
- `ESTIMATION_REJECTED`: estimasi ditolak permanen.
- `REVIEW_REJECTED_REVISION`: hasil pekerjaan dikembalikan ke BMS untuk revisi.

Jika laporan memakai handler `REKANAN`, approval estimasi BMC dapat langsung memindahkan laporan ke `APPROVED_BMC` untuk final approval BnM.

---

## Alur PJUM

1. BMC memilih laporan yang memenuhi syarat dan membuat dokumen PJUM mingguan.
2. PJUM masuk status `PENDING_APPROVAL`.
3. BnM Manager melakukan approval atau rejection.
4. Jika approved, data PUM diisi dan PDF final PJUM serta PDF final report diarsipkan ke Google Drive.

Status PJUM:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

---

## Prasyarat

- Node.js 22 direkomendasikan, mengikuti Dockerfile `node:22-bookworm-slim`.
- npm.
- PostgreSQL.
- Akun Google/OAuth client untuk Gmail dan Google Drive.
- UploadThing token jika memakai endpoint UploadThing.
- Akses Google Drive folder untuk arsip PDF dan Drive CDN foto.

---

## Setup Lokal

```bash
git clone <repository-url>
cd sparta-maintenance
npm install
```

Buat file `.env` di root project, lalu isi minimal:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Session
SESSION_SECRET="secret-minimal-32-karakter"

# URL aplikasi
APP_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth untuk Gmail dan arsip PDF Drive
GMAIL_USER="your-email@gmail.com"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
GOOGLE_REFRESH_TOKEN="xxx"
GOOGLE_DRIVE_ROOT_FOLDER_ID="folder-id-arsip"

# Google Drive CDN/proxy untuk foto
DRIVE_CDN_CLIENT_ID="xxx.apps.googleusercontent.com"
DRIVE_CDN_CLIENT_SECRET="xxx"
DRIVE_CDN_REFRESH_TOKEN="xxx"
DRIVE_CDN_ROOT_FOLDER_ID="folder-id-foto"
DRIVE_CDN_SHARE_MODE="private"

# UploadThing
UPLOADTHING_TOKEN="xxx"

# Cron dan cleanup
CRON_SECRET="secret-cron"
CLEANUP_PENDING_EXPIRY_DAYS="14"

# Maintenance dan logging
MAINTENANCE_MODE="false"
REQUEST_LOG_ENABLED="true"
REQUEST_LOG_SAMPLE_RATE="0.15"
REQUEST_LOG_SLOW_MS="1200"

# Opsional development
DEV_EMAIL_RECIPIENT="dev@example.com"
DEV_PJUM_REVISE_SECRET="dev-only-secret"
```

Generate Prisma Client:

```bash
npm run db:generate
```

Jalankan migrasi sesuai workflow database yang dipakai project:

```bash
npx prisma migrate deploy
```

Untuk data awal development:

```bash
npm run db:seed
```

Buat user manual via CLI:

```bash
npm run create-user
```

Jalankan dev server:

```bash
npm run dev
```

Buka `http://localhost:3000`.

---

## Google OAuth dan Drive

Project memakai Google OAuth untuk tiga kebutuhan:

- Gmail OAuth2 untuk kirim email.
- Google Drive arsip PDF laporan/PJUM.
- Google Drive CDN/proxy untuk foto.

Aktifkan API berikut di Google Cloud Console:

- Gmail API.
- Google Drive API.

Untuk membuat refresh token:

```bash
npm run auth:google
```

Script akan membuka flow OAuth lokal dengan redirect:

```text
http://127.0.0.1:3005/oauth2/callback
```

Setelah token didapat, isi `GOOGLE_REFRESH_TOKEN`. Jika Drive CDN memakai OAuth client atau folder berbeda, isi juga `DRIVE_CDN_REFRESH_TOKEN` dan variabel `DRIVE_CDN_*`.

Validasi Drive utama:

```bash
npm run test:gdrive
```

---

## Script npm

| Command | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan Next.js development server. |
| `npm run build` | Build production. |
| `npm run start` | Menjalankan production server hasil build. |
| `npm run lint` | Menjalankan ESLint. |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:studio` | Membuka Prisma Studio. |
| `npm run db:seed` | Seed data awal. |
| `npm run create-user` | Membuat user lewat CLI. |
| `npm run auth:google` | Membuat Google OAuth refresh token. |
| `npm run test:gdrive` | Validasi koneksi Google Drive. |
| `npm run backup:db` | Backup database ke lokal/Drive. |
| `npm run cleanup:pending` | Cleanup laporan pending sesuai expiry. |
| `npm run cleanup-photos` | Dry-run arsip foto PJUM approved. |
| `npm run cleanup-photos:execute` | Eksekusi arsip foto PJUM approved. |
| `npm run cleanup-photos-v2` | Dry-run cleanup foto PJUM approved versi baru. |
| `npm run cleanup-photos-v2:execute` | Eksekusi cleanup foto PJUM approved versi baru. |
| `npm run import:stores` | Import data toko. |
| `npm run prune:stores` | Prune toko berdasarkan branch. |
| `npm run fix:store-branch` | Koreksi branch toko dari file XLSX. |

---

## Endpoint Penting

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Health check untuk Render. |
| `GET /api/reports/[reportNumber]/pdf` | Stream PDF laporan maintenance. |
| `GET /api/reports/pjum-pdf` | Stream PDF paket PJUM. |
| `GET /api/drive/report-archive` | Redirect BMC ke folder arsip report Drive. |
| `GET /api/drive/pjum-archive` | Redirect BMC ke folder arsip PJUM Drive. |
| `GET /api/cron/cleanup-pending-reports` | Cron cleanup, butuh `Authorization: Bearer <CRON_SECRET>`. |
| `GET/POST /api/uploadthing` | UploadThing file router. |
| `GET /api/photos/[fileId]` | Proxy foto dari Drive CDN. |

Endpoint preview PDF hanya aktif di non-production:

- `GET /api/preview-pdf`
- `GET /api/preview-pjum`
- `GET /api/reports/preview-pdf`

---

## Struktur Project

```text
sparta-maintenance/
├── app/                         # Next.js App Router
│   ├── api/                     # API routes: health, auth, PDF, photos, cron, Drive
│   ├── dashboard/               # Dashboard role-based dan admin backoffice
│   ├── reports/                 # Laporan BMS/BMC/BNM dan PJUM
│   │   ├── (bms)/create         # Form laporan BMS
│   │   ├── (bms)/start-work     # Mulai pengerjaan
│   │   ├── (bms)/complete       # Penyelesaian pekerjaan
│   │   ├── pjum                 # PJUM create/approval/detail
│   │   └── [reportNumber]       # Detail laporan
│   ├── bmc/database             # Manajemen user/toko cabang oleh BMC
│   ├── admin/                   # Halaman admin legacy/khusus
│   ├── login                    # Login
│   ├── change-password          # Ganti password wajib/manual
│   ├── forgot-password          # Request reset password
│   ├── reset-password           # Reset password token
│   └── maintenance              # Halaman maintenance mode
├── components/                  # Shared UI, sidebar, layout, session/presence helpers
├── hooks/                       # Hooks global
├── lib/                         # Domain logic, auth, Prisma, PDF, Google Drive, email, storage
│   ├── email/                   # Mailer dan template email
│   ├── google-drive/            # Client Drive, CDN client, archive helpers
│   ├── jobs/                    # Job cleanup pending reports
│   ├── pdf/                     # Generator dan snapshot PDF
│   └── storage/                 # URL/proxy/upload foto
├── prisma/                      # Schema, migrations, seed
├── public/                      # Assets, icons, service worker, offline page
├── scripts/                     # Utility CLI/import/backup/cleanup
└── types/                       # Shared TypeScript types
```

---

## Database

Model utama:

- `User`: data akun, role, branch scope, password hash, presence.
- `Store`: data toko dan branch.
- `Report`: laporan maintenance, checklist JSON, estimasi, realisasi, foto, status, PDF paths, arsip Drive.
- `ApprovalLog`: catatan approval/rejection laporan.
- `ActivityLog`: timeline aktivitas laporan.
- `PjumExport`: dokumen PJUM, status approval, data PUM, PDF final.
- `PjumBankAccount`: rekening PUM per BMS.
- `GoogleDriveFolderCache`: cache folder Drive.
- `AppSetting`: setting sistem seperti maintenance toggle.
- `UserPresence`: last seen user.

Schema ada di [prisma/schema.prisma](prisma/schema.prisma).

---

## Maintenance Mode

Maintenance mode punya dua sumber:

1. `MAINTENANCE_MODE=true` sebagai hard override dari environment.
2. Toggle Admin yang disimpan melalui `AppSetting`.

Saat aktif:

- User non-admin diarahkan ke `/maintenance`.
- Endpoint `/api/*` mengembalikan `503`, kecuali `/api/health`.
- `ADMIN` tetap dapat masuk untuk mengelola sistem.

---

## Deploy

Project siap deploy sebagai Docker standalone Next.js.

Build image:

```bash
docker build -t sparta-maintenance .
```

Run container:

```bash
docker run --env-file .env -p 3000:3000 sparta-maintenance
```

Render Blueprint tersedia di [render.yaml](render.yaml). Health check memakai:

```text
/api/health
```

---

## Backup dan Cleanup

Backup database:

```bash
npm run backup:db
```

GitHub Actions yang tersedia:

- `.github/workflows/backup-db.yml`
- `.github/workflows/cleanup-approved-photos.yml`

---

## Dokumentasi Aktif

Dokumentasi yang dipertahankan di repo:

- [README.md](README.md): onboarding dan referensi operasional project.
- [AI_CONTEXT.md](AI_CONTEXT.md): konteks kerja untuk AI/developer.
- [AI_RULES.md](AI_RULES.md): aturan kerja AI/developer.

Folder dokumentasi lama seperti `.docs/`, `docs/`, dan spesifikasi Kiro sudah tidak menjadi sumber rujukan aktif.

---

## Catatan Developer

- Middleware/proxy route protection ada di [proxy.ts](proxy.ts).
- Auth helper server-side ada di [lib/authorization.ts](lib/authorization.ts).
- Session cookie berlaku 8 jam, dikelola di [lib/session.ts](lib/session.ts).
- Prisma datasource membaca `DIRECT_URL` lalu fallback ke `DATABASE_URL` melalui [prisma.config.ts](prisma.config.ts).
- Preview PDF dan endpoint dev tertentu dinonaktifkan di production.
- `next.config.ts` memakai `output: "standalone"` untuk Docker/Render.

---

## License

Proprietary. Internal asset of **PT Sumber Alfaria Trijaya, Tbk**. All rights reserved. See [LICENSE](LICENSE) for details.
