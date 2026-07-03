# AI_CONTEXT - SPARTA Maintenance

Dokumen ini adalah konteks kerja untuk AI agent dan developer saat mengubah project SPARTA Maintenance. Gunakan ini sebagai baseline sebelum membaca file implementasi terbaru.

Last updated: 03 Jul 2026

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

## 1. Ringkasan Project

SPARTA Maintenance adalah aplikasi internal untuk laporan maintenance toko, checklist kondisi, checklist preventif, estimasi, realisasi, approval BMC/BNM, arsip PDF Google Drive, dan PJUM.

Project sedang berada di fase perombakan dashboard:

- `ADMIN` memakai dashboard baru.
- `BMC` dan `BNM_MANAGER` mulai diarahkan ke dashboard baru dengan branch scope.
- `BMS` tetap memakai workflow operasional lama untuk membuat, mulai kerja, menyelesaikan, dan melihat detail laporan.

Tujuan UI versi sekarang adalah dashboard operasional yang compact, jelas untuk user awam, dan tidak terlalu card-heavy.

## 2. Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix/Base UI |
| Icons/Charts | lucide-react, Tabler Icons, Recharts |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | Session JWT httpOnly cookie, `jose`, `bcryptjs` |
| PDF | `@react-pdf/renderer`, `pdf-lib` |
| Storage | Google Drive API/CDN, UploadThing handler legacy |
| Email | Nodemailer + Gmail OAuth2 |
| Deploy | Docker standalone Next.js, Render |

## 3. Role dan Route Saat Ini

### BMS

- Dashboard ringkas di `/dashboard`, tetapi workflow utama tetap di `/reports`.
- Detail laporan BMS ada di `/reports/[reportNumber]`.
- Jika user non-BMS membuka `/reports/[reportNumber]`, redirect ke `/dashboard/reports/[reportNumber]`.
- BMS hanya boleh melihat dan mengubah laporan yang `createdByNIK`-nya milik dirinya.

Route penting:

- `/reports`
- `/reports/(bms)/create`
- `/reports/(bms)/start-work`
- `/reports/(bms)/complete`
- `/reports/(bms)/revisi/[reportNumber]`
- `/reports/[reportNumber]`

### BMC

- Memakai dashboard baru melalui `ManagerDashboard`.
- Scope data berdasarkan `user.branchNames`.
- Dapat melihat laporan cabang, review estimasi, review penyelesaian, melihat preventive, melihat/membatalkan PJUM cabang, dan melihat performa cabang.

Route dashboard yang relevan:

- `/dashboard`
- `/dashboard/reports`
- `/dashboard/reports/[reportNumber]`
- `/dashboard/preventive`
- `/dashboard/pjum`
- `/dashboard/pjum/[id]`
- `/dashboard/branches`
- `/dashboard/branches/[branchName]`

### BNM_MANAGER

- Memakai dashboard baru melalui `ManagerDashboard`.
- Scope data berdasarkan `user.branchNames`.
- Fokus pada final approval laporan dan approval PJUM.
- Dapat melihat laporan/PJUM/performa cabang sesuai branch scope.

### ADMIN

- Memakai `AdminNewDashboard`.
- Akses global untuk data production, tetapi `HEAD OFFICE` dikecualikan dari tampilan global.
- Menu sidebar admin saat ini menampilkan dashboard, laporan, preventive, PJUM, performa cabang, aktivitas user, user, toko, arsip, settings.
- Menu `Material` dan `Performa BMS` disembunyikan untuk admin versi sekarang.

Route admin penting:

- `/dashboard`
- `/dashboard/reports`
- `/dashboard/reports/[reportNumber]`
- `/dashboard/pjum`
- `/dashboard/pjum/[id]`
- `/dashboard/preventive`
- `/dashboard/branches`
- `/dashboard/branches/[branchName]`
- `/dashboard/realisasi`
- `/dashboard/users`
- `/dashboard/stores`
- `/dashboard/activity`
- `/dashboard/activity/online`
- `/dashboard/settings`
- `/dashboard/intervensi/revisi-laporan`

### BRANCH_ADMIN

- Ada di enum dan data import, tetapi tidak termasuk role login utama saat ini.

## 4. File Penting

### Shell dan Sidebar

- `components/app-sidebar.tsx`
  - Role filtering sidebar.
  - Admin tidak melihat `Performa BMS`.
  - BMC/BNM hanya melihat: Laporan Maintenance, Checklist Preventif, Dokumen PJUM, Performa Cabang.
  - Footer profile berisi Ganti Password dan Logout.
- `app/dashboard/_components/admin/admin-dashboard-shell.tsx`
  - Shell dashboard baru.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`
  - Dashboard utama admin.
- `app/dashboard/_components/manager-dashboard.tsx`
  - Dashboard baru untuk BMC dan BNM.
- `app/dashboard/_components/bmc-dashboard.tsx`
- `app/dashboard/_components/bnm-dashboard.tsx`
- `app/dashboard/_components/bms-dashboard.tsx`

### Data dan Auth

- `lib/authorization.ts`
  - Auth user, role guards, branch access helpers.
- `lib/admin-branch-scope.ts`
  - `EXCLUDED_ADMIN_BRANCH_NAME = "HEAD OFFICE"`.
- `lib/session.ts`
  - Session cookie.
- `lib/app-settings.ts`
  - Maintenance mode setting, SLA laporan, policy PJUM.
- `lib/report-status.ts`
  - Global label/status laporan. UI baru harus memakai ini.
- `lib/pjum-status.ts`
  - Global label/status PJUM.
- `lib/presence.ts`
  - Online user 5 menit terakhir dan user aktif hari ini.

### Dashboard Reports

- `app/dashboard/reports/page.tsx`
- `app/dashboard/reports/actions.ts`
- `app/dashboard/reports/_components/admin-reports-table.tsx`
- `app/dashboard/reports/[reportNumber]/page.tsx`
- `app/dashboard/reports/[reportNumber]/queries.ts`
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`
- `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`
- Detail tabs:
  - `checklist-tab.tsx`
  - `work-cost-tab.tsx`
  - `documentation-tab.tsx`
  - `history-tab.tsx`
  - `actions-tab.tsx`

### BMS Reports

- `app/reports/page.tsx`
- `app/reports/[reportNumber]/page.tsx`
- `app/reports/[reportNumber]/report-detail-view.tsx`
- `app/reports/actions/*.ts`
- `app/reports/(bms)/create/*`
- `app/reports/(bms)/start-work/*`
- `app/reports/(bms)/complete/*`

### PJUM

- `app/dashboard/pjum/page.tsx`
- `app/dashboard/pjum/actions.ts`
- `app/dashboard/pjum/_components/admin-pjum-table.tsx`
- `app/dashboard/pjum/[id]/page.tsx`
- Legacy/operational PJUM:
  - `app/reports/pjum/page.tsx`
  - `app/reports/pjum/[id]/page.tsx`
  - `app/reports/pjum/actions.ts`
  - `app/reports/pjum/approval-actions.ts`

### Preventive, Branches, Realisasi, Settings

- `app/dashboard/preventive/page.tsx`
- `app/dashboard/preventive/actions.ts`
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- `app/dashboard/preventive/_components/export-preventive-dialog.tsx`
- `app/dashboard/branches/page.tsx`
- `app/dashboard/branches/[branchName]/page.tsx`
- `app/dashboard/branches/_components/admin-branches-table.tsx`
- `app/dashboard/realisasi/page.tsx`
- `app/dashboard/realisasi/queries.ts`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/settings/_components/settings-workbench.tsx`
- `app/dashboard/settings/actions.ts`

## 5. Aturan Branch Scope

`HEAD OFFICE` adalah cabang development/testing, bukan cabang production.

Aturan yang harus dijaga:

- Tampilan global `ADMIN` mengecualikan `HEAD OFFICE`.
- User non-admin dengan branch scope `HEAD OFFICE` tetap harus melihat data `HEAD OFFICE` miliknya.
- Jangan memfilter `HEAD OFFICE` dari scoped branch BMC/BNM/BMS.
- Jika `ADMIN` menjalankan aksi destructive pada data `HEAD OFFICE`, action harus menolak.

File sumber:

- `lib/admin-branch-scope.ts`
- Query/action dashboard reports, PJUM, preventive, branches.

## 6. Report Workflow

Enum ada di `prisma/schema.prisma`.

Alur normal:

```text
DRAFT
  -> PENDING_ESTIMATION
  -> ESTIMATION_APPROVED
  -> IN_PROGRESS
  -> PENDING_REVIEW
  -> APPROVED_BMC
  -> COMPLETED
```

Alur revisi:

- `ESTIMATION_REJECTED_REVISION`
- `ESTIMATION_REJECTED`
- `REVIEW_REJECTED_REVISION`

Action penting:

- BMS submit: `app/reports/actions/submit.ts`
- BMS resubmit: `app/reports/actions/resubmit.ts`
- BMC review estimasi: `app/reports/actions/approve-estimation.ts`
- BMS start work: `app/reports/actions/start-work*.ts`
- BMS completion: `app/reports/actions/submit-completion*.ts`
- BMC review completion: `app/reports/actions/review-completion.ts`
- BNM final approval: `app/reports/actions/approve-final.ts`
- Dashboard delete report: `app/dashboard/reports/actions.ts`

Rules:

- BMC review hanya untuk branch yang dipegang.
- BNM final approval hanya untuk branch yang dipegang.
- Dashboard delete report boleh untuk `ADMIN`, `BMC`, `BNM_MANAGER`; non-admin tetap branch scoped.
- `ADMIN` tidak boleh delete report `HEAD OFFICE`.

## 7. Timestamp Laporan

Gunakan semantik berikut secara konsisten di seluruh UI:

- `createdAt`: laporan dibuat.
- `updatedAt`: auto-updated row Prisma. Jangan jadikan satu-satunya sumber "aktivitas terakhir" jika ActivityLog tersedia.
- `ActivityLog.createdAt`: sumber utama riwayat dan "update terakhir laporan".
- `finishedAt`: waktu final approval BNM saat status menjadi `COMPLETED`.
- `pjumExportedAt`: waktu laporan sudah masuk/export PJUM.

UI yang menampilkan waktu harus menjelaskan labelnya secara spesifik:

- "Dibuat"
- "Update laporan"
- "Selesai"
- "Sudah PJUM"

Jangan menampilkan label ambigu seperti "selesai" untuk waktu selain final BNM approval.

## 8. Dashboard Reports

Tabel `/dashboard/reports` saat ini:

- Compact.
- Infinite scroll.
- Quick filter berbentuk pill seperti checklist tab.
- Nomor laporan saja yang menjadi link detail.
- Cabang dipisah sebagai kolom sendiri.
- Status laporan dan status PJUM dipisah.
- Jika tidak ada PJUM, tampilkan `-`, bukan "Non pjum".
- Jika tidak ada SLA, tampilkan `-`, bukan "Tidak ada SLA".
- Link ke detail memakai warna primary dan ikon panah.

Filter penting:

- `scope=active`
- `scope=overdue`
- `scope=review_bmc`
- `scope=review_bnm`
- `scope=revision`
- `status=...`
- `pjumStatus=exported|not_exported`

Dashboard utama harus link ke `/dashboard/reports` dengan filter yang sesuai, misalnya stuck reports memakai `scope=overdue`.

## 9. Dashboard Report Detail

Route: `/dashboard/reports/[reportNumber]`.

Konten utama:

- Header report dan summary teks compact.
- Tabs sticky di bawah admin header.
- Checklist kondisi compact, urut kategori A sampai I.
- Pekerjaan dan biaya hanya untuk item rusak/diperbaiki yang dikerjakan BMS.
- Toko material dipisah dari item karena tidak spesifik per item.
- Dokumentasi/foto dengan badge kondisi.
- Riwayat aktivitas.
- Aksi, termasuk hapus laporan dengan alert dialog.

Catatan UI:

- Jangan mengembalikan desain card-heavy lama.
- Jangan memakai komponen lama route `/reports/[reportNumber]` untuk dashboard detail.
- Badge "rusak" pada foto selesai diganti menjadi "diperbaiki".
- Jika value benar-benar `null`, tampilkan kosong atau `-` sesuai konteks. Jika value `0`, tetap tampilkan `0`.

## 10. PJUM

Dashboard PJUM:

- `/dashboard/pjum`: list PJUM role-aware.
- `/dashboard/pjum/[id]`: detail PJUM baru.
- Summary atas tidak memakai "ditolak" dan tidak memakai "cabang/BMS paling aktif".
- Area validasi hanya untuk PJUM `PENDING_APPROVAL` yang terlalu lama.
- Tabel tidak punya kolom dokumen dan aksi inline.
- Detail PJUM hanya menyediakan tombol "Lihat PDF PJUM".
- Hapus tombol kembali dan kartu validasi dari detail.
- Link yang bisa diklik di tabel memakai warna primary dan panah.

Action:

- `cancelAdminPjum` boleh untuk `ADMIN`, `BMC`, `BNM_MANAGER`.
- Non-admin tetap branch scoped.
- `ADMIN` tidak boleh cancel PJUM `HEAD OFFICE`.

## 11. Preventive

Tujuan halaman `/dashboard/preventive`:

- Melihat toko yang sudah checklist preventif setiap triwulan.
- Target: tiap toko minimal satu checklist preventif per triwulan.

Rules:

- Hanya report preventif dengan status `COMPLETED` yang dihitung.
- Report preventif belum selesai harus di-skip.
- Default filter cabang adalah "Semua Cabang".
- Kartu cabang terendah muncul saat "Semua Cabang" aktif.
- Search kode/nama toko hanya memfilter data tabel, tidak mengubah summary global.
- Tabs belum checklist harus memakai infinite scroll seperti tabel lain.
- Export preventive memakai query optimal dan dropdown triwulan, termasuk semua triwulan.

## 12. Branches

Tujuan halaman `/dashboard/branches`:

- `ADMIN`: melihat performa semua cabang production.
- `BMC`/`BNM_MANAGER`: melihat cabang yang menjadi scope user.

UI versi sekarang:

- Tidak memakai tabs.
- Ringkasan cabang di atas.
- Daftar cabang setelah ringkasan.
- Ada judul dan pemisah section.
- Tidak ada box pencarian cabang.
- Tidak ada tombol reset.
- Label penting di ringkasan diberi warna.
- Status aktivitas memakai label global status laporan.

Detail cabang:

- Route `/dashboard/branches/[branchName]`.
- Harus branch-scoped untuk BMC/BNM.

## 13. Dashboard Utama

Dashboard admin menampilkan:

- KPI laporan.
- SLA per status.
- Distribusi status.
- Stuck reports dengan global label status.
- PJUM approved/review yang bisa membuka list `/dashboard/pjum` sesuai status.
- Chart laporan/realisasi sesuai kebutuhan admin.
- User online dan user aktif hari ini.

SLA berdasarkan workflow bisnis:

- Uang muka BMS adalah Rp 1 juta per minggu.
- SLA status harus membantu admin melihat laporan yang macet sebelum PJUM mingguan.
- Jelaskan SLA dengan bahasa awam, bukan hanya angka.

## 14. Realisasi

Tujuan analisis realisasi:

- Membantu keputusan apakah uang muka Rp 1 juta per minggu per BMS cukup atau berlebih.

Metrik penting:

- Rata-rata realisasi per BMS per minggu per cabang.
- Total realisasi.
- Tren realisasi bulanan.
- Tabel Realisasi per Cabang.

Jangan membuat section tabel per BMS terpisah untuk permintaan ini. Data tetap dibaca per cabang, tetapi rumusnya memperhitungkan BMS per minggu.

## 15. Settings

Route: `/dashboard/settings`.

Hanya `ADMIN`.

Konten:

- Maintenance mode dengan tombol simpan.
- SLA laporan per status.
- Policy PJUM, termasuk batas pending terlalu lama.

Maintenance mode:

- Env `MAINTENANCE_MODE=true` adalah hard override.
- Toggle settings tersimpan di `AppSetting`.

## 16. UI/UX Rules Project

Preferensi user yang sudah jelas:

- UI dashboard harus compact dan jelas.
- Hindari desain terlalu card-based.
- Hindari sticky layout yang mengambil ruang kecuali sticky tabs/header memang dibutuhkan.
- Tabel harus padat, rapi, vertical align center.
- Link tabel hanya pada field utama, misalnya nomor laporan atau ID PJUM.
- Gunakan global label status.
- Gunakan warna pada label penting, tetapi jangan membuat palet terlalu ramai.
- User awam harus paham arti angka dan SLA; tambahkan helper text pendek bila metrik raw bisa misleading.

Untuk komponen:

- Pakai shadcn/ui dan pola yang sudah ada.
- Pakai lucide-react atau Tabler Icons yang sudah tersedia.
- Jangan membuat komponen baru jika helper lokal sudah cukup.
- Pisahkan file jika komponen sudah terlalu besar.

## 17. Auth dan Mutating Actions

Untuk Server Actions yang mengubah data:

1. Ambil user dengan auth helper.
2. Validasi role.
3. Validasi branch scope.
4. Validasi input.
5. Jalankan transaksi jika menyentuh banyak tabel.
6. Tulis `ActivityLog` atau `ApprovalLog` jika relevan.
7. `revalidatePath` route terkait.
8. Jangan menghapus data Drive tanpa mempertimbangkan file final yang masih dipakai.

Catatan:

- `completedPdfPath` dan `reportFinalDriveUrl` masih dipakai.
- Legacy PDF path lama seperti pending/approved intermediate sudah tidak dianggap penting oleh user, tetapi validasi schema/migration harus tetap hati-hati.

## 18. Database dan Migration

Schema ada di `prisma/schema.prisma`.

Migration penting terbaru:

- `20260603103000_add_preventive_dashboard_indexes`
- `20260604160000_align_report_timestamps`
- `20260604170000_drop_legacy_report_columns`

Prinsip:

- Jangan gunakan `prisma db push` pada database bersama/production.
- Untuk migration production/staging gunakan `npx prisma migrate deploy`.
- Branch git tidak memisahkan database. Jika `.env` memakai database production, perintah Prisma tetap menyentuh database production.
- Sebelum membuat migration destructive, validasi pemakaian kolom dengan `rg` dan jelaskan dampaknya.

## 19. Environment dan Integrasi

Env utama:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `DRIVE_CDN_CLIENT_ID`
- `DRIVE_CDN_CLIENT_SECRET`
- `DRIVE_CDN_REFRESH_TOKEN`
- `DRIVE_CDN_ROOT_FOLDER_ID`
- `UPLOADTHING_TOKEN`
- `CRON_SECRET`
- `MAINTENANCE_MODE`

Google integration:

- Gmail OAuth2 untuk email.
- Google Drive API untuk arsip PDF.
- Google Drive CDN/proxy untuk foto.

## 20. Testing dan Verifikasi

Tidak ada test suite lengkap yang stabil. File `.spec.ts` dan `.test.ts` ada untuk helper tertentu.

Perintah umum:

- `npm run lint`
- `npm run build`
- `npm run db:generate`
- Test helper spesifik jika ada.

Untuk perubahan docs saja, build tidak wajib.

Untuk perubahan UI besar:

- Jalankan dev server jika perlu.
- Verifikasi responsive/overflow dengan browser jika tersedia.
- Pastikan tidak ada scroll vertikal/horisontal yang tidak sengaja pada tabs/tabel.

## 21. Cara Kerja AI Agent di Repo Ini

Wajib:

- Baca file terkait sebelum implementasi.
- Gunakan `rg` untuk search.
- Gunakan `apply_patch` untuk edit manual.
- Jangan revert perubahan user.
- Jangan menjalankan destructive git command.
- Jangan mengubah schema tanpa migration.
- Jangan menganggap `HEAD OFFICE` sebagai cabang production.
- Jangan mengubah routing BMS detail ke dashboard kecuali diminta eksplisit.

Saat mengubah UI:

- Ikuti pola dashboard baru.
- Buat compact.
- Kurangi card jika konten bisa berupa section/table.
- Pakai label yang jelas untuk user awam.
- Gunakan global status label.

Saat mengubah query:

- Cek index dan pola query yang sudah ada.
- Hindari fetch semua data jika tabel sudah memakai infinite scroll.
- Jangan menghitung preventive dari report yang belum `COMPLETED`.

Saat menjawab user:

- Bahasa Indonesia.
- Langsung, teknis, tidak bertele-tele.
- Jika tidak menjalankan verifikasi, sebutkan.
