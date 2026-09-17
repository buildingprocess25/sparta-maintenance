# Export Stores Brand Filter

## Scope
Tambah filter Brand (Semua/Alfamart/Lawson) di dialog ekspor XLSX toko,
tambah kolom Brand di output XLSX, dan pastikan toko HEAD OFFICE tidak ter-ekspor.

## Changed Files
- `app/dashboard/stores/actions.ts`: tambah `brand?` ke `ExportStoreFilters`,
  tambah filter `where.brand` ke query, tambah `brand` ke select Prisma.
- `app/dashboard/stores/_components/export-stores-dialog.tsx`: tambah state
  `selectedBrand`, UI Select brand, teruskan ke action, kolom Brand di XLSX.

## Decisions
- brand filter pakai `mode: "insensitive"` agar case-insensitive match dengan data DB.
- brand null di-render sebagai "-" di XLSX.
- Reset selectedBrand saat dialog ditutup agar state bersih untuk sesi berikutnya.
- HEAD OFFICE sudah ter-exclude di guard ADMIN (NOT branchName HEAD OFFICE);
  BMC tidak punya akses HO secara scope branchNames.

## Verification
- npx tsc --noEmit: lulus tanpa error.

## Remaining Work
None.
