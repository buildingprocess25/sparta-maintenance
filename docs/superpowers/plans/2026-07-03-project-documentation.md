# Dokumentasi Project SPARTA Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat dokumentasi project SPARTA Maintenance yang detail, lengkap, dan berbahasa Indonesia untuk developer, operator, dan AI agent.

**Architecture:** `README.md` tetap menjadi pintu masuk ringkas. Dokumentasi detail dipindah ke `docs/project/` berdasarkan topik supaya mudah dicari dan tidak membuat README terlalu besar. `.agents/AI_CONTEXT.md` diperbarui sebagai ringkasan kerja AI dan pointer ke dokumentasi detail, bukan tempat semua dokumentasi hidup.

**Tech Stack:** Markdown, Next.js 16, React 19, Prisma 7, PostgreSQL, Render, Google Drive API, PWA Web Push.

## Global Constraints

- Bahasa dokumentasi wajib bahasa Indonesia.
- Jangan membuat dokumentasi spekulatif; semua isi harus berasal dari kode, schema, route, README, `.agents/AI_CONTEXT.md`, atau file konfigurasi yang ada.
- Jangan menulis secret, token, atau credential asli.
- Jangan menjalankan `prisma migrate deploy`, `prisma db push`, atau command yang menyentuh production database.
- README harus ringkas; detail panjang masuk ke `docs/project/`.
- Gunakan path file aktual dan istilah role aktual: `ADMIN`, `BMC`, `BNM_MANAGER`, `BMS`.
- Dokumentasi UI harus mengikuti kondisi dashboard baru saat ini, termasuk area cabang, notifikasi, PJUM, report detail, preventive, dan timezone UTC/WIB.

---

## File Structure

Dokumentasi baru:

- `docs/project/README.md`
  - Index dokumentasi project.
  - Menjelaskan urutan baca untuk developer baru, operator, dan AI agent.
- `docs/project/01-overview.md`
  - Ringkasan project, role, business goal, dan istilah domain.
- `docs/project/02-architecture.md`
  - Arsitektur Next.js App Router, server actions, auth, Prisma, Google Drive, notifications, dan deployment.
- `docs/project/03-roles-and-access.md`
  - Hak akses per role, branch scope, area scope, dan aturan `HEAD OFFICE`.
- `docs/project/04-workflows.md`
  - Alur laporan maintenance, checklist preventif, PJUM, intervensi, notifikasi, dan realisasi.
- `docs/project/05-routes-and-ui.md`
  - Route utama, halaman dashboard, pola UI/UX, tabel, filter, dan detail laporan.
- `docs/project/06-database.md`
  - Model utama, relasi penting, timestamp, migration, index, dan prinsip Prisma.
- `docs/project/07-integrations-and-env.md`
  - Env, Google Drive, Gmail, Drive proxy/CDN, Web Push, UploadThing legacy, cron.
- `docs/project/08-operations.md`
  - Setup lokal, deploy Render/Docker, backup, migration safety, troubleshooting Aiven, scripts.
- `docs/project/09-testing-and-verification.md`
  - Cara verifikasi docs, TypeScript, lint, helper specs, dan browser checks.

Dokumentasi yang dimodifikasi:

- `README.md`
  - Dijadikan ringkas, berisi overview, quickstart, link ke `docs/project/`.
- `.agents/AI_CONTEXT.md`
  - Diperbarui agar menjadi konteks AI ringkas dan mengarahkan agent ke docs detail.

---

### Task 1: Audit Sumber Dokumentasi Aktual

**Files:**
- Read: `README.md`
- Read: `.agents/AI_CONTEXT.md`
- Read: `prisma/schema.prisma`
- Read: `package.json`
- Read: `render.yaml`
- Read: `prisma.config.ts`
- Read: `lib/authorization.ts`
- Read: `lib/admin-branch-scope.ts`
- Read: `lib/report-status.ts`
- Read: `lib/pjum-status.ts`
- Read: `lib/prisma.ts`
- Read: `lib/notifications/*`
- Read: `app/dashboard/**/page.tsx`
- Read: `app/dashboard/**/actions.ts`
- Read: `app/reports/**/page.tsx`
- Create: `docs/project/.audit-notes.md`

**Interfaces:**
- Consumes: current repository files.
- Produces: `docs/project/.audit-notes.md` as temporary checklist for later tasks.

- [ ] **Step 1: Create audit folder**

Run:

```bash
mkdir -p docs/project
```

Expected: `docs/project/` exists.

- [ ] **Step 2: List routes and action files**

Run:

```bash
rg -n "export default async function|export async function|revalidatePath|redirect\\(" app lib prisma package.json render.yaml > docs/project/.audit-notes.md
```

Expected: `.audit-notes.md` contains route/action references.

- [ ] **Step 3: Append schema model list**

Run:

```bash
rg -n "^model |^enum " prisma/schema.prisma >> docs/project/.audit-notes.md
```

Expected: model and enum names are appended.

- [ ] **Step 4: Append env references**

Run:

```bash
rg -n "process\\.env\\.|NEXT_PUBLIC_|DATABASE_|GOOGLE_|DRIVE_|VAPID|CRON_SECRET|MAINTENANCE_MODE" . --glob "!node_modules/**" --glob "!.next/**" >> docs/project/.audit-notes.md
```

Expected: env references are appended.

- [ ] **Step 5: Commit audit notes only if useful**

Do not commit `.audit-notes.md` if it contains noisy implementation snippets. It can be deleted after final docs are written.

Run:

```bash
git status --short docs/project/.audit-notes.md
```

Expected: file exists for local reference.

---

### Task 2: Create Documentation Index and Overview

**Files:**
- Create: `docs/project/README.md`
- Create: `docs/project/01-overview.md`

**Interfaces:**
- Consumes: `README.md`, `.agents/AI_CONTEXT.md`, `docs/project/.audit-notes.md`.
- Produces: stable docs entrypoint used by later README and AI_CONTEXT tasks.

- [ ] **Step 1: Create `docs/project/README.md`**

Write:

```markdown
# Dokumentasi Project SPARTA Maintenance

Dokumentasi ini adalah rujukan detail untuk developer, operator, dan AI agent yang bekerja di project SPARTA Maintenance.

## Urutan Baca

Untuk developer baru:

1. [Overview](./01-overview.md)
2. [Architecture](./02-architecture.md)
3. [Roles and Access](./03-roles-and-access.md)
4. [Workflows](./04-workflows.md)
5. [Routes and UI](./05-routes-and-ui.md)
6. [Database](./06-database.md)
7. [Integrations and Env](./07-integrations-and-env.md)
8. [Operations](./08-operations.md)
9. [Testing and Verification](./09-testing-and-verification.md)

Untuk operator production:

1. [Integrations and Env](./07-integrations-and-env.md)
2. [Operations](./08-operations.md)
3. [Database](./06-database.md)

Untuk AI agent:

1. Baca `.agents/AI_RULES.md`.
2. Baca `.agents/AI_CONTEXT.md`.
3. Baca dokumen di folder ini sesuai area perubahan.
4. Baca file implementasi aktual sebelum mengubah kode.

## Prinsip Dokumentasi

- README root hanya ringkasan.
- Detail teknis berada di folder ini.
- Jika kode berubah, update dokumen yang relevan pada commit yang sama.
- Jangan menyimpan secret atau credential asli di dokumentasi.
```

- [ ] **Step 2: Create `docs/project/01-overview.md`**

Write:

```markdown
# Overview

SPARTA Maintenance adalah aplikasi internal untuk pelaporan maintenance toko, checklist kondisi, checklist preventif, approval berjenjang, realisasi biaya, arsip PDF, PJUM, dan notifikasi proses bisnis.

## Tujuan Bisnis

- BMS membuat dan menyelesaikan laporan maintenance toko.
- BMC melakukan review estimasi, penyelesaian pekerjaan, dan membuat PJUM.
- BNM Manager melakukan final approval laporan dan approval PJUM.
- Admin memantau data global, mengelola master data, dan melakukan intervensi pada laporan selesai jika ada kebutuhan koreksi resmi.

## Role Utama

| Role | Fokus |
| --- | --- |
| `BMS` | Membuat laporan, mengisi checklist, estimasi, mulai kerja, dan submit penyelesaian. |
| `BMC` | Review pekerjaan dan PJUM dalam scope cabang/area. |
| `BNM_MANAGER` | Final approval laporan dan approval PJUM dalam scope cabang/area. |
| `ADMIN` | Monitoring global, master data, settings, intervensi, dan operasional sistem. |

## Istilah Domain

| Istilah | Arti |
| --- | --- |
| Laporan maintenance | Laporan kondisi toko dan pekerjaan perbaikan. |
| Checklist kondisi | Checklist item kondisi toko, termasuk foto dan catatan. |
| Preventif | Checklist berkala per triwulan untuk memastikan toko sudah dicek. |
| Estimasi | Rencana biaya/material sebelum pekerjaan. |
| Realisasi | Biaya/material aktual setelah pekerjaan. |
| PJUM | Pertanggungjawaban uang muka BMS. |
| Area cabang | Sub-scope lama seperti BALARAJA/SERANG yang tetap dipakai setelah cabang digabung. |
| Branch scope | Cabang utama yang boleh diakses user non-admin. |
| `HEAD OFFICE` | Cabang development/testing yang dikecualikan dari tampilan global production admin. |

## Kondisi Dashboard Saat Ini

- `ADMIN`, `BMC`, dan `BNM_MANAGER` memakai dashboard baru.
- `BMS` tetap memakai workflow operasional lama pada route `/reports`.
- UI dashboard baru dibuat compact, table-first, dan menghindari card berlebihan.
- Status laporan dan status PJUM harus memakai label global dari `lib/report-status.ts` dan `lib/pjum-status.ts`.
```

- [ ] **Step 3: Verify links**

Run:

```bash
rg -n "\\]\\(\\.\\/.*\\.md\\)" docs/project/README.md
```

Expected: all linked docs are listed. Missing target files are allowed until later tasks complete.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/project/README.md docs/project/01-overview.md
git commit -m "docs: add project documentation overview"
```

Expected: commit succeeds.

---

### Task 3: Document Architecture and Role Access

**Files:**
- Create: `docs/project/02-architecture.md`
- Create: `docs/project/03-roles-and-access.md`

**Interfaces:**
- Consumes: `lib/authorization.ts`, `lib/admin-branch-scope.ts`, `components/app-sidebar.tsx`, `app/dashboard/_components/*`, `proxy.ts`, `prisma/schema.prisma`.
- Produces: architecture and permission reference for feature work.

- [ ] **Step 1: Create `02-architecture.md`**

Write:

```markdown
# Architecture

## Runtime

Project memakai Next.js 16 App Router dengan React Server Components, Server Actions, dan route handlers.

Layer utama:

| Layer | File/Folder | Fungsi |
| --- | --- | --- |
| App Router | `app/` | Route, page, layout, server actions, route handlers. |
| Shared UI | `components/` | Sidebar, dialog, shadcn/ui wrapper, komponen lintas route. |
| Domain helpers | `lib/` | Auth, Prisma, status label, PDF, Google Drive, notifications, settings. |
| Database | `prisma/schema.prisma` | Model, enum, index, migration source. |
| Scripts | `scripts/` | Import, backup, cleanup, migration helper, utility CLI. |

## Request Flow

1. User membuka route.
2. Middleware/proxy memvalidasi session dan maintenance mode.
3. Page server component mengambil auth user dari `lib/authorization.ts`.
4. Query/action memvalidasi role dan branch/area scope.
5. Prisma membaca/menulis PostgreSQL.
6. Mutasi penting menulis `ActivityLog`, `ApprovalLog`, atau `Notification`.
7. UI direvalidasi dengan `revalidatePath` jika diperlukan.

## Auth

- Session disimpan dalam cookie httpOnly.
- Helper utama ada di `lib/session.ts` dan `lib/authorization.ts`.
- Role utama: `BMS`, `BMC`, `BNM_MANAGER`, `ADMIN`.
- `BRANCH_ADMIN` ada di schema tetapi bukan role login utama saat ini.

## Database Access

- Runtime Prisma memakai `lib/prisma.ts`.
- Prisma CLI memakai `prisma.config.ts`.
- `DATABASE_URL` dipakai runtime.
- `DIRECT_URL` dipakai migrasi jika tersedia.
- Timezone koneksi runtime dipaksa UTC melalui option PostgreSQL.

## Integrations

| Integrasi | Fungsi |
| --- | --- |
| Google Drive API | Arsip PDF report/PJUM. |
| Drive CDN/proxy | Foto report dan dokumentasi. |
| Gmail OAuth2 | Email notifikasi/OTP jika dipakai flow terkait. |
| Web Push | Native notification untuk PWA. |
| UploadThing | Handler legacy; jangan dipakai untuk fitur baru kecuali masih dibutuhkan route lama. |

## Deployment

- Production memakai Docker standalone Next.js di Render.
- Health check: `/api/health`.
- Migration production dijalankan dengan `npx prisma migrate deploy`.
- Jangan menjalankan migration terhadap database production dari branch lokal tanpa memastikan target env.
```

- [ ] **Step 2: Create `03-roles-and-access.md`**

Write:

```markdown
# Roles and Access

## Ringkasan Role

| Role | Scope | Akses Utama |
| --- | --- | --- |
| `BMS` | Laporan miliknya sendiri. | Buat laporan, checklist, estimasi, mulai kerja, submit penyelesaian. |
| `BMC` | `branchNames` dan `areaNames` miliknya. | Review laporan, buat PJUM, master data scoped cabang, aktivitas scoped. |
| `BNM_MANAGER` | `branchNames` dan `areaNames` miliknya. | Final approval laporan, approval PJUM, monitoring cabang. |
| `ADMIN` | Global production, kecuali `HEAD OFFICE` pada tampilan global. | Semua dashboard, master data, settings, intervensi. |

## Branch Scope

- Field user: `branchNames`.
- Field store/report/PJUM: `branchName`.
- User non-admin hanya boleh melihat data dalam `branchNames`.
- `ADMIN` melihat global production.

## Area Scope

- Field user: `areaNames`.
- Field store/report: `areaName`.
- Field PJUM: `areaNames`.
- Jika user punya `areaNames`, filter area muncul di halaman terkait.
- Jika tidak punya `areaNames`, filter area tidak muncul dan akses kembali ke branch scope utama.
- Notifikasi tidak punya UI filter; recipient difilter berdasarkan area entity jika tersedia, fallback ke branch jika tidak ada area.

## HEAD OFFICE

`HEAD OFFICE` adalah data development/testing.

Aturan:

- Tampilan global `ADMIN` mengecualikan `HEAD OFFICE`.
- User non-admin yang scoped ke `HEAD OFFICE` tetap bisa melihat data miliknya.
- Action destructive oleh `ADMIN` terhadap data `HEAD OFFICE` harus ditolak.

## Route Access

| Route | BMS | BMC | BNM_MANAGER | ADMIN |
| --- | --- | --- | --- | --- |
| `/dashboard` | Ya | Ya | Ya | Ya |
| `/reports/[reportNumber]` | Ya | Redirect ke dashboard detail | Redirect ke dashboard detail | Redirect ke dashboard detail |
| `/dashboard/reports` | Tidak | Ya | Ya | Ya |
| `/dashboard/reports/[reportNumber]` | Tidak | Ya | Ya | Ya |
| `/dashboard/pjum` | Tidak | Ya | Ya | Ya |
| `/dashboard/preventive` | Tidak | Ya | Tidak, kecuali diminta lagi | Ya |
| `/dashboard/users` | Tidak | Ya, scoped | Tidak | Ya |
| `/dashboard/stores` | Tidak | Ya, scoped | Tidak | Ya |
| `/dashboard/settings` | Tidak | Tidak | Tidak | Ya |

## Prinsip Mutating Action

1. Ambil auth user.
2. Validasi role.
3. Validasi branch/area scope.
4. Validasi input.
5. Jalankan transaksi jika menyentuh banyak tabel.
6. Tulis log aktivitas/approval/notifikasi jika relevan.
7. Revalidate route terkait.
```

- [ ] **Step 3: Verify terms exist in code**

Run:

```bash
rg -n "areaNames|branchNames|HEAD OFFICE|BNM_MANAGER|BMC|BMS|ADMIN" lib app components prisma/schema.prisma
```

Expected: references exist.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/project/02-architecture.md docs/project/03-roles-and-access.md
git commit -m "docs: document architecture and role access"
```

Expected: commit succeeds.

---

### Task 4: Document Workflows

**Files:**
- Create: `docs/project/04-workflows.md`

**Interfaces:**
- Consumes: `prisma/schema.prisma`, `app/reports/actions/*`, `app/dashboard/reports/**`, `app/dashboard/pjum/**`, `app/dashboard/preventive/**`, `lib/notifications/*`.
- Produces: workflow reference for reports, PJUM, preventive, intervention, notifications, and realization.

- [ ] **Step 1: Create `04-workflows.md`**

Write:

```markdown
# Workflows

## Laporan Maintenance

Status normal:

```text
DRAFT
  -> PENDING_ESTIMATION
  -> ESTIMATION_APPROVED
  -> IN_PROGRESS
  -> PENDING_REVIEW
  -> APPROVED_BMC
  -> COMPLETED
```

Status revisi/penolakan:

- `ESTIMATION_REJECTED_REVISION`
- `ESTIMATION_REJECTED`
- `REVIEW_REJECTED_REVISION`

Timestamp penting:

| Field | Arti UI |
| --- | --- |
| `createdAt` | Laporan dibuat. |
| `updatedAt` | Row database berubah; jangan dijadikan satu-satunya "update laporan" jika ada ActivityLog. |
| `ActivityLog.createdAt` | Sumber utama riwayat dan update laporan. |
| `finishedAt` | Final approval BNM, status menjadi `COMPLETED`. |
| `pjumExportedAt` | Laporan sudah masuk/export PJUM. |

## Approval

| Tahap | Actor | Target Status |
| --- | --- | --- |
| Submit estimasi | BMS | `PENDING_ESTIMATION` |
| Approve estimasi | BMC | `ESTIMATION_APPROVED` |
| Mulai pekerjaan | BMS | `IN_PROGRESS` |
| Submit penyelesaian | BMS | `PENDING_REVIEW` |
| Approve pekerjaan | BMC | `APPROVED_BMC` |
| Final approval | BNM_MANAGER | `COMPLETED` |

## Review Gate

Saat status `PENDING_REVIEW` atau `APPROVED_BMC`, reviewer wajib membuka fitur bandingkan nota dan foto item pekerjaan sebelum tombol approval bisa digunakan jika ada item pekerjaan BMS.

Jika tidak ada item pekerjaan BMS, reviewer boleh langsung approve.

## PJUM

Status:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

Alur:

1. BMC memilih periode.
2. Sistem menampilkan laporan periode berdasarkan `finishedAt`.
3. BMC memilih laporan valid.
4. BMC membuat PJUM.
5. BNM Manager approve/reject.
6. Saat approved, PDF final dapat dilihat dari detail PJUM.

Aturan biaya:

- Laporan Rp 0 tanpa item pekerjaan BMS tidak wajib PJUM.
- Laporan Rp 0 tetapi memiliki item pekerjaan BMS tetap wajib PJUM.
- UI tidak boleh memberi label misleading "belum PJUM" untuk laporan yang memang tidak wajib PJUM.

## Preventive

- Target: setiap toko checklist preventif minimal satu kali per triwulan.
- Hanya report preventif status `COMPLETED` yang dihitung.
- Report preventif aktif/belum selesai tidak dihitung.
- Export preventive menyediakan pilihan triwulan dan semua triwulan.

## Intervensi Laporan

Intervensi hanya untuk `ADMIN`.

Tujuan:

- Mengubah data laporan yang sudah `COMPLETED`.
- Digunakan untuk koreksi resmi dengan alasan/BAP.

Route:

- `/dashboard/reports/[reportNumber]/intervensi`

## Notifikasi

Notifikasi dibuat saat proses bisnis berjalan, seperti submit laporan, approval, reject, PJUM dibuat, PJUM approved/rejected, dan intervensi.

Recipient:

- BMS menerima update laporan/PJUM miliknya.
- BMC menerima laporan/PJUM dalam scope branch/area.
- BNM Manager menerima approval final/PJUM dalam scope branch/area.
- Jika entity punya area, recipient difilter berdasarkan area.
- Jika entity tidak punya area, recipient fallback ke branch.

## Realisasi

Analisis realisasi dipakai untuk melihat kecukupan uang muka BMS.

Metrik penting:

- Total realisasi.
- Tren realisasi bulanan.
- Rata-rata realisasi per BMS per minggu per cabang.
- Data tetap ditampilkan sebagai agregat cabang, bukan tabel per BMS terpisah.
```

- [ ] **Step 2: Verify enum names**

Run:

```bash
rg -n "enum ReportStatus|enum PjumStatus|PENDING_REVIEW|APPROVED_BMC|PENDING_APPROVAL" prisma/schema.prisma app lib
```

Expected: documented enum names match code.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/project/04-workflows.md
git commit -m "docs: document business workflows"
```

Expected: commit succeeds.

---

### Task 5: Document Routes and UI

**Files:**
- Create: `docs/project/05-routes-and-ui.md`

**Interfaces:**
- Consumes: `app/dashboard/**`, `app/reports/**`, `components/app-sidebar.tsx`, `lib/report-status.ts`, `lib/pjum-status.ts`, `.agents/AI_RULES.md`.
- Produces: route and UI reference for future dashboard work.

- [ ] **Step 1: Create `05-routes-and-ui.md`**

Write:

```markdown
# Routes and UI

## Route Utama

| Route | Role | Fungsi |
| --- | --- | --- |
| `/dashboard` | Semua role | Dashboard sesuai role. |
| `/dashboard/reports` | `ADMIN`, `BMC`, `BNM_MANAGER` | List laporan dashboard. |
| `/dashboard/reports/[reportNumber]` | `ADMIN`, `BMC`, `BNM_MANAGER` | Detail laporan dashboard. |
| `/dashboard/reports/[reportNumber]/intervensi` | `ADMIN` | Koreksi laporan selesai. |
| `/reports/[reportNumber]` | `BMS` | Detail laporan operasional BMS. |
| `/reports/(bms)/create` | `BMS` | Buat laporan. |
| `/reports/(bms)/start-work` | `BMS` | Mulai pekerjaan. |
| `/reports/(bms)/complete` | `BMS` | Submit penyelesaian. |
| `/dashboard/pjum` | `ADMIN`, `BMC`, `BNM_MANAGER` | List PJUM. |
| `/dashboard/pjum/[id]` | `ADMIN`, `BMC`, `BNM_MANAGER` | Detail PJUM. |
| `/dashboard/preventive` | `ADMIN`, `BMC` | Coverage checklist preventif. |
| `/dashboard/branches` | `ADMIN`, `BMC`, `BNM_MANAGER` | Performa cabang. |
| `/dashboard/realisasi` | `ADMIN` | Analisis realisasi. |
| `/dashboard/users` | `ADMIN`, `BMC` | Master user; BMC scoped. |
| `/dashboard/stores` | `ADMIN`, `BMC` | Master toko; BMC scoped. |
| `/dashboard/activity` | `ADMIN`, `BMC` | Aktivitas; BMC scoped. |
| `/dashboard/settings` | `ADMIN` | Settings sistem. |

## Pola UI Dashboard

- Compact.
- Table-first untuk data panjang.
- Hindari card berlebihan.
- Link tabel hanya pada field utama seperti nomor laporan, ID PJUM, nama/NIK BMS.
- Gunakan global label status dari `lib/report-status.ts` dan `lib/pjum-status.ts`.
- Gunakan shadcn/ui sebelum markup custom.
- Untuk request UI baru, cek komponen shadcn yang tersedia terlebih dahulu sesuai `.agents/AI_RULES.md`.

## Dashboard Reports

Tabel:

- Infinite scroll.
- Quick filter berbentuk pill.
- Filter status, SLA, branch, area, PJUM.
- Nomor laporan saja yang menjadi link detail.
- Status laporan dan status PJUM dipisah.
- Jika tidak ada PJUM, tampilkan `-`.
- Jika tidak ada SLA, tampilkan `-`.
- Area cabang tampil sebagai label jika tersedia.

Detail:

- Header ringkas.
- Tabs sticky di bawah header dashboard.
- Checklist compact dan urut A sampai I.
- Pekerjaan dan biaya hanya item rusak/diperbaiki yang dikerjakan BMS.
- Toko material dipisah dari item.
- Dokumentasi foto punya loading state agar tidak terlihat hitam saat belum load.
- Role BMC/BNM tidak melihat tab aksi hapus.

## Dashboard PJUM

- Tabel PJUM compact.
- Quick filter seperti dashboard reports.
- Filter branch dan area.
- Tidak ada kolom dokumen.
- Dokumen dilihat dari detail PJUM.
- Detail hanya menampilkan tombol PDF yang relevan.

## Master Data User dan Toko

- `ADMIN` CRUD global.
- `BMC` CRUD scoped cabang/area.
- Filter area hanya muncul jika user punya `areaNames`.
- Row user menampilkan daftar area user.
- Row toko menampilkan area toko.

## Mobile

- Profile dan notifikasi di site header disembunyikan pada mobile jika mengganggu ruang.
- Breadcrumb mobile memakai ellipsis jika item lebih dari satu.
- Bottom approval bar tidak boleh menutup konten terakhir; beri padding bawah pada container halaman terkait.
```

- [ ] **Step 2: Verify route paths**

Run:

```bash
rg -n "dashboard/reports|dashboard/pjum|dashboard/preventive|dashboard/users|dashboard/stores|dashboard/settings|reports/\\[reportNumber\\]" app components
```

Expected: route references exist.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/project/05-routes-and-ui.md
git commit -m "docs: document routes and UI patterns"
```

Expected: commit succeeds.

---

### Task 6: Document Database

**Files:**
- Create: `docs/project/06-database.md`

**Interfaces:**
- Consumes: `prisma/schema.prisma`, `prisma/migrations/*`, `prisma.config.ts`, `lib/prisma.ts`.
- Produces: database and migration reference.

- [ ] **Step 1: Create `06-database.md`**

Write:

```markdown
# Database

## Datasource

- Database: PostgreSQL.
- ORM: Prisma 7.
- Schema source: `prisma/schema.prisma`.
- Prisma CLI datasource: `prisma.config.ts`.
- Runtime Prisma client: `lib/prisma.ts`.

## Model Utama

| Model | Fungsi |
| --- | --- |
| `User` | Akun, role, branch scope, area scope, password, soft delete. |
| `Store` | Data toko, cabang, area. |
| `Report` | Laporan maintenance, checklist, estimasi, realisasi, status, foto, PDF. |
| `ApprovalLog` | Catatan approval/rejection. |
| `ActivityLog` | Timeline aktivitas laporan. |
| `PjumExport` | Dokumen PJUM, status approval, daftar report, area. |
| `Notification` | Notifikasi in-app. |
| `PushSubscription` | Subscription Web Push user. |
| `UserPresence` | Online dan aktif hari ini. |
| `AppSetting` | Maintenance mode, SLA, policy. |
| `GoogleDriveFolderCache` | Cache folder Drive. |

## Scope Fields

| Field | Model | Fungsi |
| --- | --- | --- |
| `branchNames` | `User` | Cabang utama yang bisa diakses user. |
| `areaNames` | `User` | Area cabang lama yang bisa difilter user. |
| `branchName` | `Store`, `Report`, `PjumExport` | Cabang utama data. |
| `areaName` | `Store`, `Report` | Area spesifik data. |
| `areaNames` | `PjumExport` | Area yang tercakup dalam satu PJUM. |

## Timestamp

Prinsip:

- Simpan instant waktu sebagai UTC di database.
- Tampilkan waktu ke user dalam WIB.
- Export XLSX harus menampilkan waktu WIB.

Field penting report:

| Field | Arti |
| --- | --- |
| `createdAt` | Laporan dibuat. |
| `updatedAt` | Row diupdate Prisma. |
| `finishedAt` | Final approval BNM. |
| `pjumExportedAt` | Sudah masuk/export PJUM. |

## Migration

Aturan:

- Gunakan `npx prisma migrate dev --name <name>` untuk development.
- Gunakan `npx prisma migrate deploy` untuk staging/production.
- Jangan gunakan `prisma db push` untuk database bersama.
- Branch git tidak memisahkan database; selalu cek `DATABASE_URL` dan `DIRECT_URL`.

## Aiven Troubleshooting

Jika Prisma CLI gagal dengan `P1001` tetapi koneksi app/runtime berhasil:

1. Cek port:

```powershell
Test-NetConnection <host-aiven> -Port <port>
```

2. Cek IPv4:

```powershell
Resolve-DnsName <host-aiven> -Type A
```

3. Jika WiFi memblok port, pakai hotspot/VPN atau jalankan command dari cloud.

## Index

Index harus mengikuti query dashboard:

- Report branch/status/date.
- Report area/status jika area scope dipakai.
- Store branch/code/area.
- PjumExport status/branch/area/date.
- ActivityLog report/actor/createdAt.

Sebelum menambah index:

1. Cari query dengan `rg`.
2. Pastikan query berjalan sering atau lambat.
3. Tambahkan migration.
4. Verifikasi `migrate status` dan query terkait.
```

- [ ] **Step 2: Verify model list**

Run:

```bash
rg -n "^model |^enum " prisma/schema.prisma
```

Expected: documented model names match schema.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/project/06-database.md
git commit -m "docs: document database model and migration rules"
```

Expected: commit succeeds.

---

### Task 7: Document Integrations, Env, and Operations

**Files:**
- Create: `docs/project/07-integrations-and-env.md`
- Create: `docs/project/08-operations.md`

**Interfaces:**
- Consumes: `README.md`, `package.json`, `render.yaml`, `Dockerfile`, `scripts/*`, `lib/google-drive/*`, `lib/notifications/*`, `app/api/**`.
- Produces: operations-ready docs.

- [ ] **Step 1: Create `07-integrations-and-env.md`**

Write:

```markdown
# Integrations and Env

## Environment Variables

| Env | Fungsi |
| --- | --- |
| `DATABASE_URL` | Runtime database connection. |
| `DIRECT_URL` | Direct database connection untuk Prisma CLI/migration. |
| `SESSION_SECRET` | Secret session cookie. |
| `APP_BASE_URL` | Base URL server-side. |
| `NEXT_PUBLIC_APP_URL` | Base URL client-side. |
| `DATABASE_POOL_MAX` | Maksimum koneksi pool runtime. |
| `DATABASE_IDLE_TIMEOUT_MS` | Timeout koneksi idle pool. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Timeout membuka koneksi DB. |
| `GOOGLE_CLIENT_ID` | Google OAuth client. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret. |
| `GOOGLE_REFRESH_TOKEN` | Refresh token Drive/Gmail. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root folder arsip PDF. |
| `DRIVE_CDN_CLIENT_ID` | OAuth client untuk Drive CDN/proxy foto. |
| `DRIVE_CDN_CLIENT_SECRET` | OAuth secret Drive CDN. |
| `DRIVE_CDN_REFRESH_TOKEN` | Refresh token Drive CDN. |
| `DRIVE_CDN_ROOT_FOLDER_ID` | Root folder foto. |
| `DRIVE_CDN_SHARE_MODE` | Mode share file Drive CDN. |
| `CRON_SECRET` | Secret endpoint cron. |
| `MAINTENANCE_MODE` | Hard override maintenance mode. |
| `NEXT_PUBLIC_NOTIFICATIONS_ENABLED` | Enable UI notifikasi. |
| `NEXT_PUBLIC_WEB_PUSH_ENABLED` | Enable Web Push client. |
| `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED` | Paksa gate notifikasi jika enabled. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key. |
| `VAPID_PRIVATE_KEY` | Private VAPID key. |
| `VAPID_SUBJECT` | Subject Web Push. |

## Google Drive

- PDF report dan PJUM diarsipkan ke Google Drive.
- Foto memakai Drive CDN/proxy agar file perusahaan bisa diakses aplikasi.
- Jangan menghapus file final Drive tanpa memastikan field database tidak lagi dipakai.

## Gmail

Nodemailer dan Gmail OAuth2 dipakai untuk email jika flow terkait aktif.

## Web Push

- PWA mendukung native notification.
- Subscription disimpan per user.
- Browser tertentu bisa memblok Web Push atau permission prompt.
- Jangan menyalakan gate required di production sebelum service worker dan VAPID valid.

## UploadThing Legacy

UploadThing masih ada sebagai handler legacy. Jangan jadikan dependency fitur baru jika Google Drive flow sudah memenuhi kebutuhan.
```

- [ ] **Step 2: Create `08-operations.md`**

Write:

```markdown
# Operations

## Setup Lokal

```bash
npm install
npm run db:generate
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Migration

Development:

```bash
npx prisma migrate dev --name <migration_name>
```

Production/staging:

```bash
npx prisma migrate deploy
```

Jangan menjalankan command migration sebelum memastikan target `DATABASE_URL` atau `DIRECT_URL`.

## Render

- Deploy memakai Docker standalone.
- Health check: `/api/health`.
- Jika env berubah, redeploy service.

## Backup

Gunakan script backup yang tersedia:

```bash
npm run backup:db
```

Simpan backup sebelum migration destructive atau script data massal.

## Script Penting

| Command | Fungsi |
| --- | --- |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:seed` | Seed data awal. |
| `npm run create-user` | Buat user CLI. |
| `npm run backup:db` | Backup database. |
| `npm run cleanup:pending` | Cleanup laporan pending lama. |
| `npm run cleanup-photos` | Dry-run cleanup foto. |
| `npm run cleanup-photos:execute` | Execute cleanup foto. |
| `npx tsx scripts/merge-branch-scopes.ts --self-test` | Self-test script merge cabang/area. |
| `npx tsx scripts/merge-branch-scopes.ts --execute` | Execute merge cabang/area. |

## Troubleshooting Cepat

### Prisma P1001 ke Aiven

1. Cek port:

```powershell
Test-NetConnection <host> -Port <port>
```

2. Coba hotspot/VPN jika WiFi memblok outbound port.

3. Jika hostname bermasalah karena IPv6, cek IPv4:

```powershell
Resolve-DnsName <host> -Type A
```

### Server Action Not Found

Biasanya stale client setelah deploy. Refresh halaman atau pastikan user tidak memakai bundle lama.

### Too Many Connections

Cek `DATABASE_POOL_MAX`, jumlah instance Render, dan query fan-out. Jangan langsung menaikkan pool tanpa menghitung limit database.
```

- [ ] **Step 3: Verify env references**

Run:

```bash
rg -n "process\\.env\\.|NEXT_PUBLIC_|VAPID|GOOGLE_|DRIVE_|DATABASE_|CRON_SECRET|MAINTENANCE_MODE" . --glob "!node_modules/**" --glob "!.next/**"
```

Expected: docs cover active env names.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/project/07-integrations-and-env.md docs/project/08-operations.md
git commit -m "docs: document integrations and operations"
```

Expected: commit succeeds.

---

### Task 8: Document Testing and Update Entry Points

**Files:**
- Create: `docs/project/09-testing-and-verification.md`
- Modify: `README.md`
- Modify: `.agents/AI_CONTEXT.md`
- Delete: `docs/project/.audit-notes.md` if it was created and is noisy.

**Interfaces:**
- Consumes: all docs created in previous tasks.
- Produces: final documentation entrypoints.

- [ ] **Step 1: Create `09-testing-and-verification.md`**

Write:

```markdown
# Testing and Verification

## Verifikasi Umum

Gunakan verifikasi paling kecil yang relevan dengan perubahan.

| Perubahan | Command |
| --- | --- |
| TypeScript/domain helper | `npx tsc --noEmit` |
| Lint file tertentu | `npx eslint <file>` |
| Prisma schema | `npx prisma generate` |
| Script merge area | `npx tsx scripts/merge-branch-scopes.ts --self-test` |
| Notifikasi recipient | `npx tsx lib/notifications/recipients.spec.ts` |
| Realisasi helper | `npx tsx lib/realisasi.spec.ts` |
| Build production | `npm run build` |

## Verifikasi UI

Untuk perubahan UI:

1. Jalankan dev server.
2. Buka route terkait.
3. Cek desktop dan mobile.
4. Pastikan tidak ada overflow horizontal.
5. Pastikan tabel compact dan vertical align center.
6. Pastikan status memakai label global.
7. Pastikan loading foto tidak terlihat hitam/misleading.

## Verifikasi Docs

Untuk perubahan dokumentasi:

```bash
rg -n "TODO|TBD|lorem|placeholder" README.md docs/project .agents/AI_CONTEXT.md
```

Expected: tidak ada placeholder tidak sengaja.

```bash
rg -n "\\]\\(" README.md docs/project .agents/AI_CONTEXT.md
```

Expected: link relatif masuk akal.

## Prinsip

- Jangan menjalankan migration production sebagai bagian dari verifikasi docs.
- Jangan menjalankan script destructive tanpa `--dry-run` atau konfirmasi eksplisit.
- Jika test tidak dijalankan, sebutkan alasannya di final response.
```

- [ ] **Step 2: Update root `README.md`**

Replace long detailed sections with:

```markdown
# SPARTA Maintenance

SPARTA Maintenance adalah aplikasi internal untuk pelaporan maintenance toko, approval berjenjang, checklist preventif, realisasi biaya, arsip PDF, PJUM, dan notifikasi proses bisnis.

## Dokumentasi

Dokumentasi detail tersedia di [docs/project](docs/project/README.md).

Mulai dari:

- [Overview](docs/project/01-overview.md)
- [Architecture](docs/project/02-architecture.md)
- [Roles and Access](docs/project/03-roles-and-access.md)
- [Workflows](docs/project/04-workflows.md)
- [Operations](docs/project/08-operations.md)

## Quickstart

```bash
npm install
npm run db:generate
npm run dev
```

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Prisma 7
- PostgreSQL
- Google Drive API
- Render

## License

Proprietary. Internal asset of PT Sumber Alfaria Trijaya, Tbk.
```

Keep badges if desired, but avoid duplicating every detail from `docs/project/`.

- [ ] **Step 3: Update `.agents/AI_CONTEXT.md`**

Add near the top:

```markdown
## Dokumentasi Detail

Sebelum mengubah area besar project, baca dokumentasi detail yang relevan:

- `docs/project/README.md`
- `docs/project/02-architecture.md`
- `docs/project/03-roles-and-access.md`
- `docs/project/04-workflows.md`
- `docs/project/05-routes-and-ui.md`
- `docs/project/06-database.md`
- `docs/project/08-operations.md`

Dokumen ini tetap menjadi konteks cepat untuk AI agent. Detail panjang hidup di `docs/project/`.
```

- [ ] **Step 4: Remove audit notes if noisy**

Run:

```bash
rm docs/project/.audit-notes.md
```

Skip if the file was intentionally kept and contains no sensitive/noisy content.

- [ ] **Step 5: Verify placeholders**

Run:

```bash
rg -n "TODO|TBD|lorem|placeholder" README.md docs/project .agents/AI_CONTEXT.md
```

Expected: no accidental placeholders.

- [ ] **Step 6: Verify docs links**

Run:

```bash
rg -n "\\]\\(" README.md docs/project .agents/AI_CONTEXT.md
```

Expected: links point to existing local docs or intentional external references.

- [ ] **Step 7: Commit**

Run:

```bash
git add README.md .agents/AI_CONTEXT.md docs/project
git commit -m "docs: add complete Indonesian project documentation"
```

Expected: commit succeeds.

---

## Self-Review

Spec coverage:

- Ringkasan project: Task 2.
- Arsitektur: Task 3.
- Role dan access scope: Task 3.
- Workflow bisnis: Task 4.
- UI/UX dashboard: Task 5.
- Database dan migration: Task 6.
- Env dan integrasi: Task 7.
- Operasional dan troubleshooting: Task 7.
- Testing dan verifikasi: Task 8.
- Entry point README dan AI_CONTEXT: Task 8.

Placeholder scan:

- Plan tidak memakai `TBD`.
- Kata `placeholder` hanya muncul dalam command verifikasi untuk mencari placeholder.

Type/path consistency:

- Semua path docs memakai `docs/project/`.
- Plan disimpan di `docs/superpowers/plans/2026-07-03-project-documentation.md`.

Plan complete and saved to `docs/superpowers/plans/2026-07-03-project-documentation.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks.
2. Inline Execution - execute tasks in this session with checkpoints.

Which approach?
