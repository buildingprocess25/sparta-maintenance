# Fix Realisasi Chart Tooltip

## Scope

- Hapus `<Line dataKey="total">` tersembunyi yang merusak skala yAxis grafik.
- Gunakan custom render `content` pada `ChartTooltip` untuk merender 4 baris data tooltip tanpa perlu memasukkan semua datanya sebagai elemen grafik.
- Tambahkan properti `validCount` ke dalam return type `RealisasiBranchStat` agar tooltip dan fitur export XLSX bisa menampilkan info "Laporan Valid (Ada Biaya)" yang dipakai sebagai angka pembagi `Rata-Rata Biaya`.

## Changed Files

- `app/dashboard/queries.ts`
- `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

## Decisions

- Masalah flat chart line (garis kuning/Rata-Rata Biaya tidak terlihat) diakibatkan oleh `<Line dataKey="total">` yang berada pada yAxis yang sama, sehingga melambungkan limit maksimum yAxis hingga ratusan juta. 
- Custom tooltip render adalah best practice Recharts untuk menampilkan banyak variabel dari data baris yang sama tanpa mendistorsi elemen chart.
