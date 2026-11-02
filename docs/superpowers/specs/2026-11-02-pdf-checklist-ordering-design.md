# Urutan Checklist di PDF Laporan & PJUM — Design

Tanggal: 2026-11-02
Dokumen terdampak: PDF PJUM (paket), PDF laporan tunggal, preview PDF dev

## Latar belakang

Di PDF PJUM, kategori checklist tampil acak (kadang E dulu, kadang G dulu) dan
item di dalam kategori juga acak (G2 sebelum G1).

Penyebab: `generatePjumPackagePdf` (`lib/pdf/generate-pjum-package-pdf.ts`)
memanggil `generateReportPdf` per laporan dengan `report.items` dan
`report.estimations` dari JSONB **apa adanya**. Di `generateReportPdf`
(`lib/pdf/generate-report-pdf.ts`):

- `groupItemsByCategory` mengelompokkan item ke object, lalu dirender via
  `Object.entries` → urutan kategori = urutan kemunculan pertama di array.
- Item di dalam kategori, tabel estimasi material (`data.estimations`), dan
  blok "Detail Penyelesaian Pekerjaan" juga mengikuti urutan array.

Urutan array JSONB bergantung pada urutan BMS mengisi/mengubah item di form,
sehingga terlihat acak. PDF laporan tunggal (`lib/pdf/report-pdf-builder.ts`)
memakai `generateReportPdf` yang sama dan punya masalah yang sama.

Comparator urutan katalog sudah ada di `lib/checklist-data.ts`
(`compareChecklistItemIds`, `compareChecklistItemsById`) dan sudah dipakai di
halaman detail laporan serta halaman foto Laporan Lengkap (commit `81015b2`),
tapi belum di `generateReportPdf`.

## Tujuan

Semua bagian PDF laporan yang menampilkan item checklist tampil berurutan
mengikuti katalog: kategori A → B → … → I, item A1 → A2 → … → A22, lalu B1, dst.
Urutan angka natural (I2 sebelum I11).

Bagian yang diurutkan:

1. Tabel checklist (kategori dan item di dalamnya).
2. Tabel estimasi material — baris diurutkan mengikuti item; nomor urut kolom
   pertama mengikuti urutan baru.
3. Detail Penyelesaian Pekerjaan — blok per item diurutkan.

Berlaku di semua pemanggil `generateReportPdf`: PDF PJUM, PDF laporan tunggal,
dan endpoint preview dev.

## Di luar cakupan

- Mengubah urutan data yang tersimpan di database (JSONB `items`/`estimations`).
- Meregenerasi PDF yang sudah diarsipkan di Google Drive. Hanya PDF yang
  di-generate setelah perubahan ini yang berurutan.
- Halaman foto Laporan Lengkap — sudah berurutan (`report-pdf-full-builder.ts`).

> **Revisi 2026-11-02 (saat implementasi):** `generateReportPdfFull` ternyata
> juga merender tabel checklist/estimasi/Detail Penyelesaian lewat
> `buildReportDocument` tanpa pengurutan. Sesuai keputusan "semua PDF",
> `orderReportPdfContent` juga dipanggil di awal `generateReportPdfFull`.

## Desain

### Modul baru: `lib/pdf/report-pdf-order.ts`

Satu fungsi murni, tanpa dependensi React/PDF:

```ts
export function orderReportPdfContent<
    T extends { items: ReportItemJson[]; estimations: MaterialEstimationJson[] },
>(data: T): { items: ReportItemJson[]; estimations: MaterialEstimationJson[] };
```

- `items` → `[...data.items].sort(compareChecklistItemsById)`.
- `estimations` → `[...data.estimations].sort((a, b) =>
  compareChecklistItemIds(a.itemId, b.itemId))`.
- `Array.prototype.sort` stable, sehingga beberapa material pada item yang sama
  tetap dalam urutan input BMS.
- Tidak memutasi array input.

Dipisah dari `generate-report-pdf.ts` (±3100 baris, mengimpor
`@react-pdf/renderer`) agar mudah diuji secara terisolasi.

### Integrasi di `generateReportPdf`

Di awal `generateReportPdf`, sebelum dokumen dibangun, data diganti dengan versi
terurut:

```ts
const orderedData = { ...data, ...orderReportPdfContent(data) };
```

lalu `orderedData` dipakai untuk seluruh proses berikutnya (termasuk
`buildReportDocument`). Tidak ada perubahan lain di renderer:

- `groupItemsByCategory` otomatis menghasilkan kategori berurutan karena item
  sudah terurut.
- Pembagian dua kolom (`USE_TWO_COLUMNS`) otomatis menjadi kiri = A…tengah,
  kanan = lanjutannya, sesuai komentar di kode.
- Tabel estimasi dan Detail Penyelesaian membaca array yang sudah terurut.

Pemanggil (`generate-pjum-package-pdf.ts`, `report-pdf-builder.ts`, route
preview) tidak diubah.

### Kasus tepi

- **Item di luar katalog** (ID tak dikenal/data lama): diletakkan di akhir,
  diurutkan per prefix huruf lalu angka — perilaku bawaan
  `compareChecklistItemIds`.
- **`categoryName` tersimpan berbeda dari katalog**: item tetap dikelompokkan
  menurut nama tersimpan (perilaku `groupItemsByCategory` tidak diubah); posisi
  grup mengikuti item pertamanya dalam urutan katalog.
- **Estimasi dengan `itemId` yang tidak ada di `items`**: tetap tampil, posisinya
  menurut comparator yang sama.

## Pengujian

`lib/pdf/report-pdf-order.spec.ts`, gaya sama dengan spec PDF yang ada
(`node:assert/strict`, dijalankan `npx tsx lib/pdf/report-pdf-order.spec.ts`):

1. Item acak `G2, E1, A10, A2, G1, I11, I2` → `A2, A10, E1, G1, G2, I2, I11`.
2. Estimasi acak diurutkan per item; dua material pada item yang sama tetap
   dalam urutan input.
3. Array input tidak termutasi.

Verifikasi visual: generate PDF lewat `/api/preview-pdf` di dev server dengan
data contoh yang urutannya diacak; pastikan tabel checklist, tabel estimasi,
dan Detail Penyelesaian berurutan.
