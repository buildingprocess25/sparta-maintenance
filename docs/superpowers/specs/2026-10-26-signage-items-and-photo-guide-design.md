# Item Signage I.11–I.13 & Popup Contoh Foto Design

Dua fitur independen yang dikirim dalam satu spec. Keduanya bisa diimplementasi
dan di-deploy terpisah.

- **Bagian A:** tambah item preventif I.11 Shop Sign, I.12 List Plank, I.13 Pole
  Sign dengan alur Material → Kondisi.
- **Bagian B:** popup contoh foto yang benar (terkunci 5 detik) untuk item KwH
  dan Panel Listrik.

---

## Bagian A — Item Signage I.11–I.13

### Problem

User meminta tiga item baru di kategori I (Preventif). Berbeda dengan item lain
(Baik/Rusak/Tidak Ada), item ini meminta BMS memilih **material** dulu, lalu
**kondisi** dari empat pilihan. Kondisi Pudar/Rusak selalu ditangani Rekanan.

Penambahan item ke kategori I juga berisiko: aturan "preventif lengkap" saat ini
mewajibkan **semua** item kategori I (`PREVENTIVE_ITEM_IDS`). Jika I11–I13
ditambahkan begitu saja, seluruh laporan preventif lama (I1–I10) dianggap tidak
lengkap: cooldown kuartal reset, KPI BMS, coverage, matriks tahunan, dan export
preventif ikut rusak.

### Goals

- Menambah I11, I12, I13 dengan alur Material → Kondisi, foto wajib.
- Kondisi Pudar/Rusak otomatis handler REKANAN, wajib Catatan + No Tiket AHO.
- Kondisi Baik/Kotor tanpa handler, cukup foto.
- Ketiga item berbagi satu No Tiket AHO.
- Data lama tetap dihitung sebagai preventif lengkap tanpa migrasi.
- Material dan kondisi asli tersimpan di field sendiri agar bisa diambil
  SPARTA Cleaning di masa depan.
- Label di PDF dan semua tampilan detail menampilkan kondisi + material.

### Non-Goals

- Tidak membuat integrasi/trigger ke SPARTA Cleaning (jadwal cleaning tahunan
  maupun pengajuan rekondisi).
- Tidak mengubah enum Prisma (`PreventiveCondition`, `HandlerType`, `ReportStatus`).
- Tidak membuat migration database.
- Tidak menambah filter/export khusus data signage.
- Tidak mengubah transisi status atau aturan approval.

### Definisi Item

| ID | Nama | Material | Tidak Ada? |
|---|---|---|---|
| I11 | Kondisi Fisik Shop Sign | Embos, Acrylic | Tidak |
| I12 | Kondisi Fisik List Plank | Embos, Acrylic, ACP/Alucopan | Tidak |
| I13 | Kondisi Fisik Pole Sign | Acrylic, Vynil | **Ya** |

Kondisi untuk semua item: Baik, Kotor, Pudar, Rusak (pilih satu).

### Pemetaan Kondisi

| Pilihan BMS | `condition` (form) | `preventiveCondition` (JSON) | `handler` | Wajib |
|---|---|---|---|---|
| Baik | `baik` | `OK` | — | Foto |
| Kotor | `baik` | `OK` | — | Foto |
| Pudar | `rusak` | `NOT_OK` | `REKANAN` (terkunci) | Foto, Catatan, No Tiket AHO |
| Rusak | `rusak` | `NOT_OK` | `REKANAN` (terkunci) | Foto, Catatan, No Tiket AHO |
| Tidak Ada (I13 saja) | `tidak_ada` | `TIDAK_ADA` | — | — |

Karena Pudar/Rusak tersimpan sebagai `NOT_OK` + `REKANAN`, logika yang sudah ada
tetap benar tanpa perubahan:

- tidak masuk estimasi BMS dan tidak memotong saldo (`hasBmsRepairItems`),
- laporan yang hanya punya kerusakan Rekanan masuk jalur cepat
  `PENDING_CHECKLIST_REVIEW` (`isChecklistOnlyReport`, `isRekananZeroCost`),
- tidak muncul di halaman penyelesaian (khusus handler BMS),
- dihitung di statistik Not OK dashboard preventif.

### Katalog (`lib/checklist-data.ts`)

Tambah field opsional pada item katalog:

```ts
signage?: {
    materials: readonly string[];
    allowNotAvailable?: boolean;
};
ahoTicketGroup?: "signage";
```

I11–I13 ditambahkan di akhir kategori I dengan `signage` dan
`ahoTicketGroup: "signage"`. ID item lama tidak berubah.

Tambah ke `ChecklistItem` (state form):

```ts
signageMaterial?: string;        // salah satu dari signage.materials, atau "TIDAK_ADA"
signageCondition?: "baik" | "kotor" | "pudar" | "rusak";
```

Tambah ke `ChecklistItemData` (`app/reports/actions/types.ts`) dan
`ReportItemJson` (`types/report.ts`):

```ts
signageMaterial?: string;
signageCondition?: "BAIK" | "KOTOR" | "PUDAR" | "RUSAK";
```

Saat Tidak Ada dipilih, `signageMaterial` tidak disimpan di JSON (cukup
`preventiveCondition: TIDAK_ADA`).

### Form Checklist

Komponen baru `SignageChecklistItem` di
`app/reports/(bms)/create/components/`, dirender oleh `ChecklistStep` untuk item
yang punya `signage`. Gaya tombol pilihan mengikuti RadioGroup segmented yang
sudah ada.

1. **Material**: tombol pilihan tunggal. I13 menambah pilihan **Tidak Ada**.
2. **Kondisi**: muncul setelah material dipilih (dan bukan Tidak Ada). Grid 2×2:
   Baik · Kotor · Pudar · Rusak.
3. Pudar/Rusak: label statis **"Ditangani Rekanan"** menggantikan pilihan
   handler, lalu Foto Bukti, Catatan, No Tiket AHO.
4. Baik/Kotor: Foto Bukti saja.
5. Mengganti material tidak menghapus kondisi. Memilih Tidak Ada menghapus
   kondisi, foto, catatan, dan No Tiket AHO.
6. Klik ulang kondisi yang sudah terpilih membatalkan pilihan (perilaku sama
   dengan item lain).

`use-checklist.ts` mendapat updater khusus signage yang mengisi `condition` dan
`handler` dari `signageCondition` (fungsi murni `deriveSignageState`, dites).
Validasi `validateStep1` yang sudah ada tetap berlaku karena memakai
`condition`; ditambah pengecekan "material wajib dipilih" untuk item signage.

### No Tiket AHO — Grup Signage

Aturan saat ini: dropdown `LocalAhoInput` menandai tiket yang dipakai item lain
sebagai "Terpilih" dan tidak bisa dipilih. Ketik manual tidak dicek, server
tidak mengecek.

Aturan baru:

- I11–I13 adalah satu grup (`ahoTicketGroup: "signage"`) dengan **satu tiket**.
- Item signage pertama yang menjadi Pudar/Rusak dan diisi tiket menentukan tiket
  grup. Item signage lain yang kemudian menjadi Pudar/Rusak **otomatis terisi**
  tiket grup.
- Mengganti tiket di salah satu item signage mengganti tiket di **semua** item
  signage yang Pudar/Rusak.
- Tiket grup signage terkunci ("Terpilih") untuk semua item non-signage, dan
  tiket item non-signage terkunci untuk item signage.
- Antar item non-signage, satu tiket tetap hanya untuk satu item (seperti
  sekarang).
- Ketik manual mengikuti aturan yang sama: tombol "Pakai" disabled dengan
  keterangan jika nomor sudah dipakai di luar grup item tersebut.

Implementasi: fungsi murni `getLockedAhoTickets(itemId, checklist)` di `lib/`
menghitung set tiket terkunci untuk satu item dengan mengabaikan item lain di
grup yang sama. `ChecklistStep` meneruskan hasilnya ke `LocalAhoInput` per item
(menggantikan `selectedAhoTickets` global). `LocalAhoInput` memakai set itu juga
untuk validasi input manual.

### Validasi Server

Di `buildDraftDataSchema` (`app/reports/actions/types.ts`):

- `signageMaterial` dan `signageCondition` hanya boleh ada pada item dengan
  `signage` di katalog.
- `signageMaterial` harus termasuk `signage.materials` item tersebut.
- Item signage dengan `preventiveCondition` OK/NOT_OK wajib punya
  `signageMaterial` dan `signageCondition`.
- `signageCondition` konsisten: BAIK/KOTOR ⇔ OK, PUDAR/RUSAK ⇔ NOT_OK.
- PUDAR/RUSAK wajib `handler: REKANAN`.
- `TIDAK_ADA` hanya untuk item dengan `allowNotAvailable`.
- No Tiket AHO (abaikan item tanpa tiket):
  - tidak ada duplikat antar item non-signage,
  - semua item signage NOT_OK memakai tiket yang sama,
  - tiket grup signage tidak dipakai item non-signage.

Pengecekan berlaku saat submit dan resubmit (`requireDamagedDetails: true`),
tidak berlaku untuk autosave draft. Konsekuensi: laporan lama yang terlanjur
memakai tiket duplikat lewat ketik manual harus diperbaiki saat direvisi.

Di `submit.ts`, saat bukan cooldown dan payload berisi item preventif, seluruh
item kategori I (I1–I13) wajib ada. Saat ini server belum memeriksa kelengkapan
kategori I sama sekali.

`buildItemsJson` (`report-json-helpers.ts`) meneruskan `signageMaterial` dan
`signageCondition`. `draft-data.ts` memetakan nilai form ke JSON (huruf besar),
dan pemuatan draft/edit/revisi (`use-draft.ts`, `edit/[id]/page.tsx`,
`revisi/[reportNumber]/page.tsx`) memetakan balik ke state form.

### Aturan Preventif Lengkap (Pendekatan A)

Di `lib/report-preventive.ts` tambah konstanta eksplisit:

```ts
// Set item yang menentukan laporan "preventif lengkap". Sengaja dibekukan ke
// I1–I10: laporan sebelum I11–I13 ada tetap harus dihitung lengkap.
// Item preventif baru diwajibkan lewat validasi submit, bukan lewat set ini.
export const PREVENTIVE_REQUIRED_ITEM_IDS = [
    "I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10",
] as const;
```

`hasCompletePreventiveEvidence` dan `completePreventiveEvidenceSql` memakai
`PREVENTIVE_REQUIRED_ITEM_IDS`. `PREVENTIVE_ITEM_IDS` (semua item I) tetap untuk
UI dan validasi submit. Seluruh konsumen (cooldown `getLastCategoryIDate`, KPI
BMS, coverage, matriks tahunan, export admin, workbench detail, dashboard
reports) otomatis memakai aturan baru tanpa diubah.

### Label Kondisi Terpusat

Helper baru `describeItemCondition(item)` di `lib/checklist-condition.ts`:

```ts
type ItemConditionDescription = {
    label: string;           // "Baik", "Rusak", "OK", "Not OK", "Tidak Ada", "Kotor", "Pudar", "-"
    detail?: string;         // material signage, mis. "Acrylic"
    tone: "baik" | "rusak" | "tidak_ada";
};
```

- Item non-signage: hasil identik dengan label sekarang.
- Item signage: label dari `signageCondition` (Baik/Kotor/Pudar/Rusak), detail
  material, tone `baik` untuk Baik/Kotor dan `rusak` untuk Pudar/Rusak. Tampilan
  gabungan: **"Rusak · Acrylic"**.
- Kotor memakai warna OK (hijau); hanya teks yang berbeda.

Mengganti implementasi label lokal di:

- `lib/pdf/generate-report-pdf.ts` (`conditionLabel`, `conditionStyle`, tile galeri)
- `lib/pdf/generate-revision-pdf.ts`
- `lib/pdf/checklist-photo-gallery.ts`
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`
- `app/dashboard/reports/[reportNumber]/_components/` (`shared-ui.tsx`,
  `documentation-tab.tsx`, `photo-dialog.tsx`, `work-cost-tab.tsx`)
- `app/reports/[reportNumber]/report-detail-view.tsx`
- `app/reports/(bms)/create/components/review-step.tsx`
- `scripts/export-preventive-photos.ts`

Field signage yang perlu dibawa ke data PDF/detail ikut ditambahkan pada tipe
perantara (mis. tile galeri, `ReportPdfData`).

---

## Bagian B — Popup Contoh Foto KwH & Panel Listrik

### Problem

Foto KwH sering tidak memperlihatkan segel, dan foto Panel Listrik tidak
memperlihatkan MCB dan wiring. User ingin BMS melihat contoh foto yang benar
sebelum memfoto.

### Goals

- BMS wajib melihat contoh foto (terkunci 5 detik) sebelum kamera terbuka,
  sekali per item per halaman.
- Contoh bisa dilihat ulang kapan saja tanpa hitung mundur.
- Berlaku di form checklist (buat/edit/revisi) dan foto setelah perbaikan di
  halaman penyelesaian.

### Non-Goals

- Tidak menyimpan status "sudah melihat contoh" ke database atau draft.
- Tidak menambah contoh foto untuk item lain.
- Tidak mengubah komponen kamera.

### Item Terkait

| Kunci guide | Item |
|---|---|
| `kwh` | A22 Segel Kwh meter listrik / MCB PLN |
| `panel` | A18, C6, E7 Panel Listrik; I3 Panel Listrik (preventif) |

Katalog item mendapat field opsional `photoGuide?: "kwh" | "panel"`.

### Aset

Dua gambar slide dari user dipakai apa adanya (sudah berisi judul dan
keterangan):

- `public/assets/photo-guides/panel-listrik.png` — slide "Contoh Foto Panel yang Benar"
- `public/assets/photo-guides/kwh.png` — slide "Contoh Foto KwH yang Benar"

`lib/photo-guides.ts` memetakan kunci ke `{ src, title, alt }`. Gambar hanya
dimuat saat popup dibuka.

### Komponen `PhotoGuideDialog`

Di `components/photo-guide-dialog.tsx`, memakai shadcn `Dialog`. Gambar bisa
di-tap untuk dibuka penuh.

- **Mode `gate`:** tanpa tombol X; Esc dan klik di luar diblok. Tombol utama
  "Tunggu N detik…" (disabled) → **"Saya mengerti, ambil foto"** yang menutup
  popup dan membuka kamera. Setelah hitung mundur selesai, tombol "Tutup" juga
  tersedia.
- **Mode `view`:** bisa ditutup kapan saja, tanpa hitung mundur.
- Durasi: konstanta `PHOTO_GUIDE_COUNTDOWN_SECONDS = 5`.
- Hitung mundur mulai setelah gambar `onLoad`, bukan saat popup terbuka.
- Gambar gagal dimuat (`onError`): tampilkan pesan "Gambar contoh gagal dimuat"
  dan aktifkan tombol langsung agar BMS tidak terblokir.

### Hook `usePhotoGuideGate()`

Menyimpan `Set<string>` item yang sudah melihat contoh (state halaman saja).

- `requestCamera(itemId, openCamera)`: jika item punya `photoGuide` dan belum
  dilihat → buka dialog mode gate; jika tidak → `openCamera()` langsung.
- Item ditandai sudah dilihat saat tombol utama menjadi aktif (hitung mundur
  selesai, atau langsung saat gambar gagal dimuat), meskipun BMS memilih
  "Tutup" tanpa memfoto.
- `showGuide(itemId)`: buka dialog mode view.
- Reload halaman mengosongkan state (popup muncul sekali lagi).

### Titik Integrasi

- `ChecklistStep`: tombol "Upload Image" memanggil `requestCamera`; link
  **"Lihat contoh foto"** di bawah nama item untuk item ber-`photoGuide`.
- `CompletionItemSection`: tombol foto setelah perbaikan memanggil
  `requestCamera`; link yang sama untuk item ber-`photoGuide`.

---

## Testing

Belum ada test suite UI. Logika murni dipisah dan dites dengan pola `.spec.ts`
yang ada:

- `deriveSignageState` — pemetaan kondisi signage ke `condition`/`handler`.
- `getLockedAhoTickets` — aturan grup tiket signage vs non-signage.
- Skema zod — material/kondisi tidak valid, handler bukan REKANAN, tiket signage
  berbeda, tiket bentrok dengan non-signage, field signage pada item lain.
- `describeItemCondition` — item non-signage tidak berubah, label signage.
- `report-preventive.spec.ts` — laporan dengan I1–I10 saja tetap lengkap.
- `draft-data.spec.ts` — round-trip field signage.

Verifikasi manual di dev server:

- Form signage (ketiga item, termasuk Tidak Ada di I13, auto-fill tiket grup).
- Popup contoh foto di form checklist dan halaman penyelesaian.
- PDF laporan via `/api/preview-pdf` menampilkan "Kondisi · Material".
- Laporan preventif lama tetap tampil di matriks tahunan dan cooldown toko tetap
  berlaku.
