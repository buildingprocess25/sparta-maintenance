# Fix False Positive PJUM Requirement on Rekanan Reports

## Scope

- Memperbaiki kalkulasi `totalReal` (mengabaikan sisa data harga dari item yang ditangani Rekanan).
- Memperbaiki deteksi `hasBmsHandledItems` agar hanya menghitung item dengan *handler* BMS jika kondisinya benar-benar rusak.
- Di luar *scope*: Membersihkan *dirty data* langsung dari *database* (karena perbaikan ini sudah membuat *logic* kebal terhadap data kotor tersebut).

## Context and Sources

- Berdasarkan analisis pada data *database* laporan `1G4R-2606-001`, ditemukan dua anomali pada JSON `items`:
  1. Item dengan *handler* "REKANAN" masih menyimpan *array* `realisasiItems` (kemungkinan *draft* lama).
  2. Item "D3" (Kaca Depan) berstatus `BAIK`, tetapi *handler*-nya menyisakan tulisan "BMS".
- Hal ini mengecoh fungsi `requiresPjum` dan `hasBmsHandledItems` pada `lib/realisasi.ts`.

## Changed Files

- `lib/realisasi.ts`: Menambahkan *early return* `0` jika *handler* bukan "BMS" pada `calculateItemRealisasiTotal`. Menambahkan validasi kondisi RUSAK/NOT_OK pada `hasBmsHandledItems`.
- `lib/realisasi.spec.ts`: Menambahkan dua *test case* baru untuk memvalidasi pencegahan *false positive* PJUM pada sisa data Rekanan dan item berstatus BAIK.

## Decisions

- Modifikasi diletakkan langsung di level kalkulasi/validasi (di `lib/realisasi.ts`), bukan melalui migrasi pembersihan *database*. Tujuannya agar aplikasi kebal secara dinamis dan *backward-compatible* terhadap kasus-kasus anomali data usang lainnya di *production* tanpa risiko merusak riwayat laporan lama.

## Verification

- Ditulis dua unit *test* (assert *failure* vs *pass*).
- Menjalankan `npx tsx lib/realisasi.spec.ts` dan lolos dengan *exit code* 0.

## Remaining Work and Risks

None.
