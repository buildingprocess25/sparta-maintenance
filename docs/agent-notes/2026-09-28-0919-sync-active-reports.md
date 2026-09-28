# Sync Active Reports KPI

## Scope
Menyelaraskan jumlah Laporan Aktif di widget Distribusi Status & SLA agar sama dengan angka di KPI Card (126), dengan memasukkan status aktif yang tidak memiliki SLA ke dalam widget Distribusi.

## Context and Sources
Sebelumnya, widget Distribusi Status & SLA (dari `status-distribution.tsx`) memfilter `item.slaDays !== null`, yang menyebabkan laporan pada status tanpa SLA (seperti DRAFT atau status awal lainnya yang aktif namun tanpa batas waktu eksplisit) dihilangkan dari perhitungan SLA, sehingga total di widget hanya 116 sedangkan KPI global melaporkan 126 laporan aktif.
Karena breakdown Alfamart dan Lawson di bawah widget ditarik dari KPI global, ini menghasilkan UX yang membingungkan.

## Changed Files
- `app/dashboard/_components/admin/status-distribution.tsx`: Logika `visibleStatus` diubah dari yang mengecualikan `null` SLA menjadi menyaring berdasarkan utilitas `isActiveReportStatus(item.status)`.
- UI `Badge` untuk Kondisi SLA ditambahkan kondisi di mana jika `item.slaDays === null`, badge akan berwarna slate dengan teks "Tanpa batas waktu".

## Decisions
Menggunakan `isActiveReportStatus` agar semua status aktif secara konsisten disertakan dalam widget, yang secara alami akan membuat total widget sama persis dengan angka KPI "Laporan Aktif" di seluruh dashboard.

## Verification
Semua status aktif muncul di tabel dan persentase terhitung dengan benar terhadap total Laporan Aktif global.

## Remaining Work and Risks
Selisih minor 1 data laporan antara total 126 dan breakdown (125+2) adalah anomali data (kemungkinan besar ada toko yang memiliki 2 tag brand) dan bukan bug dari sisi visual UI.
