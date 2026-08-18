# Fix CRUD Master data toko dan user (Cabang Lama & Brand)

## Scope

- Menambahkan field "Cabang Lama" (areaName) pada form Store dan User bagi Admin dan BMC.
- Mengubah input "Brand" menjadi dropdown `<Select>` dengan *autofill* dari database, dan fallback ke "ALFAMART".
- Memperbaiki `ReferenceError: allBrands is not defined` pada tabel Store.
- Menambahkan field `brand` pada query Prisma untuk Store.

## Context and Sources

- Sesuai permintaan user untuk memfasilitasi penggabungan (merger) cabang, di mana manajer area harus melakukan *approval* untuk area lamanya.
- Menghindari manual typing brand dengan dropdown yang memetakan existing brand di database, dengan default ALFAMART jika kosong.

## Changed Files

- `app/admin/database/_components/store-form-dialog.tsx`: Menambahkan props `allBrands`, `areaNamesByBranch`, mengubah input datalist brand ke Select.
- `app/admin/database/_components/store-table.tsx`: Menambahkan passing `allBrands` ke dialog form.
- `app/admin/database/actions.ts`: Export/import type updates.
- `app/admin/database/page.tsx`: Fetch `getAllBrands()` & area lama.
- `app/admin/database/queries.ts`: Menambahkan `brand: true` ke prisma select.
- `app/bmc/database/*`: Perubahan senada (form dialog, tabel, query, page).
- `app/dashboard/stores/*`: Update queries dan passing properties (Store).

## Decisions

- **Brand Dropdown**: Menggunakan `Select` dari shadcn (Radix) yang secara eksplisit tidak mengizinkan opsi string kosong `""`. String kosong harus di-*filter* (di-trim dan dibuang dari mapping) untuk mencegah React error.
- **Prisma Select**: Menambahkan atribut relasional opsional (seperti `brand`) pada fungsi `getAdminStores`, `getAllStores`, `getStoresByBranches`.

## Verification

- Telah dicoba di UI browser user (screenshot disertakan user) dan fix terakhir sukses me-*load* dropdown yang terisi dari database.
- Error "Cannot read properties" & "ReferenceError" telah dicegah dengan memberikan parameter *default* & memperbaiki destructuring React Props.

## Remaining Work and Risks

None.
