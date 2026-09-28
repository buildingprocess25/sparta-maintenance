# Revert KPI Cards to use KpiGrid

## Scope

Mengembalikan komponen 3 card KPI di dashboard admin ke `KpiGrid` dari `admin-new-dashboard.tsx` agar sub-item-nya (Selesai, Laporan Aktif, dll) kembali bisa diklik dan difilter by brand, menghapus implementasi duplikat statis di `kpi-cards.tsx`.

## Context and Sources

Sesuai permintaan user untuk menyesuaikan dengan apa yang live di branch `main` saat ini, di mana `KpiGrid` menggunakan `KpiSubMetric` dan `GroupedKpiCard` dengan tag `<Link>` untuk route-nya.

## Changed Files

- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Mengganti import dan penggunaan `<AdminKpiCards>` menjadi `<KpiGrid>`.
- `app/dashboard/_components/admin/kpi-cards.tsx`: Dihapus karena tidak lagi digunakan.

## Decisions

Komponen `KpiGrid` yang ada di `admin-new-dashboard.tsx` sudah siap dipakai dan terekspor, jadi pendekatan terbaik adalah memakainya ulang daripada menduplikasi kodenya ke `kpi-cards.tsx`.

## Verification

File diubah dan `kpi-cards.tsx` dihapus lewat `git rm`. Aplikasi berhasil dikompilasi oleh `next dev`.

## Remaining Work and Risks

None.
