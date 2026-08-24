# PJUM Hanging Reports (Phase 1) - Design Spec

## 1. Overview
Fitur ini bertujuan untuk menyelesaikan masalah "Laporan Gantung" (Ghost Reports) di mana laporan dari periode lalu yang tidak diikutsertakan dalam dokumen PJUM menjadi tidak bisa diakses selamanya. Pada Phase 1 ini, kita memfasilitasi BMC untuk melihat laporan gantung tersebut dan mengajukan permohonan pembukaan gembok (Unlock Request) kepada pihak Regional, serta melakukan penyesuaian pemotongan saldo BMS jika laporan tersebut sukses masuk ke PJUM baru.

## 2. Database Schema
Penambahan model baru di Prisma untuk melacak jejak permohonan.

```prisma
model ReportUnlockRequest {
  id             String   @id @default(uuid())
  reportNumber   String
  report         Report   @relation(fields: [reportNumber], references: [reportNumber])
  
  requestedByNIK String
  requestedBy    User     @relation("UnlockRequester", fields: [requestedByNIK], references: [NIK])
  
  reason         String   @db.Text
  status         String   // "PENDING", "APPROVED", "REJECTED"
  
  approvedByNIK  String?
  approvedBy     User?    @relation("UnlockApprover", fields: [approvedByNIK], references: [NIK])

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([reportNumber])
  @@index([status])
}
```
*(Catatan: Jangan lupa tambahkan relasi balik di model `Report` dan `User`)*.

## 3. UI/UX: Create PJUM Dialog
Lokasi: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

*   **Pemisahan Laporan:** Tabel daftar laporan akan memisahkan antara laporan di rentang tanggal terpilih vs laporan gantung dari masa lalu (sebelum `fromDate` terpilih).
*   **Badge Status Laporan Gantung:**
    *   🔒 Terkunci (Belum diajukan)
    *   ⏳ Menunggu Approval (Status `PENDING`)
    *   🔓 Terbuka (Status `APPROVED`)
*   **Logika Tombol:**
    *   Terdapat dua tombol aksi utama: **"Buat PJUM"** dan **"Minta Persetujuan Buka Laporan"**.
    *   Jika BMC mencentang laporan dengan status 🔒 *Terkunci*:
        *   Tombol "Buat PJUM" menjadi *disabled* (unclickable).
        *   Tombol "Minta Persetujuan Buka Laporan" muncul dan bisa diklik.
    *   Klik "Minta Persetujuan" akan memunculkan *text-area* berisikan *template* alasan default untuk diisi oleh BMC.

## 4. Backend Logic & Balance Deduction
*   **Unlock Request Submission:** *Server action* baru `submitUnlockRequest` untuk memasukkan data ke tabel `ReportUnlockRequest`.
*   **Balance Deduction:** Di dalam *action* `createDashboardPjum`, jika ada laporan gantung 🔓 *Terbuka* yang diikutkan ke dalam PJUM baru, maka `balancePeriodId` dari laporan tersebut **WAJIB** di-update menjadi ID periode yang aktif saat ini (`activePeriod.id`). Hal ini memastikan biaya laporan gantung tersebut otomatis memotong sisa saldo teknisi di periode sekarang.
