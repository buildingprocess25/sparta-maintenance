# Pembatasan Edit Toko untuk Role BMC

## Scope

Menghapus akses edit toko sepenuhnya untuk user dengan role BMC. Modifikasi dilakukan pada level UI tabel toko BMC dengan mengubah fungsi tombol "Edit" (ikon pensil).

## Context and Sources

- Sesuai dengan instruksi lanjutan bahwa user BMC tidak hanya dibatasi pada status toko saja, melainkan dilarang mengubah apapun pada data toko yang sudah ada.

## Changed Files

- `app/bmc/database/_components/store-table.tsx`: Mengganti komponen `StoreFormDialog` pada aksi baris tabel menjadi sebuah `Button` statis yang saat diklik memunculkan Toast Info ("Akses Dibatasi: Silakan hubungi tim Head Office...").
- `app/bmc/database/_components/store-table.tsx`: Menghapus import `StoreFormDialog` yang kini tidak lagi digunakan pada file tersebut.

## Decisions

- Tidak menghapus file `store-form-dialog.tsx` milik BMC secara fisik untuk menjaga struktur kode (siapa tahu ke depannya ada fallback access atau jika ingin di-*revert* dengan cepat). Namun file ini sekarang *unreachable* di sisi BMC.

## Verification

- Komponen `store-table.tsx` berhasil dirender dengan valid.
- Lint check otomatis memastikan tidak ada masalah pada props maupun import.

## Remaining Work and Risks

None
