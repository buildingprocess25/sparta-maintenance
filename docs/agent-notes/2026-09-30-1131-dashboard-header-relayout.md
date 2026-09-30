# Dashboard Header Relayout

## Scope

- Memperbaiki tata letak (layout) _filter_ periode di header "Ringkasan Operasional".

## Context and Sources

- Sesuai dengan masukan pengguna dan prinsip `/impeccable` serta `/frontend-design`, penempatan _filter dropdown_ (ukuran utilitas) yang sejajar langsung dengan elemen _heading_ (`h1`) merusak hierarki visual.

## Changed Files

- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

## Decisions

- **Visual Grouping:** Memindahkan _filter dropdown_ ke sisi kanan, dikelompokkan bersama tombol aksi ("Aktivitas" dan "Semua Laporan").
- **Scale Matching:** Mengecilkan ukuran tombol aksi (`size="sm"`, `h-8`, `text-xs`) agar selaras dengan ukuran kontrol input dari komponen _filter_ tren.
- **Separation:** Menambahkan garis vertikal pemisah (`w-px bg-border`) sebagai pembatas tegas antara kontrol filter dan tombol navigasi.

## Verification

- Tata letak kini terlihat jauh lebih rapi, proporsional, layaknya _utility bar_ modern pada aplikasi tingkat *enterprise*.

## Remaining Work and Risks

- None.
