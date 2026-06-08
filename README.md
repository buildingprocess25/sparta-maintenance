# SPARTA Maintenance

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

**SPARTA Maintenance** adalah aplikasi internal untuk pelaporan maintenance toko, approval berjenjang, checklist preventif, realisasi biaya, arsip PDF, dan PJUM.

Project ini sedang memakai pola dashboard baru untuk `ADMIN`, `BMC`, dan `BNM_MANAGER`. Role `BMS` tetap memakai workflow operasional lama untuk membuat, menjalankan, dan menyelesaikan laporan.

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript 5 |
| UI | Tailwind CSS 4, shadcn/ui, Radix/Base UI, lucide-react, Tabler Icons, Recharts |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | Session cookie JWT dengan `jose`, password hash `bcryptjs` |
| Upload dan foto | Google Drive CDN/proxy, UploadThing handler legacy |
| Arsip dokumen | Google Drive API |
| PDF | `@react-pdf/renderer`, `pdf-lib` |
| Email | Nodemailer + Gmail OAuth2 |
| Deploy | Docker standalone Next.js, Render Blueprint |

## Role dan Akses

| Role | Akses utama |
| --- | --- |
| `BMS` | Membuat laporan, mengisi checklist dan estimasi, mulai kerja, submit penyelesaian, melihat detail laporan miliknya di `/reports/[reportNumber]`. |
| `BMC` | Memantau dashboard cabang, review estimasi dan penyelesaian, melihat checklist preventif, melihat/membatalkan PJUM sesuai cabang, melihat performa cabang. |
| `BNM_MANAGER` | Memantau dashboard cabang, final approval laporan, approval PJUM, melihat laporan/PJUM/performa cabang sesuai branch scope. |
| `ADMIN` | Dashboard global, laporan, PJUM, preventive, cabang, realisasi, user, toko, activity, settings, arsip, dan intervensi revisi laporan. |
| `BRANCH_ADMIN` | Ada di data model, tetapi tidak termasuk role login aplikasi utama saat ini. |

Catatan penting:

- Login utama hanya mengizinkan `BMS`, `BMC`, `BNM_MANAGER`, dan `ADMIN`.
- `HEAD OFFICE` adalah cabang development/testing. Data ini disembunyikan dari tampilan global `ADMIN`, tetapi user non-admin yang memang scoped ke `HEAD OFFICE` tetap harus melihat data miliknya.
- Menu `Material` dan `Performa BMS` tidak ditampilkan di sidebar admin versi sekarang.

## Route Utama

| Route | Role | Fungsi |
| --- | --- | --- |
| `/dashboard` | `ADMIN`, `BMC`, `BNM_MANAGER`, `BMS` | Dashboard sesuai role. `BMC` dan `BNM_MANAGER` memakai dashboard shell baru. |
| `/dashboard/reports` | `ADMIN`, `BMC`, `BNM_MANAGER` | Tabel laporan maintenance dengan filter status, SLA, branch, PJUM, dan infinite scroll. |
| `/dashboard/reports/[reportNumber]` | `ADMIN`, `BMC`, `BNM_MANAGER` | Detail dashboard laporan: checklist compact, pekerjaan dan biaya, dokumentasi, riwayat, aksi. |
| `/reports/[reportNumber]` | `BMS` | Detail laporan operasional untuk BMS. Non-BMS diarahkan ke route dashboard detail. |
| `/reports/(bms)/create` | `BMS` | Buat laporan dan checklist. |
| `/reports/(bms)/start-work` | `BMS` | Mulai pekerjaan, selfie, nota, dan toko material. |
| `/reports/(bms)/complete` | `BMS` | Submit penyelesaian dan realisasi. |
| `/dashboard/pjum` | `ADMIN`, `BMC`, `BNM_MANAGER` | List PJUM, filter, validasi pending terlalu lama. |
| `/dashboard/pjum/[id]` | `ADMIN`, `BMC`, `BNM_MANAGER` | Detail PJUM dan link PDF final. |
| `/dashboard/preventive` | `ADMIN`, `BMC` | Coverage checklist preventif per triwulan. Hanya laporan preventif status `COMPLETED` yang dihitung. |
| `/dashboard/branches` | `ADMIN`, `BMC`, `BNM_MANAGER` | Performa cabang, scoped sesuai role. |
| `/dashboard/branches/[branchName]` | `ADMIN`, `BMC`, `BNM_MANAGER` | Detail cabang. |
| `/dashboard/realisasi` | `ADMIN` | Analisis realisasi, termasuk rata-rata realisasi per BMS per minggu per cabang. |
| `/dashboard/users` | `ADMIN` | Master user. |
| `/dashboard/stores` | `ADMIN` | Master toko. |
| `/dashboard/activity` | `ADMIN` | Aktivitas user dan laporan. |
| `/dashboard/activity/online` | `ADMIN` | User online 5 menit terakhir dan user aktif hari ini. |
| `/dashboard/settings` | `ADMIN` | Maintenance mode, SLA laporan, dan policy PJUM. |

## Alur Laporan

Status laporan mengikuti enum `ReportStatus`:

```text
DRAFT
  -> PENDING_ESTIMATION
  -> ESTIMATION_APPROVED
  -> IN_PROGRESS
  -> PENDING_REVIEW
  -> APPROVED_BMC
  -> COMPLETED
```

Status revisi atau penolakan:

- `ESTIMATION_REJECTED_REVISION`: estimasi dikembalikan ke BMS.
- `ESTIMATION_REJECTED`: estimasi ditolak permanen.
- `REVIEW_REJECTED_REVISION`: hasil pekerjaan dikembalikan ke BMS.

Semantik timestamp laporan:

- `Report.createdAt`: waktu laporan dibuat.
- `Report.updatedAt`: update row Prisma. Untuk UI "update terakhir laporan", gunakan aktivitas terbaru yang berhubungan dengan laporan jika tersedia.
- `ActivityLog.createdAt`: sumber utama riwayat aktivitas laporan.
- `Report.finishedAt`: waktu final approval BNM ketika status menjadi `COMPLETED`.
- `Report.pjumExportedAt`: waktu laporan sudah masuk/export PJUM.

## Alur PJUM

1. BMC membuat PJUM dari laporan yang sudah memenuhi syarat.
2. PJUM masuk `PENDING_APPROVAL`.
3. BNM Manager menyetujui atau menolak.
4. Saat approved, PDF final PJUM dan PDF final report dapat diarsipkan ke Google Drive.

Status PJUM:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

Dashboard PJUM versi sekarang fokus pada list, detail, PDF final, dan pending yang terlalu lama. Kolom dokumen dan aksi inline tidak dipakai; dokumen dilihat dari detail PJUM.

## Checklist Preventif

Checklist preventif dipakai untuk memastikan toko melakukan checklist per triwulan.

Aturan saat ini:

- Coverage hanya menghitung report preventif dengan status `COMPLETED`.
- Report preventif yang belum selesai tidak dihitung.
- Filter default adalah semua cabang.
- Export preventive memakai query yang dioptimalkan dan menyediakan pilihan triwulan, termasuk semua triwulan.

## Realisasi dan Uang Muka

BMS diberi uang muka mingguan. Analisis realisasi dipakai untuk membaca apakah uang muka mingguan cukup, kurang, atau berlebih.

Metrik yang dipakai:

- Total realisasi laporan selesai.
- Tren realisasi bulanan.
- Rata-rata realisasi per BMS per minggu per cabang.
- Data cabang tetap ditampilkan sebagai agregat cabang, bukan tabel terpisah per BMS.

## Database

Model utama:

- `User`: akun, role, branch scope, password, presence.
- `Store`: toko dan cabang.
- `Report`: laporan maintenance, checklist JSON, estimasi, realisasi, status, timestamp, foto, PDF final.
- `ApprovalLog`: catatan keputusan approval.
- `ActivityLog`: timeline aktivitas laporan.
- `PjumExport`: dokumen PJUM, status approval, report numbers, PDF final.
- `UserPresence`: online dan aktif hari ini.
- `AppSetting`: maintenance mode, SLA laporan, policy PJUM.
- `GoogleDriveFolderCache`: cache folder Drive.

Schema ada di [prisma/schema.prisma](prisma/schema.prisma).

Index penting yang sudah ada antara lain:

- Report branch/status/date untuk dashboard reports, detail report, preventive, dan PJUM.
- Store branch/code.
- ActivityLog report/actor/createdAt.
- PjumExport status/branch/createdAt sesuai kebutuhan dashboard.

## Setup Lokal

```bash
git clone <repository-url>
cd sparta-maintenance
npm install
npm run db:generate
npm run dev
```

Minimal `.env`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SESSION_SECRET="secret-minimal-32-karakter"
APP_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

GMAIL_USER="your-email@gmail.com"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
GOOGLE_REFRESH_TOKEN="xxx"
GOOGLE_DRIVE_ROOT_FOLDER_ID="folder-id-arsip"

DRIVE_CDN_CLIENT_ID="xxx.apps.googleusercontent.com"
DRIVE_CDN_CLIENT_SECRET="xxx"
DRIVE_CDN_REFRESH_TOKEN="xxx"
DRIVE_CDN_ROOT_FOLDER_ID="folder-id-foto"
DRIVE_CDN_SHARE_MODE="private"

UPLOADTHING_TOKEN="xxx"
CRON_SECRET="secret-cron"
CLEANUP_PENDING_EXPIRY_DAYS="14"
MAINTENANCE_MODE="false"
```

Migrasi production/staging:

```bash
npx prisma migrate deploy
```

Untuk development migration baru:

```bash
npx prisma migrate dev --name <migration_name>
```

Jangan gunakan `prisma db push` untuk schema yang terhubung ke database bersama/production.

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
| `npm run backup:db` | Backup database. |
| `npm run cleanup:pending` | Cleanup laporan pending lama. |
| `npm run cleanup-photos` | Dry-run arsip foto PJUM approved. |
| `npm run cleanup-photos:execute` | Eksekusi arsip foto PJUM approved. |
| `npm run cleanup-photos-v2` | Dry-run cleanup foto PJUM approved versi baru. |
| `npm run cleanup-photos-v2:execute` | Eksekusi cleanup foto PJUM approved versi baru. |
| `npm run import:stores` | Import toko. |
| `npm run prune:stores` | Prune toko berdasarkan branch. |
| `npm run fix:store-branch` | Koreksi branch toko dari file XLSX. |
| `npm run export:preventive-photos` | Export foto preventive. |

## Endpoint Penting

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Health check untuk Render. |
| `GET /api/auth/session` | Cek session. |
| `GET/POST /api/presence` | Presence user. |
| `GET /api/reports/[reportNumber]/pdf` | Stream PDF laporan. |
| `GET /api/reports/pjum-pdf` | Stream PDF PJUM. |
| `GET /api/drive/report-archive` | Redirect folder arsip report Drive. |
| `GET /api/drive/pjum-archive` | Redirect folder arsip PJUM Drive. |
| `POST /api/photos/upload` | Upload foto ke Drive CDN. |
| `GET /api/photos/[fileId]` | Proxy foto dari Drive CDN. |
| `GET /api/cron/cleanup-pending-reports` | Cleanup pending reports, butuh `Authorization: Bearer <CRON_SECRET>`. |
| `GET/POST /api/uploadthing` | UploadThing handler legacy. |

Endpoint preview/debug hanya untuk non-production atau development.

## Struktur Project

```text
app/
  dashboard/                 Dashboard baru role ADMIN/BMC/BNM_MANAGER
    _components/admin/       AdminDashboardShell dan komponen dashboard admin
    _components/manager-*    Dashboard BMC/BNM scoped cabang
    reports/                 List dan detail laporan dashboard
    pjum/                    List dan detail PJUM dashboard
    preventive/              Coverage checklist preventif
    branches/                Performa cabang dan detail cabang
    realisasi/               Analisis realisasi admin
    settings/                Maintenance, SLA, policy PJUM
  reports/                   Workflow operasional BMS dan approval lama
components/                  Shared UI, sidebar, dialog, layout
lib/                         Auth, Prisma, domain helper, PDF, Drive, email, settings
prisma/                      Schema, migrations, seed
scripts/                     Utility CLI, import, backup, cleanup
types/                       Shared TypeScript types
```

## Maintenance Mode

Maintenance mode punya dua sumber:

1. `MAINTENANCE_MODE=true` dari environment sebagai hard override.
2. Toggle dashboard settings yang disimpan di `AppSetting`.

Saat aktif:

- User non-admin diarahkan ke `/maintenance`.
- Endpoint `/api/*` mengembalikan `503`, kecuali endpoint yang dikecualikan seperti health check.
- `ADMIN` tetap dapat masuk untuk mengelola sistem.

## Deploy

Project memakai Docker standalone Next.js.

```bash
docker build -t sparta-maintenance .
docker run --env-file .env -p 3000:3000 sparta-maintenance
```

Render Blueprint tersedia di [render.yaml](render.yaml). Health check:

```text
/api/health
```

## Catatan Developer

- Middleware/proxy route protection ada di [proxy.ts](proxy.ts).
- Auth helper server-side ada di [lib/authorization.ts](lib/authorization.ts).
- Branch exclusion global ada di [lib/admin-branch-scope.ts](lib/admin-branch-scope.ts).
- Global label status laporan ada di [lib/report-status.ts](lib/report-status.ts).
- Global label status PJUM ada di [lib/pjum-status.ts](lib/pjum-status.ts).
- App settings, SLA laporan, dan policy PJUM ada di [lib/app-settings.ts](lib/app-settings.ts).
- Session cookie dikelola di [lib/session.ts](lib/session.ts).
- Prisma datasource membaca konfigurasi dari [prisma.config.ts](prisma.config.ts).

## License

Proprietary. Internal asset of **PT Sumber Alfaria Trijaya, Tbk**. All rights reserved. See [LICENSE](LICENSE) for details.
