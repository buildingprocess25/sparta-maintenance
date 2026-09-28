# Preventive Branch Sort Toggle & Lihat Semua Tab

## Scope
Menambahkan toggle sort "Terendah / Tertinggi" pada list cabang di widget Checklist Preventif, dan link "Lihat semua" yang membuka tab Cabang di halaman preventive dengan sort yang sinkron via URL param.

## Changed Files
- `app/dashboard/preventive/actions.ts`: Tambah field `allBranchItems` ke type dan return `getAdminPreventiveKpiData`.
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Tambah state `branchSort`, computed `displayedBranchItems`, toggle button, link "Lihat semua".
- `app/dashboard/preventive/page.tsx`: Baca URL param `sort`, pass `initialBranchSort` ke `AdminPreventiveTable`.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Tambah prop `initialBranchSort`, state `branchSort`, `sortedBranchSummaries`, toggle button di tab Cabang.

## Decisions
Sort dilakukan di frontend (tidak di query DB) karena jumlah cabang kecil (< 50) dan data sudah ada di memori.
URL param `sort` digunakan agar state sort dari widget bisa diteruskan ke halaman preventive saat "Lihat semua" diklik.
