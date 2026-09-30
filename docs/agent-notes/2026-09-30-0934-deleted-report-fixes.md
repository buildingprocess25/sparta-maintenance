# Fix Deleted Report History Issues

## Scope

- Memperbaiki validasi query Prisma (`StringNullableListFilter`) di action report retention.
- Mengubah import Prisma menjadi _default export_ untuk modul actions deleted reports.
- Merapikan UI tab "Laporan Dihapus" di halaman admin agar menggunakan `variant="line"` dan lebih selaras dengan layout halaman.
- Menghapus double padding pada tabel `DeletedReportsTable`.

## Context and Sources

- Saat runtime, muncul PrismaClientValidationError terkait penggunaan `equals` dan `has` secara bersamaan pada field array di updateMany/deleteMany.
- Muncul error build terkait impor default vs named untuk instance prisma.
- Kualitas desain UI tab dinilai belum cukup sesuai dengan pedoman "impeccable" UI/UX karena tab terasa melayang (kapsul).

## Changed Files

- `app/dashboard/reports/actions.ts`: Menghapus redundant `has` pada Prisma query filter.
- `app/dashboard/reports/deleted-actions.ts`: Memperbaiki `import { prisma }` menjadi `import prisma`.
- `app/dashboard/reports/page.tsx`: Menggunakan `TabsList variant="line"` dan mengatur tata letak tab agar sejajar dengan header.
- `app/dashboard/reports/_components/deleted-reports-table.tsx`: Menghapus padding agar sesuai dengan wrapper barunya.

## Decisions

- Mengandalkan `equals: reportNumbers` pada validasi Prisma karena array data tersebut sudah memuat validasi spesifik.
- Mengubah tab variant dari _default_ (pill/kapsul abu-abu) ke `line` (garis bawah) untuk integrasi UI level halaman yang lebih mulus dan hierarkis tanpa mengganggu estetika header.

## Verification

- `npm run build:memory` berjalan bersih tanpa _error_.
- Halaman UI merender tab _border line_ sejajar dengan _border bottom_ header tanpa margin / padding yang bocor.

## Remaining Work and Risks

- None. Semua fungsi esensial untuk riwayat penghapusan telah diuji dan divalidasi pembangunannya.
