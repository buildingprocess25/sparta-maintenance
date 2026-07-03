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
| `/dashboard/preventive` | Tidak | Ya | Ya | Ya |
| `/dashboard/users` | Tidak | Ya, scoped | Tidak | Ya |
| `/dashboard/stores` | Tidak | Ya, scoped | Tidak | Ya |
| `/dashboard/settings` | Tidak | Tidak | Tidak | Ya |

## Prinsip Mutating Action

1. Ambil auth user.
2. Validasi role.
3. Validasi branch/area scope.
4. Validasi input.
5. Jalankan transaksi jika menyentuh banyak tabel.
6. Tulis log aktivitas, approval, atau notifikasi jika relevan.
7. Revalidate route terkait.
