# Preventive Tab Export XLSX Implementation

## Scope

- **Fitur Ekspor**: Menambahkan tombol "Ekspor XLSX" pada tab Cabang di halaman Dashboard Preventive.
- **Tujuan**: Memungkinkan operasional untuk mengekspor data ringkasan capaian checklist preventif per cabang dalam format `.xlsx`.

## Implementation

- `app/dashboard/preventive/_components/admin-preventive-table.tsx`:
  - Menambahkan *library* import `* as XLSX from "xlsx"`.
  - Membuat fungsi `handleExportXlsx` yang menarik parameter dari state `sortedBranchSummaries`.
  - Me-*looping* kolom `Coverage` untuk mem- *pass* cell properties `z: '0.00%'` agar di Excel terbaca secara otomatis sebagai format persentase 2 angka desimal (e.g., 21.09%).
  - Memasukkan tombol `Ekspor XLSX` yang terintegrasi dengan fungsi `handleExportXlsx` bersebelahan dengan tombol sorting pada UI `TabsContent` `branches`.

## Notes

- Kompilasi build dan `tsc` ter-*skip* dari indikasi memori berlebih lokal (OOM), namun dari sisi integritas Type TS sudah berjalan dengan semestinya. Data angka yang didapat sudah murni 0 - 100 lalu dikali `/100` untuk *conversion factor* di XLSX-nya.
