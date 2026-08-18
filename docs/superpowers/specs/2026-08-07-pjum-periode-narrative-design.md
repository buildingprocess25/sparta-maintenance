# PJUM Keperluan Narrative with Period Design

## Overview
Menambahkan narasi periode tanggal (Dari s/d Sampai) di bawah teks "Keperluan" pada formulir PDF PJUM. Hal ini memberikan kejelasan batas waktu periode PJUM secara eksplisit di dalam dokumen cetak.

## Data Structure Changes
- **Target Interface:** `PjumFormData` (di `lib/pdf/generate-pjum-form-pdf.ts`)
- **Additions:** 
  - `periodeFrom: string` (ISO date string)
  - `periodeTo: string` (ISO date string)

## PDF Layout Changes
### 1. Narasi Periode
- **Target:** `lib/pdf/generate-pjum-form-pdf.ts`
- **Formatting:** Tanggal akan diformat menjadi `DD/MM/YYYY` secara konsisten (memaksa 2 digit).
- **Narrative Assembly:**
  ```text
  Biaya perbaikan toko minggu ke X bulan Y 20ZZ, 1 BMS a/n [Name]
  Periode DD/MM/YYYY s/d DD/MM/YYYY
  ```
- **Styling Adjustment:**
  Baris "Untuk Keperluan" akan dipisahkan style-nya atau diubah dari `alignItems: "flex-end"` menjadi `alignItems: "flex-start"`. Tujuannya agar label "Untuk Keperluan :" sejajar dengan baris pertama teks, bukan mengambang di baris kedua.

### 2. Watermark SPARTA
- **Asset Loading:** Logo `Building-Logo.png` dibaca sekali di *module level* pada file `generate-pjum-form-pdf.ts` dan di-convert ke `base64` untuk efisiensi memory.
- **Komposisi:** Logo Building berdampingan dengan teks "Dokumen dibuat oleh SPARTA" di sebelah kanannya.
- **Styling & Positioning:** 
  Diletakkan di dalam container `pjumContainer` dengan style `position: 'absolute'`, `top`, `bottom`, `left`, `right` di-set sedemikian rupa dengan `justifyContent: 'center'` dan `alignItems: 'center'`. `opacity` diset sangat rendah (misal `0.1` - `0.15`) agar menjadi *background watermark* yang tidak menutupi visibilitas teks form PJUM utama. `zIndex: -1` digunakan bila didukung oleh React-PDF.

## Integration Points
1. **Approval Flow (`app/reports/pjum/approval-actions.ts`)**
   - Mengambil `pjumExport.fromDate` dan `pjumExport.toDate` dari database dan meng-inject nya ke object `PjumFormData`.
2. **Preview/Package Flow (`lib/pdf/generate-pjum-package-pdf.ts`)**
   - Menggunakan parameter `params.from` dan `params.to` saat me-render `fallbackPjumData`. 

## Impact Analysis
- **Data Historis:** Tidak ada resiko kerusakan data karena PDF di-generate *on the fly* dan field `fromDate/toDate` di database sudah selalu wajib diisi sejak awal.
- **Kompatibilitas:** Data lama yang diprint ulang akan langsung menyesuaikan desain PDF terbaru ini.
- **UI Web:** Tidak ada perubahan UI Web.
