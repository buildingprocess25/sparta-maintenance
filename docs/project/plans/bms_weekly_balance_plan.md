# 📋 Plan Implementasi Fitur: BMS Weekly Balance

Dokumen rencana eksekusi terstruktur ini dibuat menggunakan metodologi **Writing-Plans** (`obra/superpowers`) merujuk pada `docs/project/10-bms-weekly-balance.md`.

---

## 🎯 Spesifikasi Ringkas & Alur Bisnis
- **Saldo Initial:** Rp 1.000.000 per BMS.
- **Cakupan Laporan:** Hanya berlaku untuk item `RUSAK` dengan handler `BMS`.
- **Validasi Estimasi:** Multi-check total estimasi ≤ Saldo Tersedia (*Hard Blocker*).
- **Mulai Pekerjaan:** Diblokir jika BMS dalam kondisi **Terkunci PJUM** (`LOCKED_PJUM`).
- **Penyelesaian Pekerjaan (Overrun):** Jika Realisasi > Saldo Tersedia:
  - Tampilkan **Warning Banner Alert (Kuning/Oranye)** yang memberitahu bahwa biaya membengkak melampaui saldo.
  - Form diizinkan submit dengan syarat **WAJIB mengisi `unexpectedCostNotes`** (Catatan Biaya Tak Terduga).
- **Pembuatan PJUM (BMC):** Hanya diizinkan jika semua laporan BMS periode aktif sudah terminal (`COMPLETED` / `REJECTED`). Mengubah status periode menjadi `LOCKED_PJUM`.
- **Approval PJUM (BNM):** 
  - `APPROVED` ➡️ Close periode lama, reset saldo BMS ke Rp 1.000.000, unlock BMS.
  - `REJECTED` ➡️ Unlock BMS, periode aktif berlanjut.

---

## 🗺️ Tahapan Eksekusi (Phase Breakdown)

### 📌 Fase 1: Perubahan Skema Database & Migration
- [x] **1.1 Update `schema.prisma`**:
  - Buat model `BmsBalancePeriod` untuk melacak riwayat saldo, status lock PJUM, dan periode aktif BMS.
  - Tambah kolom `unexpectedCostNotes` & `balancePeriodId` pada model `Report`.
  - Tambah relasi `PjumExport` ke `BmsBalancePeriod`.
- [x] **1.2 Sinkronisasi DB**: Jalankan `npx prisma db push` dan `npx prisma generate`.
- [x] **1.3 Seed Test Data**: Update `prisma/seed.ts` untuk menginisialisasi `BmsBalancePeriod` awal (Rp 1.000.000) untuk akun BMS test.

### 📌 Fase 2: Service & Balance Helper Logic (`lib/balance.ts`)
- [x] **2.1 `getBmsActivePeriod(bmsNIK)`**: Ambil/buat periode aktif untuk BMS.
- [x] **2.2 `calculateBmsBalance(bmsNIK)`**: Hitung Saldo Awal, Total Estimasi Aktif, Total Realisasi Aktif, Sisa Saldo Tersedia, dan Status Lock.
- [x] **2.3 `validateEstimationLimit(bmsNIK, amount)`**: Helper untuk validasi batas estimasi.
- [x] **2.4 `isBmsLockedByPjum(bmsNIK)`**: Helper untuk mengecek apakah BMS sedang terkunci PJUM.

### 📌 Fase 3: Integrasi Server Actions & Validasi Bisnis
- [x] **3.1 Validasi Estimasi (`app/reports/actions.ts`)**:
  - Tambahkan pengecekan saldo pada `submitReport` dan `resubmitReport`.
- [x] **3.2 Validasi Mulai Pekerjaan (`app/reports/actions.ts`)**:
  - Tambahkan pengecekan `isBmsLockedByPjum` pada action `startWork`. Blokir jika `LOCKED_PJUM`.
- [x] **3.3 Validasi Completion & Overrun Notes (`app/reports/actions.ts`)**:
  - Tambahkan simpan `unexpectedCostNotes` pada action `submitWorkCompletion`. Wajibkan jika `totalReal > sisaSaldo`.
- [x] **3.4 Integrasi Workflows PJUM (`app/dashboard/pjum/actions.ts` & `app/reports/pjum/approval-actions.ts`)**:
  - Di `createPjum`: Validasi semua laporan BMS selesai & kunci periode (`LOCKED_PJUM`).
  - Di `approvePjum`: Tutup periode lama, reset saldo BMS ke 1.000.000, buka kuncian.
  - Di `rejectPjum`: Buka kuncian periode (Fitur Reject masih disabled by default).

### 📌 Fase 4: Antarmuka Pengguna (UI/UX)
- [x] **4.1 Widget Card Saldo Operasional**:
  - Buat komponen `BmsBalanceCard` di Dashboard BMS & Form Pembuatan Laporan.
  - Tampilkan: Saldo Awal, Terpakai, Sisa Saldo, serta Badge Status "Terkunci PJUM" (jika ada).
- [x] **4.2 Form Completion Overrun Input & Warning Banner**:
  - Tampilkan **Warning Alert Card** mencolok ("⚠️ Realisasi biaya melampaui sisa saldo operasional!").
  - Textarea `Catatan Biaya Tak Terduga` otomatis bertanda *Required* jika realisasi membengkak.
- [x] **4.3 UI Feedback & Error Banner**:
  - Tampilkan toast / banner peringatan saat BMS mencoba membuat laporan saat terkunci PJUM atau estimasi melebihi limit.

### 📌 Fase 5: Testing & Verifikasi (`verification-before-completion`)
- [x] Test laporan pertama dengan nominal kecil (e.g. 200rb) -> Saldo berkurang 200rb.
- [x] Test pembuatan laporan baru dengan estimasi melampaui sisa saldo (e.g. 2 Juta) -> Terblokir di Frontend dan Backend.
- [x] Test laporan dengan penyelesaian membengkak -> Form tidak bisa disubmit sebelum `unexpectedCostNotes` diisi.
- [x] Test pembuatan PJUM oleh BMC -> Status berubah ke `LOCKED_PJUM`.
- [x] Test approval PJUM oleh BNM -> Status kembali `ACTIVE`, saldo keriset kembali Rp 1.000.000.
- [ ] **5.1 Test Flow Normal**: Submit Estimasi ≤ 1jt ➡️ Start Work ➡️ Completion ≤ Saldo.
- [ ] **5.2 Test Flow Overbudget & Warning**: Submit Estimasi ≤ 1jt ➡️ Realisasi > Saldo ➡️ Verifikasi muncul Warning Alert Card & Catatan Tak Terduga wajib terisi.
- [ ] **5.3 Test Blocker Estimasi**: Submit Estimasi > 1jt ➡️ Verifikasi UI & Server menolak.
- [ ] **5.4 Test Lock & Reset PJUM**: Create PJUM ➡️ BMS terkunci ➡️ BNM Approve ➡️ Saldo reset ke Rp 1.000.000.
