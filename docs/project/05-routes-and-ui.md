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
| `/dashboard/preventive` | `ADMIN`, `BMC`, `BNM_MANAGER` | Coverage checklist preventif. |
| `/dashboard/branches` | `ADMIN`, `BMC`, `BNM_MANAGER` | Performa cabang. |
| `/dashboard/bms-performance` | `BMC`, `BNM_MANAGER` | Monitoring performa BMS dalam scope cabang. |
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
