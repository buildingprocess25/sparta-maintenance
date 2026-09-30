# Status Distribution Kpis Redesign

## Scope

- Menerapkan desain *Compact Visual Legend* pada komponen `StatusDistributionKpis`.
- Menghapus komponen Tabel dan menggantinya dengan layout *CSS Grid*.

## Context and Sources

- Berdasarkan keluhan pengguna dan arahan `/impeccable`, desain tabel sebelumnya terlalu repetitif, menggunakan banyak *badge* merah yang memicu *cognitive load*, dan memiliki *scrollbar* yang menyembunyikan data esensial di level dasbor.

## Changed Files

- `app/dashboard/_components/admin/status-distribution.tsx`

## Decisions

- **Remove Table:** Komponen `<Table>` dihapus total.
- **Progress Bar:** Ketinggian *progress bar* dinaikkan dari `h-3` ke `h-4` agar lebih mencolok.
- **Bento Grid Cards:** Status di-render sebagai *grid of mini-cards* (`grid-cols-2 lg:grid-cols-3`).
- **Clean SLA Badges:** Indikator "lewat SLA" hanya muncul pada kartu yang benar-benar memiliki pelanggaran (`overdueCount > 0`), sehingga mengurangi *visual noise*.

## Verification

- Komponen selesai direfaktor dan sesuai dengan rancangan. Tidak ada lagi *scrollbar* atau baris repetitif.

## Remaining Work and Risks

- None.
