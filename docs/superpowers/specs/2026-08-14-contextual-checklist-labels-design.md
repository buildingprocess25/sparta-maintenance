# Contextual Checklist Labels Design

## Problem

Laporan tanpa item dengan handler BMS sudah mengikuti alur singkat yang benar:

```text
BMS submit
→ PENDING_CHECKLIST_REVIEW
→ BMC approve
→ APPROVED_BMC
→ BNM approve
→ COMPLETED
```

Namun beberapa teks masih ditentukan oleh jumlah item rusak atau oleh nilai
teknis `ActivityAction.ESTIMATION_*`. Akibatnya laporan dengan item rusak yang
seluruhnya ditangani Rekanan masih menampilkan petunjuk alur BMS, dan aktivitas
approval checklist tampil sebagai "Estimasi disetujui".

## Goals

- Menampilkan petunjuk submit sesuai ada atau tidaknya handler BMS.
- Menampilkan aktivitas approval, revisi, dan penolakan sebagai aktivitas
  checklist untuk laporan tanpa handler BMS.
- Menyesuaikan notifikasi checklist tanpa mengubah recipient atau urutan flow.
- Memperbaiki label aktivitas lama secara kontekstual tanpa backfill database.
- Menjaga seluruh copy laporan dengan handler BMS tetap seperti sekarang.

## Non-Goals

- Tidak mengubah `ReportStatus`, `ActivityAction`, atau `NotificationType` pada
  `prisma/schema.prisma`.
- Tidak membuat migration baru.
- Tidak mengubah transisi status atau aturan approval.
- Tidak mengubah data historis di database.
- Tidak mengubah tampilan, layout, atau komponen shadcn/ui.

## Source of Truth

Jenis flow ditentukan oleh aturan domain yang sudah dipakai branch ini:

```text
checklist-only = tidak ada item dengan handler === "BMS"
```

Aturan tersebut mencakup checklist murni dan laporan dengan kerusakan yang
seluruhnya ditangani Rekanan. Implementasi harus menggunakan helper domain yang
sama, bukan memeriksa jumlah item rusak, total biaya, atau status laporan saat
ini. Status laporan dapat berubah menjadi `APPROVED_BMC` atau `COMPLETED`,
sedangkan isi item tetap dapat menentukan jenis flow untuk aktivitas lama.

## Submit Review Copy

Pada halaman review sebelum submit, copy ditentukan oleh keberadaan handler
BMS.

### Tanpa handler BMS

1. `Status laporan menjadi "Review Checklist".`
2. `BMC melakukan review checklist.`
3. `Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.`

### Dengan handler BMS

Copy yang sudah ada dipertahankan:

1. `Status laporan menjadi "Menunggu Persetujuan Estimasi".`
2. `BMC melakukan review estimasi dan checklist.`
3. `Jika disetujui, BMS dapat mulai pekerjaan.`

Kartu `Estimasi BMS` tetap ditampilkan karena nilainya merupakan ringkasan
biaya BMS yang faktual, termasuk ketika nilainya Rp0.

## Contextual Activity Labels

Nilai database tidak berubah. Formatter menerima `action` dan konteks
`isChecklistOnly`, kemudian menghasilkan label berikut:

| ActivityAction | Checklist-only | Dengan handler BMS |
| --- | --- | --- |
| `ESTIMATION_APPROVED` | Checklist disetujui | Estimasi disetujui |
| `ESTIMATION_REJECTED_REVISION` | Checklist perlu direvisi | Estimasi ditolak revisi |
| `ESTIMATION_REJECTED` | Checklist ditolak | Estimasi ditolak |

Action selain tiga nilai tersebut tetap memakai label global yang sudah ada.
Data aktivitas yang dikirim ke client hanya membawa boolean turunan atau label
hasil format; JSON `items` tidak boleh dikirim hanya untuk kebutuhan label.

Filter aktivitas yang menaungi kedua jenis flow menggunakan istilah netral:

- `Review disetujui`
- `Review perlu direvisi`
- `Review ditolak`

Nilai filter tetap `ESTIMATION_APPROVED`, `ESTIMATION_REJECTED_REVISION`, dan
`ESTIMATION_REJECTED` sehingga query dan schema tidak berubah.

## Notifications

Jenis notifikasi dan recipient tetap sama. Context `isChecklistOnly` menentukan
copy:

- Notifikasi BMS setelah approval BMC: `Checklist disetujui BMC`.
- Notifikasi BNM setelah approval BMC: `Checklist menunggu persetujuan final`.
- Notifikasi revisi: `Checklist perlu direvisi`.
- Notifikasi penolakan: `Checklist ditolak`.

Notifikasi laporan dengan handler BMS tetap menggunakan istilah estimasi dan
pekerjaan yang ada sekarang.

## Architecture

1. Gunakan satu helper domain untuk menentukan checklist-only dari item laporan.
2. Gunakan satu formatter label aktivitas yang menerima action dan konteks
   checklist-only agar dashboard, halaman aktivitas, detail laporan, dan
   riwayat tidak memiliki map label yang berbeda.
3. Query server menghitung konteks checklist-only sebelum serialisasi ke client.
4. Action review BMC meneruskan konteks yang sudah diketahuinya ke dispatcher
   notifikasi; tidak ada query tambahan di client.
5. Komponen review submit menghitung `hasBmsHandler` dari checklist yang sedang
   direview dan memilih copy yang sesuai.

## Testing

Regression test harus dibuat sebelum perubahan implementasi dan membuktikan:

1. Checklist murni menghasilkan copy flow checklist.
2. Item rusak yang seluruhnya ditangani Rekanan menghasilkan copy flow
   checklist.
3. Minimal satu item dengan handler BMS mempertahankan copy flow estimasi.
4. `ESTIMATION_APPROVED` diformat menjadi `Checklist disetujui` untuk
   checklist-only dan tetap `Estimasi disetujui` untuk flow BMS.
5. Label revisi dan penolakan juga kontekstual.
6. Template notifikasi checklist dan BMS menghasilkan copy yang berbeda dengan
   recipient flow yang tetap sama.

Verifikasi akhir mencakup test terfokus, lint file yang berubah, TypeScript
check jika resource lokal mencukupi, dan pengujian manual pada akun simulasi
`HEAD OFFICE`.

## Risks and Mitigations

- **Label salah untuk laporan lama:** konteks diturunkan dari item laporan,
  bukan status terakhir, sehingga laporan yang sudah `COMPLETED` tetap terbaca
  benar.
- **Duplikasi formatter:** implementasi harus memusatkan label kontekstual pada
  satu helper dan mengganti map lokal yang relevan.
- **Payload membesar:** context dihitung di server; JSON item tidak diteruskan
  ke komponen dashboard.
- **Perubahan flow tidak sengaja:** test hanya mengizinkan perubahan copy dan
  formatter; transisi status tidak disentuh.

## Implementation Status

Implemented without Prisma schema or migration changes. Checklist context is
derived from persisted item handlers and passed as a boolean to client activity
surfaces. Stored report statuses and activity action values remain unchanged.

The stale-label scan found only intentional estimation workflow/status copy,
canonical fallback branches, and regression assertions. Four required focused
specs plus the admin recent-activity regression spec passed. TypeScript passed
with a 4 GB heap, and changed-source ESLint completed with zero errors and
three pre-existing unused-symbol warnings.

The local production build was attempted with the required Next binary but was
interrupted after more than seven minutes while its Node process remained
CPU-active (about 848 MB working set). It produced no final success or product
failure result. Full-repository lint was not repeated because its documented
baseline has 29 pre-existing errors and timeout behavior.

The configured database host was safely confirmed as localhost and the
database name as `sparta_maintenance`; no credentials, full URL, records, or
database mutations were exposed or performed. The authenticated `HEAD OFFICE`
browser matrix was **NOT EXECUTED** because authenticated browser automation
was unavailable and remains required user validation.

Verification evidence is recorded in
`docs/agent-notes/2026-08-14-1304-verify-contextual-checklist-labels.md`.
