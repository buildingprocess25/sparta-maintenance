# Skip Preventif di Bulan Pertama Kuartal — Design

Tanggal: 2026-10-29
Role terdampak: BMS (pembuat laporan), BMC/BNM/Admin (melihat penanda)

## Latar belakang

Saat ini mode checklist ditentukan per **toko** per **kuartal kalender (WIB)**:

- Toko belum punya laporan non-draft dengan bukti preventif I1–I10 lengkap di
  kuartal berjalan → **Mode Checklist Wajib**: semua item A–H dan I1–I13 wajib
  dievaluasi (client `validateStep1` di `use-checklist.ts`, server di
  `submit.ts` + `resolvePreventiveSubmission`).
- Sudah ada → **Mode Perbaikan**: kategori I disembunyikan (kecuali signage yang
  belum terisi), BMS cukup memilih item rusak.

BMS yang datang ke toko untuk perbaikan urgent/insidentil terpaksa mengisi
seluruh checklist preventif dulu. Request: beri opsi lewati preventif, terbatas
di bulan pertama kuartal.

## Aturan

1. **Kapan boleh skip.** Opsi "Lewati Preventif" hanya tersedia bila semua
   terpenuhi:
   - Mode toko saat ini adalah Mode Checklist Wajib (I1–I10 belum tercatat di
     kuartal berjalan).
   - Waktu sekarang (WIB) ada di bulan pertama kuartal: Januari, April, Juli,
     atau Oktober.
   - Toko belum pernah di-skip di kuartal berjalan (lihat aturan 3).
   - Bukan mode revisi (laporan baru atau draft).
2. **Efek skip.** Form berperilaku persis seperti Mode Perbaikan dan **seluruh
   kategori I disembunyikan, termasuk signage I11–I13**. BMS cukup memilih item
   rusak A–H; minimal satu item terisi; validasi item rusak tetap sama. Server
   membuang semua item kategori I dari payload laporan yang di-skip.
3. **Sekali per toko per kuartal.** Toko dianggap sudah memakai jatah skip bila
   ada laporan untuk toko itu dengan `preventiveSkipped = true`, `createdAt` di
   kuartal berjalan, dan status **bukan** `DRAFT` maupun `ESTIMATION_REJECTED`.
   Laporan skip yang ditolak permanen mengembalikan jatah. Jatah dihitung per
   toko, bukan per BMS.
4. **Laporan skip tidak dihitung preventif.** Karena tidak berisi I1–I10, toko
   tetap "belum preventif". Laporan berikutnya untuk toko itu (bulan ke-1
   setelah jatah habis, atau bulan ke-2/3) kembali Mode Checklist Wajib tanpa
   opsi skip. KPI, coverage, matriks tahunan, dan export preventif tidak perlu
   diubah.
5. **Waktu acuan.** Kelayakan dihitung dari waktu server saat submit, bukan
   `draftCreatedAt`. Draft yang dibuat 31 Oktober lalu dikirim 1 November
   ditolak sebagai skip dan BMS harus mengisi checklist lengkap.
6. **Bulan ke-2 dan ke-3.** Tidak ada perubahan perilaku.

## Revisi

Laporan yang ditolak dengan revisi (`ESTIMATION_REJECTED_REVISION`,
`REVIEW_REJECTED_REVISION`) dan punya `preventiveSkipped = true` tetap dibuka
dalam Mode Perbaikan tanpa kategori I, kapan pun revisi dilakukan. Flag tidak
berubah saat resubmit. Tagihan preventif tetap berlaku untuk laporan baru
berikutnya.

## Data

- Kolom baru `Report.preventiveSkipped Boolean @default(false)`. Perubahan
  `schema.prisma` dikerjakan agent; perintah Prisma (migrate, generate)
  dijalankan sendiri oleh developer mengikuti tutorial di akhir eksekusi.
  Disimpan juga pada draft (status DRAFT) agar pilihan skip ikut
  tersimpan saat autosave dan dipulihkan saat draft dibuka lagi.
- `DraftData` mendapat field opsional `skipPreventive: boolean` (default
  `false`). Server tidak mempercayai nilai ini: pada submit, skip hanya
  diterapkan bila aturan 1 lolos di server; bila tidak lolos, submit ditolak
  dengan pesan jelas (bukan diam-diam dijadikan wajib).
- ActivityLog `SUBMITTED` untuk laporan skip memakai `notes: "Preventif
  dilewati (bulan pertama kuartal)"`. Tidak ada enum baru.
- Tidak ada field alasan.

## Komponen

- **`lib/preventive-skip.ts` (baru, pure).** `isFirstMonthOfJakartaQuarter(now)`,
  `getPreventiveSkipBlocker({ coreCooling, alreadySkippedThisQuarter, now })`
  (alasan penolakan atau `null`), dan `canSkipPreventive(...)`. Pengecualian
  mode revisi ditangani di client, bukan di fungsi ini. Diuji unit (spec file
  berdampingan, mengikuti pola `preventive-cooldown.spec.ts`).
- **`lib/preventive-cooldown.ts`.** Tidak berubah. Untuk laporan skip,
  `resolvePreventiveSubmission` dipanggil dengan `{ core: true, signage: true }`
  (buang semua item I, tidak ada item wajib).
- **Query `hasSkippedPreventiveThisQuarter(storeCode)`** di
  `app/reports/actions/queries.ts`, dipakai oleh form dan submit.
- **`submit.ts`.** Hitung kelayakan di server; bila `data.skipPreventive` dan
  layak, jalankan validasi gaya Mode Perbaikan (lewati cek item A–H lengkap),
  simpan `preventiveSkipped: true` (create dan promote draft), dan tulis notes
  ActivityLog.
- **`draft.ts`.** `saveServerDraft` menyimpan flag; `serializeDraft` dan
  `SerializedDraft` mengembalikannya.
- **`resubmit.ts`.** Tidak mengubah flag. Bila laporan `preventiveSkipped`, buang
  item kategori I dari payload (cegah bypass).
- **`use-checklist.ts`.** State `skipPreventive` dan `canSkipPreventive`
  (dihitung saat toko dipilih). `filterActiveCategories` dan `validateStep1`
  memperlakukan skip seperti core+signage cooling. Reset skip saat toko
  berganti.
- **`create-form.tsx`.** `isRepairOnlyMode` menjadi `true` juga saat skip aktif
  atau laporan revisi ber-flag skip. Kirim `skipPreventive` di payload
  submit/draft.
- **`checklist-step.tsx`.** Di banner Mode Checklist Wajib, tampilkan tombol
  "Lewati Preventif" bila `canSkipPreventive`, dengan dialog konfirmasi (shadcn
  `AlertDialog`) yang menjelaskan: hanya bulan pertama, sekali per toko per
  kuartal, preventif tetap wajib di kunjungan berikutnya. Saat skip aktif,
  banner Mode Perbaikan menyebut "Preventif dilewati" dan ada tombol
  "Batalkan skip" untuk kembali ke Mode Checklist Wajib.
- **Halaman revisi.** Ambil `preventiveSkipped` dan teruskan ke form.
- **Penanda.** Badge "Preventif dilewati" di header detail laporan reviewer
  (`app/dashboard/reports/[reportNumber]`, dipakai BMC/BNM/Admin). Tampilan
  detail milik BMS, daftar laporan, dan export XLSX tidak diubah.

## Penanganan error

- Skip dikirim tapi tidak layak (bulan ke-2/3, jatah habis, toko sudah
  preventif) → submit ditolak: "Preventif tidak dapat dilewati" + detail
  penyebab. Client memuat ulang status toko agar form kembali ke mode yang
  benar.
- Gagal memuat status skip di client → `canSkipPreventive = false` (fail
  closed), seperti fallback cooldown saat ini.

## Testing

- Unit: `preventive-skip.spec.ts` (batas bulan WIB, mis. 31 Okt 23:59 WIB vs
  1 Nov 00:00 WIB; semua kombinasi kelayakan) dan `types.spec.ts`
  (`skipPreventive` tidak dibuang oleh schema).
- Manual (`npm run dev`, akun BMS): skip di bulan pertama; coba skip kedua untuk
  toko yang sama (opsi hilang); simulasi bulan ke-2 (opsi hilang); revisi
  laporan skip tetap Mode Perbaikan; badge terlihat oleh BMC/BNM.

## Di luar cakupan

- Field alasan skip.
- Kolom skip di daftar laporan atau export XLSX.
- Perubahan KPI/coverage preventif.
