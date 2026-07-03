# Database

## Datasource

- Database: PostgreSQL.
- ORM: Prisma 7.
- Schema source: `prisma/schema.prisma`.
- Prisma CLI datasource: `prisma.config.ts`.
- Runtime Prisma client: `lib/prisma.ts`.
- Runtime memakai `DATABASE_URL`.
- Prisma CLI memakai `DIRECT_URL` jika tersedia, fallback ke `DATABASE_URL`.

Runtime Prisma memakai adapter `@prisma/adapter-pg` dan pool `pg`. Konfigurasi penting:

- `DATABASE_POOL_MAX`: batas koneksi pool aplikasi.
- `DATABASE_IDLE_TIMEOUT_MS`: waktu koneksi idle sebelum ditutup.
- `DATABASE_CONNECTION_TIMEOUT_MS`: timeout saat membuka koneksi.
- `transactionOptions.maxWait`: batas menunggu transaction dimulai.
- `transactionOptions.timeout`: batas durasi interactive transaction.
- Session database dipaksa UTC lewat `options: "-c timezone=UTC"`.

## Model Utama

| Model | Fungsi |
| --- | --- |
| `User` | Akun, role, branch scope, area scope, password, presence, notifikasi, dan soft delete. |
| `Store` | Data toko, cabang utama, area operasional, status aktif, dan relasi laporan. |
| `Report` | Laporan maintenance, checklist, estimasi, realisasi, status workflow, foto, PDF, PJUM, dan revisi admin. |
| `ApprovalLog` | Riwayat approval atau rejection laporan. |
| `ActivityLog` | Timeline aktivitas laporan. |
| `UserPresence` | Status online dan aktivitas terakhir user. |
| `Notification` | Notifikasi in-app untuk report, PJUM, dan intervensi. |
| `PushSubscription` | Subscription Web Push per user dan device. |
| `PjumExport` | Dokumen PJUM, status approval, daftar laporan, branch, area, periode, dan PDF. |
| `AppSetting` | Setting sistem berbasis key-value, seperti maintenance mode dan policy. |
| `GoogleDriveFolderCache` | Cache folder Google Drive agar pembuatan folder tidak berulang. |

## Enum Penting

| Enum | Fungsi |
| --- | --- |
| `UserRole` | Role aplikasi: `BMS`, `BMC`, `BNM_MANAGER`, `BRANCH_ADMIN`, `ADMIN`. |
| `ReportStatus` | Status workflow laporan dari `DRAFT` sampai `COMPLETED`. |
| `PjumStatus` | Status workflow PJUM: pending, approved, rejected. |
| `ActivityAction` | Event aktivitas laporan yang ditulis ke `ActivityLog`. |
| `NotificationType` | Jenis event yang memicu notifikasi. |
| `NotificationEntityType` | Target entity notifikasi: report, PJUM, atau intervensi. |

## Scope Cabang dan Area

Project memakai dua level scope:

- `branchName`: cabang utama hasil konsolidasi, misalnya `CIKOKOL RAYA`.
- `areaName`: area operasional lama atau sub-area, misalnya `BALARAJA`.

Field scope:

| Field | Fungsi |
| --- | --- |
| `User.branchNames` | Daftar cabang utama yang boleh diakses user. |
| `User.areaNames` | Daftar area operasional yang boleh difilter user. Kosong berarti fallback ke cabang utama. |
| `Store.branchName` | Cabang utama toko. |
| `Store.areaName` | Area operasional toko. |
| `Report.branchName` | Cabang utama laporan. |
| `Report.areaName` | Area operasional laporan. |
| `PjumExport.branchName` | Cabang utama PJUM. |
| `PjumExport.areaNames` | Daftar area yang masuk dalam PJUM. |

Aturan akses:

- `ADMIN` bisa melihat semua cabang.
- `BMC` dan `BNM_MANAGER` dibatasi oleh `branchNames`.
- Jika `areaNames` tersedia, UI boleh menampilkan filter area tanpa menyembunyikan data cabang utama.
- Cabang `HEAD OFFICE` dipakai untuk development/testing dan diperlakukan sebagai scope global internal sesuai helper scope.

## Timestamp

Prinsip waktu:

- Database menyimpan instant waktu sebagai UTC.
- Runtime Prisma memaksa session timezone ke UTC.
- UI menampilkan waktu dalam WIB.
- Export XLSX menampilkan waktu dalam WIB.

Field timestamp laporan:

| Field | Arti |
| --- | --- |
| `Report.createdAt` | Laporan dibuat. |
| `Report.updatedAt` | Update terakhir row laporan oleh Prisma. Jangan dianggap sebagai approval final. |
| `Report.finishedAt` | Waktu approval final BnM saat laporan menjadi `COMPLETED`. |
| `Report.pjumExportedAt` | Waktu laporan masuk ke PJUM. |
| `ApprovalLog.createdAt` | Waktu approval atau rejection dicatat. |
| `ActivityLog.createdAt` | Waktu aktivitas bisnis laporan dicatat. |

Catatan penting:

- Untuk tampilan "update laporan" yang berarti aktivitas bisnis, gunakan `ActivityLog.createdAt` terakhir atau field khusus yang memang merepresentasikan aktivitas bisnis.
- Untuk "laporan selesai", gunakan `Report.finishedAt`.
- Untuk "laporan sudah PJUM", gunakan `Report.pjumExportedAt` atau relasi konseptual dari `PjumExport.reportNumbers`.

## Report dan PJUM

`Report.items`, `Report.estimations`, `Report.startReceiptUrls`, `Report.startMaterialStores`, dan dokumentasi tambahan memakai `Json`. Ini membuat struktur item fleksibel, tetapi validasi bentuk data wajib dilakukan di layer aplikasi.

PJUM disimpan di `PjumExport` dengan:

- `bmsNIK`
- `branchName`
- `areaNames`
- `weekNumber`
- `fromDate`
- `toDate`
- `reportNumbers`
- `status`
- `pjumPdfPath`
- `pjumFinalDriveUrl`

Laporan Rp 0 tidak selalu wajib PJUM. Aturan UI saat ini:

- Rp 0 tanpa item pekerjaan BMS: tidak perlu ditandai belum PJUM.
- Rp 0 dengan item pekerjaan BMS: tetap perlu PJUM.
- Laporan dengan biaya BMS: perlu PJUM.

## Soft Delete User

`User` memakai soft delete:

- `deletedAt`: waktu user dinonaktifkan.
- `deletedByNIK`: NIK user yang melakukan penghapusan.

Tujuannya agar data historis seperti `Report`, `ActivityLog`, dan `ApprovalLog` tetap bisa dibaca tanpa menghapus aktor historis.

Query user aktif harus memfilter:

```ts
deletedAt: null
```

## Migration

Aturan migrasi:

- Gunakan `prisma migrate dev` hanya untuk development.
- Gunakan `prisma migrate deploy` untuk staging/production.
- Jangan gunakan `prisma db push` ke database bersama atau production.
- Branch git tidak memisahkan database. Jika branch testing memakai `DATABASE_URL` production, perubahan migrasi tetap berdampak ke production database.
- Sebelum migrate production, cek target datasource dari `DATABASE_URL` dan `DIRECT_URL`.

Checklist sebelum migrasi:

1. Cek `npx prisma migrate status`.
2. Pastikan migration SQL tidak destructive tanpa rencana rollback.
3. Pastikan kode production lama tetap kompatibel jika migrasi dijalankan sebelum deploy kode baru.
4. Untuk drop column, pastikan field sudah tidak dibaca atau ditulis oleh kode production.

## Index

Index harus mengikuti query yang sering dipakai. Index yang sudah ada mencakup area penting:

- `Report`: created by, status, store, branch/status/date, branch/status/PJUM, branch/area/status.
- `Store`: branch, area, branch/code, branch/area.
- `PjumExport`: status, branch, area names GIN, created by.
- `ActivityLog`: report, actor, created at.
- `Notification`: recipient/read/date, entity, report, PJUM.
- `PushSubscription`: user dan disabled state.
- `UserPresence`: last seen.

Aturan menambah index:

1. Cari query yang lambat dengan `rg`.
2. Pastikan query memang sering dipakai atau berat.
3. Tambahkan index lewat migration.
4. Verifikasi migration status.
5. Jika memungkinkan, cek query plan atau waktu respon sebelum dan sesudah.

## Aiven Troubleshooting

Error umum:

```text
P1001: Can't reach database server
timeout exceeded when trying to connect
Too many database connections opened
Transaction API error: Unable to start a transaction in the given time
```

Langkah cek dari Windows:

```powershell
Resolve-DnsName maintenance-sparta.i.aivencloud.com
Test-NetConnection maintenance-sparta.i.aivencloud.com -Port 19457
```

Jika `Test-NetConnection` gagal tetapi aplikasi production tetap berjalan, kemungkinan jaringan lokal atau ISP memblok koneksi ke port database. Solusi praktis:

- coba hotspot,
- coba VPN,
- coba jaringan lain,
- jalankan command dari environment cloud yang bisa mengakses Aiven.

Untuk Aiven free tanpa connection pool bawaan, jaga pool aplikasi tetap kecil dan hindari query paralel berlebihan pada satu request.
