# Dashboard Improvements & Fixes

## Scope

- **SLA Proses SPARTA**: Diubah logic query SLA agar menghitung semua laporan `COMPLETED` tanpa mempedulikan ada biayanya atau tidak. Mengubah nama kolom di ekspor XLSX menjadi "JUMLAH LAPORAN SELESAI".
- **Grafik Realisasi Dashboard**: Diubah logic query tooltip dashboard agar "Total Laporan" konsisten dengan SLA, yaitu menghitung semua laporan `COMPLETED` murni.
- **Checklist Preventif Dashboard**: Memperbarui fungsi `calculateRate` menjadi 2 angka desimal dan mengubah format tampilan ke dalam UI widget menggunakan `toLocaleString` (up to 2 desimal) agar persentase lebih rapi.
- **Distribusi Status & SLA**: Memasukkan `PENDING_CHECKLIST_REVIEW` ("Review Checklist") ke dalam admin status list agar ter-akomodir. Menghapus filter auto-hide sehingga semua kartu status tampil secara penuh, meskipun nilainya 0 (sementara grafik batang hanya me-render status yang > 0 untuk menghindari rendering warna cacat).

## Implementation

- `app/dashboard/branches/actions.ts`: Menghapus filter `r."totalReal" IS NOT NULL`.
- `app/dashboard/branches/_components/admin-sla-table.tsx`: Rename "JUMLAH LAPORAN" to "JUMLAH LAPORAN SELESAI" in export object keys.
- `app/dashboard/queries.ts`:
  - Menghapus `totalReal: { not: null }` dari `getAdminRealisasiDetail`.
  - Menambahkan `PENDING_CHECKLIST_REVIEW` ke `ADMIN_STATUS_ORDER` dan `ADMIN_STATUS_LABELS`.
  - Menghapus `.filter((item) => item.count > 0)` pada return array `getAdminStatusDistribution`.
- `app/dashboard/preventive/actions.ts`: Memodifikasi return calculation di `calculateRate` menggunakan `.toFixed(2)` dan type cast `Number`.
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Menambahkan `toLocaleString("id-ID", { maximumFractionDigits: 2 })` untuk proper display persentase `capaianNasional` dan `percentage`.
- `app/dashboard/_components/admin/status-distribution.tsx`: Kondisi rendering pada bar segment (hanya jika `item.count > 0`).

## Notes

- Kueri perhitungan untuk grafik dasbor biaya (*Rata-Rata Biaya*) tetap aman dan difilter pada array map-nya di UI builder, jadi `Total Laporan` tidak merusak rata-rata biaya per tiket.
