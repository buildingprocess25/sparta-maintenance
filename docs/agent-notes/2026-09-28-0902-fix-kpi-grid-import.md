# Fix KpiGrid Import Errors

## Scope
Memperbaiki error build Next.js yang terjadi karena salah impor `KpiGrid` di `manager-dashboard.tsx` dan memisahkan `KpiGrid` ke file terpisah (`kpi-cards.tsx`) agar tidak ada bentrok antara Server Component dan Client Component.

## Context and Sources
Setelah memodifikasi `admin-dashboard-v2.tsx` untuk menggunakan `KpiGrid`, kita secara tidak sengaja memindahkan KpiGrid sepenuhnya tanpa memperbarui file lain yang juga mengimpornya (seperti `manager-dashboard.tsx`), dan karena ada pencampuran komponen server ke dalam komponen client, Next.js menghasilkan error "server-only". 

## Changed Files
- `app/dashboard/_components/admin/kpi-cards.tsx`: Dibuat ulang untuk menyimpan `KpiGrid`, `GroupedKpiCard`, dan subkomponennya secara terisolasi.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Dihapus komponen `KpiGrid` dkk karena sudah dipindah ke `kpi-cards.tsx`, lalu diimpor kembali dari sana.
- `app/dashboard/_components/manager-dashboard.tsx`: Diperbarui untuk mengimpor `KpiGrid` dari `kpi-cards.tsx`.

## Decisions
Mengisolasi komponen UI `KpiGrid` di file terpisah (`kpi-cards.tsx`) adalah best practice Next.js untuk mencegah dependency server (seperti prisma dan pg) terimpor secara implisit oleh bundler saat file tersebut diimpor oleh Client Component.

## Verification
Aplikasi sukses dikompilasi ulang oleh Next.js, dan tidak ada lagi error server-only atau export not found.

## Remaining Work and Risks
None.
