# Master Tiket AHO dan Dropdown Nomor Tiket

## Scope

- Menambahkan model `MasterAhoTicket` di skema Prisma untuk menyimpan tiket keluhan toko aktif.
- Membangun halaman dashboard admin HO untuk meninjau dan mengimpor data tiket melalui *spreadsheet* XLSX secara massal (Full Sync).
- Mengganti input manual `ahoTicketNumber` pada form laporan BMS (pembuatan & revisi estimasi) menjadi *ComboBox Creatable* yang menarik tiket milik toko bersangkutan, dengan fallback input manual.

## Context and Sources

- Permintaan fitur dari user untuk memastikan input nomor tiket AHO lebih akurat.
- File `prisma/schema.prisma`, `app/dashboard/aho-tickets/*`, dan `app/reports/(bms)/create/*`.
- Diskusi desain dengan user terkait penggunaan *ComboBox* dan fitur Sinkronisasi Master Data bagi role ADMIN.

## Changed Files

- `prisma/schema.prisma`: Menambahkan model `MasterAhoTicket` dan relasi ke `Store`.
- `app/dashboard/aho-tickets/*`: Menambahkan halaman tabel dan fitur impor XLSX untuk Admin.
- `app/dashboard/aho-tickets/actions.ts`: Aksi impor bulk ke DB (hanya status "New" dan "Progress") dan aksi `getActiveAhoTickets`.
- `components/app-sidebar.tsx`: Menambahkan menu *Tiket AHO* untuk ADMIN.
- `app/reports/(bms)/create/components/local-aho-input.tsx`: Membangun ulang input menjadi *custom ComboBox* dengan opsi *creatable*.
- `app/reports/(bms)/create/components/checklist-step.tsx`: Meneruskan `storeCode` ke *input component*.
- `app/reports/(bms)/create/create-form.tsx`: Meneruskan `selectedStoreCode` ke *checklist step*.
- `lib/hooks/use-on-click-outside.ts`: Menambahkan hook utilitas untuk ComboBox.

## Decisions

- **Full Sync Import**: Impor AHO Tickets bersifat menghapus data tiket yang sudah ada di master (untuk toko-toko) lalu mengisinya dengan yang baru dari file Excel, karena tiket lama yang hilang diasumsikan sudah tidak aktif.
- **Creatable ComboBox Custom**: Dibuat secara native menggunakan `react` state daripada bergantung pada `cmdk` yang tidak terinstal atau `<datalist>` yang secara UI kurang sesuai dengan deskripsi *"Gunakan [input]"* dari user.

## Verification

- TypeScript check (`tsc --noEmit`) berhasil tanpa *error* terkait kode baru.
- Relasi Prisma divalidasi dengan `prisma generate` yang sukses, meski `prisma migrate dev` terkendala *drift* dari database sebelumnya (akan diselesaikan di tahap migrasi selanjutnya).

## Remaining Work and Risks

- Perlu dijalankan `npx prisma migrate dev` (mengatasi database drift jika ada) sebelum di-deploy ke production.
