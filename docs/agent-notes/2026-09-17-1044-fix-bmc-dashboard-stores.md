# Fix BMC Access in Dashboard Stores

## Scope

Menambahkan proteksi tambahan pada `AdminStoresTable` di halaman `/dashboard/stores` untuk memastikan *role* BMC tidak bisa mengakses form tambah, import, maupun edit toko.

## Context and Sources

- Sebelumnya proteksi hanya diterapkan pada halaman khusus BMC (`/bmc/database`), namun ternyata *role* BMC mengakses *management* toko melalui rute `/dashboard/stores`. 
- Karena halaman `/dashboard/stores` *shared* antara ADMIN dan BMC, serta tabel di set `canManage=true`, diperlukan *passing* props `userRole` agar tabel dapat menentukan tombol apa yang di-*render*.

## Changed Files

- `app/dashboard/stores/page.tsx`: Menambahkan parameter `userRole={user.role}` ke pemanggilan komponen `AdminStoresTable`.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: Menangkap prop `userRole` dan memodifikasi *render* kondisional pada tombol "Tambah Toko", "Import", dan ikon Pensil (Edit). Jika `userRole === "BMC"`, tombol asli akan digantikan dengan tombol statis yang saat diklik menampilkan *toast* notifikasi penolakan akses. Tombol hapus otomatis disembunyikan untuk BMC.

## Decisions

- Tidak menyembunyikan tombol secara penuh dari UI untuk BMC, melainkan mempertahankan tombol namun mengubah perilakunya menjadi notifikasi Toast. Hal ini sesuai dengan permintaan eksplisit dari pengguna.

## Verification

- Tidak dapat dilakukan melalui `tsc` karena masalah `Fatal process out of memory: Zone` pada environment lokal. Namun kode dipastikan *type-safe* secara manual berdasarkan logika JSX standar.

## Remaining Work and Risks

None
