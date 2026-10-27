# Standar Kondisi Baik di Form Checklist BMS Design

## Problem

Saat mengisi checklist, BMS memilih Baik/Rusak/Tidak Ada tanpa acuan tertulis
tentang kapan sebuah item dianggap "baik". Form resmi FCKT
(SAT/FRM/MED/001, file `FCKT Draft_Rev_SAT_FRM_MED_001_Form Checklist Kondisi
Toko_250925.xlsx`, Sheet2) sudah memuat kolom **"Catatan Kondisi Baik"** untuk
setiap item kategori A–H. User meminta standar ini ditampilkan di aplikasi.

## Goals

- Menampilkan standar kondisi baik untuk 115 item kategori A–H di form checklist
  BMS (buat, edit draft, revisi), selalu terlihat di bawah nama item.
- Data standar berasal dari Sheet2 FCKT, dicocokkan berdasarkan nama item.

## Non-Goals

- Tidak menampilkan standar di detail laporan (dashboard maupun BMS), PDF,
  export, atau tempat lain.
- Tidak menambah standar untuk kategori I (I1–I10 sudah punya deskripsi
  "tindakan perawatan"; I11–I13 signage tidak ada di FCKT).
- Tidak menambah item "Stop Kontak ATM" (ada di FCKT B11, tidak ada di aplikasi).
- Tidak mengubah ID, nama, atau urutan item katalog.
- Tidak ada perubahan database, validasi, atau alur status.

## Sumber Data dan Pencocokan

Sheet2 FCKT tidak bisa dipetakan berdasarkan kode karena kodenya berbeda dari
katalog aplikasi:

- Kamar Mandi: kode D3 dipakai dua kali di Sheet2, sehingga D4–D12 aplikasi
  bergeser satu nomor dari Sheet2.
- Bagian Atap: urutan berbeda (Sheet2 H1 = Atap, H2 = Rangka; aplikasi H1 =
  Rangka Atap, H3 = Atap).
- Area Sales: Sheet2 punya B11 "Stop Kontak ATM", sehingga Freezer dan Kusen P1
  di Sheet2 bernomor B12/B13, sedangkan di aplikasi B11/B12.

Karena itu pencocokan dilakukan berdasarkan **nama item** dalam kategori yang
sama. Seluruh 115 item A–H aplikasi mendapat padanan; satu baris Sheet2 (Stop
Kontak ATM) tidak dipakai.

Pembersihan teks (tanpa mengubah makna):

- Salah ketik jelas diperbaiki: "todak tersumbat" → "tidak tersumbat" (C11).
- Spasi setelah koma dirapikan ("Tidak pecah,tidak retak" → "Tidak pecah, tidak retak").
- Spasi di awal/akhir dibuang. Ejaan lain dibiarkan seperti dokumen (mis. "rapih").

Tabel lengkap hasil pencocokan ada di Lampiran.

## Desain

### Data — `lib/checklist-data.ts`

Tambah field opsional pada `ChecklistCatalogItem`:

```ts
/** Standar kondisi baik dari form FCKT (SAT/FRM/MED/001), kategori A–H. */
standard?: string;
```

Isi `standard` pada setiap item A–H sesuai Lampiran. Item kategori I tidak diisi.
Field berada langsung di item katalog (pola yang sama dengan `desc`, `signage`,
`photoGuide`) agar nama item dan standarnya tidak pernah terpisah.

### Tampilan — `app/reports/(bms)/create/components/checklist-step.tsx`

Di kartu item biasa (bukan `SignageChecklistItem`), di blok judul setelah `<h4>`
nama item dan sebelum `desc`/link contoh foto, tampilkan:

```tsx
{item.standard ? (
  <p className="text-xs text-muted-foreground">
    <span className="font-medium">Standar baik:</span> {item.standard}
  </p>
) : null}
```

- Selalu tampil, tidak bergantung pada kondisi yang dipilih.
- Karena form buat, edit, dan revisi memakai `ChecklistStep` yang sama, ketiganya
  otomatis mendapat standar.
- Pencarian checklist tidak diubah (tetap mencari nama item dan kategori).

## Testing

File baru `lib/checklist-standard.spec.ts` (pola `node:assert/strict`, jalankan
`npx tsx`):

- Setiap item kategori A–H punya `standard` berupa string tidak kosong.
- Tidak ada item kategori I yang punya `standard`.
- Jumlah item ber-standar = 115.
- Contoh pencocokan yang kodenya bergeser:
  - D4 Plafon Kamar Mandi → "Tidak kusam, tidak berlubang"
  - D9 Kloset → "Bersih, tidak tersumbat, tidak retak/pecah"
  - H1 Rangka Atap → "Tidak keropos, tidak patah"
  - H3 Atap Asbes/Zingalum/Genteng → "Tidak retak/pecah, tidak berlubang, tidak sobek"
  - B11 Stop Kontak Freezer → "Tidak lepas, tidak pecah, ada arus listrik"
  - B12 Kusen + Daun Pintu P1 → "Tidak keropos, bisa terkunci"
  - C11 Janitor → "Bersih, tidak tersumbat"

Verifikasi manual di dev server (viewport 375px): teks "Standar baik: …" tampil
di bawah nama item kategori A–H, tidak tampil di kategori I, dan tidak membuat
kartu atau tombol kondisi berantakan.

## Lampiran — Standar Kondisi Baik per Item

| ID | Item | Standar kondisi baik |
|---|---|---|
| A1 | Bahu Jalan | Tidak berlubang, tidak bergelombang |
| A2 | Dekker/Grill Drainase | Tidak pecah, tidak retak, tidak patah |
| A3 | Pagar/Rantai Besi | Tidak keropos, tidak patah |
| A4 | Lampu Pole Sign | Tidak kusam, tidak mati |
| A5 | Lampu Shop Sign | Tidak kusam, tidak mati |
| A6 | Lampu Listplank | Tidak kusam, tidak mati |
| A7 | Halaman Parkir | Tidak berlubang, tidak bergelombang |
| A8 | Pompa air + Instalasi | Pompa hidup, mengeluarkan air, tidak bocor |
| A9 | PDAM + Instalasi | Meter air tersegel, tidak bocor, mengeluarkan air |
| A10 | Dinding Pembatas Halaman | Tidak kusam, tidak retak/pecah |
| A11 | Tiang Lampu Parkir | Tidak patah, tidak keropos |
| A12 | Lampu Parkir (LED Tube/LED Sorot)* | Hidup dan bersih |
| A13 | Awning/kanopi + talang | Tidak bocor, tidak keropos |
| A14 | Lampu Awning/kanopi & lampu tutup toko | Hidup dan bersih |
| A15 | Folding Gate/Pintu Besi Lipat/Rolling Door | Tidak macet, tidak patah |
| A16 | Lantai Keramik Teras | Tidak kusam, tidak retak/pecah |
| A17 | Dinding Teras | Tidak kusam, tidak retak/pecah |
| A18 | Panel Listrik | Bersih, kabel & MCB tertata rapih serta berfungsi |
| A19 | Ohm Saklar/COS | Berfungsi dan terkoneksi baik |
| A20 | Stabilizer | Berfungsi, kapasitas terpenuhi, dan berpengaman |
| A21 | Saklar | Berfungsi, tidak lepas/tidak pecah, terkoneksi baik |
| A22 | Segel Kwh meter listrik / MCB PLN | Terpasang dan tidak putus |
| A23 | Angkur Genset | Menempel kokoh di dinding |
| A24 | Stop Kontak Genset + Kabel | Tidak lepas, tidak pecah, ada arus listrik |
| A25 | Stop kontak Tenan | Tidak lepas, tidak pecah, ada arus listrik |
| A26 | Plafon Teras | Tidak kusam, tidak berlubang |
| A27 | Manhole dalam (plafon teras) | Tidak kusam, tidak berlubang |
| A28 | Lampu Teras | Hidup dan bersih |
| A29 | Rangka/Dudukan sarana promo | Tidak keropos, tidak patah, tidak korosi/karat |
| A30 | Pintu Alumunium + Kaca Single/Double Swing | Tidak bergesekan, tidak ngebanting, tidak pecah |
| A31 | Floor Hinge | Bersih, tidak bocor |
| A32 | Kusen Alumunium & Kaca | Tidak pecah, tidak retak, tidak patah |
| B1 | Lampu Sales | Hidup dan bersih |
| B2 | Plafon Sales | Tidak kusam, tidak berlubang |
| B3 | Dinding Sales | Tidak kusam, tidak retak/pecah |
| B4 | Lantai Keramik Sales | Tidak kusam, tidak retak/pecah |
| B5 | Tiang/Kolom | Tidak kusam, tidak retak/pecah |
| B6 | Instalasi Listrik Area Kasir | Tertata rapih, berpengaman |
| B7 | Stop Kontak Area Kasir | Tidak lepas, tidak pecah, ada arus listrik |
| B8 | Meja Kasir + Aksesoris | Tidak patah, tidak lepas, kunci laci berfungsi |
| B9 | Stop Kontak Chiller | Tidak lepas, tidak pecah, ada arus listrik |
| B10 | Exhaust Fan Ruang Chiller | Berfungsi dan bersih |
| B11 | Stop Kontak Freezer | Tidak lepas, tidak pecah, ada arus listrik |
| B12 | Kusen + Daun Pintu P1 | Tidak keropos, bisa terkunci |
| C1 | Lampu selasar | Hidup dan bersih |
| C2 | Plafon Selasar | Tidak kusam, tidak berlubang |
| C3 | Manhole dalam (plafon selasar) | Tidak kusam, tidak berlubang |
| C4 | Manhole luar (dak toren air) | Tidak keropos, tidak korosi/karat, terkunci gembok |
| C5 | Dinding Selasar | Tidak kusam, tidak retak/pecah |
| C6 | Panel Listrik | Bersih, kabel & MCB tertata rapih serta berfungsi |
| C7 | Ohm Saklar/COS | Berfungsi dan terkoneksi baik |
| C8 | Stabilizer | Berfungsi, kapasitas terpenuhi, dan berpengaman |
| C9 | Saklar | Berfungsi, tidak lepas/tidak pecah, terkoneksi baik |
| C10 | Lantai Keramik Selasar | Tidak retak/pecah, tidak kusam |
| C11 | Janitor | Bersih, tidak tersumbat |
| C12 | Kran Janitor | Berfungsi, tidak bocor, tidak patah |
| C13 | Floor Drain Janitor | Tidak tersumbat, tutup drain terpasang |
| C14 | Kitchen Sink | Tidak bocor/keropos, bersih |
| C15 | Kran Kitchen Sink | Berfungsi, tidak bocor, tidak patah |
| C16 | Saluran Air Bersih | Tidak bocor, tidak pecah/patah, tidak tersumbat |
| C17 | Saluran Air Kotor | Tidak bocor, tidak pecah/patah, tidak tersumbat |
| C18 | Pompa air + Instalasi | Pompa hidup, mengeluarkan air, tidak bocor |
| D1 | Pintu Kamar Mandi | Tidak macet, tidak keropos, bisa terkunci |
| D2 | Lampu Kamar Mandi | Hidup dan bersih |
| D3 | Exhaust Fan | Tidak kotor, tidak mati |
| D4 | Plafon Kamar Mandi | Tidak kusam, tidak berlubang |
| D5 | Dinding Kamar Mandi | Tidak kusam, tidak retak/pecah |
| D6 | Lantai Kamar Mandi | Tidak kusam, tidak retak/pecah |
| D7 | Floor Drain Kamar Mandi | Tidak tersumbat, tutup drain terpasang |
| D8 | Kran Air | Berfungsi, tidak bocor, tidak patah |
| D9 | Kloset | Bersih, tidak tersumbat, tidak retak/pecah |
| D10 | Septictank | Tidak penuh, tidak mampet/tersumbat |
| D11 | Saluran Air Bersih | Tidak bocor, tidak pecah/patah, tidak tersumbat |
| D12 | Saluran Air Kotor | Tidak bocor, tidak pecah/patah, tidak tersumbat |
| E1 | Kusen + daun pintu P2 | Tidak keropos, bisa terkunci |
| E2 | Lampu Gudang | Hidup dan bersih |
| E3 | Plafon Gudang | Tidak kusam, tidak berlubang |
| E4 | Exhaust Fan | Tidak kotor, tidak mati |
| E5 | Dinding Gudang | Tidak kusam, tidak retak/pecah |
| E6 | Partisi ruang kepala toko (T120) | Tidak kusam, tidak retak/pecah |
| E7 | Panel Listrik | Bersih, kabel & MCB tertata rapih serta berfungsi |
| E8 | Ohm Saklar/COS | Berfungsi dan terkoneksi baik |
| E9 | Stabilizer | Berfungsi, kapasitas terpenuhi, dan berpengaman |
| E10 | Saklar | Berfungsi, tidak lepas/tidak pecah, terkoneksi baik |
| E11 | Stop kontak | Tidak lepas, tidak pecah, ada arus listrik |
| E12 | Lantai keramik Gudang + kantor | Tidak kusam, tidak retak/pecah |
| E13 | Rooster | Tidak pecah |
| E14 | Glasblok | Tidak pecah, tidak kusam |
| E15 | Teralis (jendela/pintu) | Tidak korosi/karat, tidak patah |
| F1 | Kusen + Daun Pintu + Jendela | Tidak keropos, bisa terkunci |
| F2 | Lampu Mess/R. Kantor | Hidup dan bersih |
| F3 | Exhaust Fan Mess/R. Kantor | Tidak kotor, tidak mati |
| F4 | Plafon Mess/R. Kantor | Tidak kusam, tidak berlubang |
| F5 | Dinding Mess/R. Kantor | Tidak kusam, tidak retak/pecah |
| F6 | Saklar Lampu Mess/R. Kantor | Berfungsi, tidak lepas/tidak pecah, terkoneksi baik |
| F7 | Stop Kontak Mess/R. Kantor | Tidak lepas, tidak pecah, ada arus listrik |
| F8 | Lantai Keramik Mess/R. Kantor | Tidak kusam, tidak retak/pecah |
| F9 | Teralis (jendela/pintu) | Tidak korosi/karat, tidak patah |
| G1 | Trap Anak Tangga | Tidak retak/pecah, tidak patah |
| G2 | Railing Tangga | Tidak retak/pecah, tidak patah |
| G3 | Kusen + Daun Pintu + Jendela | Tidak keropos |
| G4 | Lampu Ruang Atas/Lt. 2 | Hidup dan bersih |
| G5 | Exhaust Fan Ruang Atas/Lt. 2 | Berfungsi dan bersih |
| G6 | Plafon Ruang Atas/Lt. 2 | Tidak kusam, tidak berlubang |
| G7 | Dinding Ruang Atas/Lt. 2 | Tidak kusam, tidak retak/pecah |
| G8 | Saklar Lampu Ruang Atas/Lt. 2 | Berfungsi, tidak lepas/tidak pecah, terkoneksi baik |
| G9 | Stop Kontak Ruang Atas/Lt. 2 | Tidak lepas, tidak pecah, ada arus listrik |
| G10 | Lantai Keramik Ruang Atas/Lt. 2 | Tidak kusam, tidak retak/pecah |
| G11 | Teralis (jendela/pintu) | Tidak korosi/karat, tidak patah |
| H1 | Rangka Atap | Tidak keropos, tidak patah |
| H2 | Talang | Tidak retak/pecah, tidak ada sampah |
| H3 | Atap Asbes/Zingalum/Genteng | Tidak retak/pecah, tidak berlubang, tidak sobek |
| H4 | Listplank | Tidak patah/lepas |
| H5 | Roof Drain | Tidak tersumbat, tutup drain terpasang (jika ada) |
| H6 | Pipa Instalasi Air Hujan | Tidak pecah/bocor, tidak tersumbat |
