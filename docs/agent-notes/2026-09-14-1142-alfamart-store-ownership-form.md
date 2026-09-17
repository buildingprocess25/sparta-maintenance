# Alfamart Store Ownership Form

## Scope

Menambahkan dropdown `Tipe Toko` untuk form tambah/edit toko ketika brand yang
dipilih adalah Alfamart, dan menyimpan pilihan ke `Store.ownershipType`.

Di luar scope: migration database dan perubahan data production langsung.

## Context and Sources

- `docs/superpowers/plans/2026-09-14-alfamart-store-ownership-form.md`:
  implementation plan yang dieksekusi.
- `prisma/schema.prisma`: `Store.ownershipType` sudah tersedia dengan enum
  `REGULAR`, `FRANCHISE`, dan `UNKNOWN`.
- Form store Admin dan BMC sudah memakai shadcn `Select`, sehingga dropdown
  baru mengikuti pola UI existing.

## Changed Files

- `lib/store-ownership.ts`: helper shared untuk normalisasi brand dan ownership.
- `lib/store-ownership.spec.ts`: unit test helper ownership.
- `app/admin/database/queries.ts`: memilih `ownershipType` agar form edit dapat
  menampilkan nilai existing.
- `app/bmc/database/queries.ts`: memilih `ownershipType` agar form edit dapat
  menampilkan nilai existing.
- `app/admin/database/actions.ts`: menerima dan menormalisasi `ownershipType`
  pada create/update store.
- `app/bmc/database/actions.ts`: menerima dan menormalisasi `ownershipType`
  pada create/update store.
- `app/admin/database/_components/store-form-dialog.tsx`: menambahkan state dan
  dropdown `Tipe Toko` untuk brand Alfamart.
- `app/bmc/database/_components/store-form-dialog.tsx`: menambahkan state dan
  dropdown `Tipe Toko` untuk brand Alfamart.

## Decisions

- Dropdown hanya tampil jika normalized brand adalah `ALFAMART`.
- Pilihan dropdown adalah `Regular` dan `Franchise`, tersimpan sebagai
  `REGULAR` dan `FRANCHISE`.
- Server action tetap menjadi sumber kebenaran normalisasi: `LAWSON` dipaksa
  menjadi `REGULAR`, sedangkan brand lain menjadi `UNKNOWN`.
- Existing `UNKNOWN` pada toko Alfamart ditampilkan sebagai `Regular` di form
  agar user punya default eksplisit saat mengedit.

## Verification

- Test helper melalui bundle runner karena `tsx` lokal gagal sebelum menjalankan
  test akibat `os.userInfo()` error pada environment Windows ini:
  `node -e 'const esbuild=require("esbuild"); esbuild.buildSync({entryPoints:["lib/store-ownership.spec.ts"], bundle:true, platform:"node", format:"cjs", outfile:"scratch/store-ownership.spec.cjs", external:["@prisma/client"]}); require("./scratch/store-ownership.spec.cjs");'`
  hasil: 5 test pass.
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false` berhasil dengan exit
  code 0.

## Remaining Work and Risks

- Belum dilakukan manual browser verification dari sesi ini.
