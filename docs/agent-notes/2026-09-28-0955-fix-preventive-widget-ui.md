# Fix Preventive Widget UI

## Scope
1. Memperbaiki bug pada dropdown filter cabang di "Checklist Preventif" yang mana list pilihannya menghilang (hanya menyisakan cabang yang sedang dipilih) setelah filter cabang diterapkan.
2. Memperbaiki posisi teks persentase capaian di dalam pie chart/donut chart agar berada persis di tengah secara vertikal dan horizontal.

## Changed Files
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`:
  - Menambahkan *state* terpisah `availableBranches` yang diambil satu kali saat *mount* lewat fungsi `getPreventiveBranchOptions()`.
  - Mengubah cara centering teks di dalam pie chart dengan `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`.
  - Menambahkan `cx="50%"` dan `cy="50%"` beserta `margin` nol pada `PieChart` agar chart sepenuhnya di tengah kontainer.

## Decisions
Memisahkan fetch daftar opsi cabang dari payload data statistik KPI agar ketika data KPI yang di-fetch secara khusus ditujukan untuk satu cabang, *dropdown* cabang tetap mengetahui semua kemungkinan cabang dari state independen.
Centering teks chart menggunakan Tailwind CSS translation agar lebih robust (tidak terpengaruh `flex` atau tinggi baris dari wrapper absolut).
