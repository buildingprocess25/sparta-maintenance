# Performance Audit — SPARTA Maintenance

> **Tanggal Audit:** 9 Maret 2026  
> **Auditor:** GitHub Copilot (Claude Sonnet 4.6)  
> **Cakupan:** Full codebase — bottleneck server, query DB, komponen duplikat, dead code, client-side overhead

---

## Ringkasan Eksekutif

Terdapat **2 isu kritikal** yang bisa menyebabkan server tidak responsif di bawah beban pengguna bersamaan (PDF generation + unbounded DB query). Selain itu ditemukan beberapa dead code, duplikasi logika, dan inefficiency minor.

**Total temuan: 13**, dikategorikan:

- 🔴 **Critical (2)** — Bisa menyebabkan server timeout / OOM di produksi
- 🟠 **High (3)** — Degradasi performa signifikan
- 🟡 **Medium (4)** — Inefficiency yang terukur
- 🟢 **Low (4)** — Dead code, minor overhead

---

## CRITICAL

### P-01 — PDF Generation: N HTTP Request per Render, Tanpa Caching, Tanpa Concurrency Limit

**File:** [lib/pdf/generate-report-pdf.ts](lib/pdf/generate-report-pdf.ts) + [app/api/reports/[reportNumber]/pdf/route.ts](app/api/reports/%5BreportNumber%5D/pdf/route.ts)

**Masalah:**

Setiap kali endpoint `/api/reports/[reportNumber]/pdf` dipanggil, terjadi:

1. **N parallel HTTP probe** ke Supabase untuk setiap foto laporan — menggunakan `probe-image-size` untuk mendapatkan dimensi gambar width/height:

```ts
// lib/pdf/generate-report-pdf.ts ~baris 1830
const uniqueUrls = [...new Set(allUrls)]; // semua foto: sebelum + sesudah + selfie + receipt
const probeResults = await Promise.all(
    uniqueUrls.map(async (url) => {
        try {
            const result = await probe(url); // ← HTTP GET ke Supabase per foto
        } catch {
            return [url, { width: 4, height: 3 }] as const;
        }
    }),
);
```

Sebuah laporan dengan 10 item, masing-masing punya foto sebelum + sesudah + receipt = **30+ HTTP request ke Supabase** per PDF render. Di bulan sibuk sebuah cabang besar, jika 5 user membuka PDF bersamaan = **150+ outbound HTTP** sekaligus.

2. **`fs.readFileSync` dipanggil dua kali per request** untuk logo file — tidak pernah di-cache:

```ts
// pdf/route.ts
alfamartLogoBase64 = fs
    .readFileSync(path.join(assetsDir, "Alfamart-Emblem-small.png"))
    .toString("base64"); // ← disk read setiap request
buildingLogoBase64 = fs
    .readFileSync(path.join(assetsDir, "Building-Logo.png"))
    .toString("base64"); // ← disk read setiap request
```

3. **`renderToBuffer()` (React PDF) adalah CPU-bound synchronous** operation — memblokir event loop Node.js selama render berlangsung.

4. **Tidak ada `Cache-Control` header** pada response — browser/CDN tidak meng-cache PDF, sehingga setiap klik "Lihat PDF" menyebabkan re-render penuh:

```ts
return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${reportNumber}.pdf"`,
        // ← TIDAK ADA Cache-Control, ETag, atau Last-Modified
    },
});
```

5. **Tidak ada concurrency limit** — 10 request PDF bersamaan bisa menghabiskan semua memory Vercel serverless function.

**Dampak:**

- Timeout pada laporan dengan banyak foto (>20 foto)
- Memory spike pada banyak concurrent request
- Biaya Supabase Storage egress melonjak

**Rekomendasi:**

```ts
// 1. Cache logo di module level (singleton, dimuat sekali saat cold start)
const logoCache: { alfamart?: string; building?: string } = {};

function getLogoBase64(filename: string): string {
    if (!logoCache[filename]) {
        logoCache[filename] = fs
            .readFileSync(path.join(process.cwd(), "public/assets", filename))
            .toString("base64");
    }
    return logoCache[filename]!;
}

// 2. Cache-Control pada response PDF
headers: {
    "Content-Type": "application/pdf",
    "Cache-Control": "private, max-age=300", // cache 5 menit di browser
    "ETag": `"${reportNumber}-${report.updatedAt.getTime()}"`,
}

// 3. Ganti probe-image-size dengan image metadata dari Supabase Storage API
// atau simpan dimensi foto saat upload di use-photo-upload.ts
// sehingga tidak perlu HTTP probe saat render PDF
```

---

### P-02 — BMC/BNM Approval List: Query Tak Terbatas + Pencarian di JavaScript

**File:** [app/reports/\_components/bmc-approval-list.tsx](app/reports/_components/bmc-approval-list.tsx) — baris 162

**Masalah:**

Query `findMany` tanpa `take`/`skip` — mengambil **semua** laporan dari DB sekaligus:

```ts
const reports = await prisma.report.findMany({
    where: {
        status: { in: activeStatuses }, // PENDING_ESTIMATION | PENDING_REVIEW
        ...branchFilter,
        ...dateFilter,
    },
    orderBy: { updatedAt: "desc" },
    // ← TIDAK ADA take atau skip
    select: {
        reportNumber,
        storeName,
        storeCode,
        branchName,
        status,
        totalEstimation,
        createdAt,
        updatedAt,
        createdBy: { select: { name: true } },
    },
});

// Pencarian dilakukan di JavaScript, bukan di DB:
const filtered = search
    ? reports.filter(
          (r) =>
              r.reportNumber.toLowerCase().includes(search) ||
              r.storeName.toLowerCase().includes(search) || // ← full scan in-memory
              r.branchName.toLowerCase().includes(search) ||
              r.createdBy.name.toLowerCase().includes(search),
      )
    : reports;
```

**Dampak:**

- Di cabang besar dengan ratusan laporan aktif: seluruh dataset dimuat ke memori server setiap kali halaman di-render atau di-refresh.
- Pencarian memindai semua baris di JavaScript — tidak scalable.
- Tidak ada index komposit pada `(branchName, status)` di schema, sehingga DB harus melakukan index intersection.

**Schema saat ini** — index terpisah, bukan komposit:

```prisma
@@index([branchName])   // index tunggal
@@index([status])       // index tunggal
// ← TIDAK ADA @@index([branchName, status])
```

**Rekomendasi:**

```ts
// Tambahkan take/skip untuk pagination:
const PAGE_SIZE = 50;
const reports = await prisma.report.findMany({
    where: { ... },
    orderBy: { updatedAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
});

// Pindahkan search ke DB:
where: {
    ...
    ...(search ? {
        OR: [
            { reportNumber: { contains: search, mode: "insensitive" } },
            { storeName:    { contains: search, mode: "insensitive" } },
            { branchName:   { contains: search, mode: "insensitive" } },
        ]
    } : {}),
}
```

```prisma
// prisma/schema.prisma — tambahkan composite index:
@@index([branchName, status])
@@index([branchName, updatedAt])
```

---

## HIGH

### P-03 — Dead Code: `startWork` Tidak Pernah Dipanggil oleh UI Manapun

**File:** [app/reports/actions/start-work.ts](app/reports/actions/start-work.ts) vs [app/reports/actions/start-work-with-photos.ts](app/reports/actions/start-work-with-photos.ts)

**Masalah:**

Terdapat dua server action yang hampir identik untuk memulai pekerjaan. Seluruh boilerplate (auth, CSRF, ownership check, status check, transaction) sama persis — perbedaannya hanya pada field yang ditulis:

```ts
// start-work.ts — perbedaan HANYA di sini:
data: { status: ReportStatus.IN_PROGRESS }

// start-work-with-photos.ts — tambahan:
data: {
    status: ReportStatus.IN_PROGRESS,
    startSelfieUrl: selfieUrlValue || null,
    startReceiptUrls: photos.receiptUrls as Prisma.InputJsonValue,
}
```

Hasil pencarian penggunaan di seluruh codebase:

- `startWorkWithPhotos` → dipanggil oleh `start-work-form.tsx` ✓
- `startWork` (versi sederhana) → **tidak dipanggil oleh komponen UI manapun** — dead code

**Dampak:**

- Menambah ukuran bundle server action
- Potensi kebingungan saat maintenance
- Dua source of truth untuk logika yang sama → risiko divergensi

**Rekomendasi:**

Gabungkan menjadi satu fungsi dengan parameter opsional foto:

```ts
export async function startWork(
    reportNumber: string,
    photos?: { selfieUrls: string[]; receiptUrls: string[] }
) {
    // ... shared logic ...
    const photoData = photos ? {
        startSelfieUrl: photos.selfieUrls.length === 1
            ? photos.selfieUrls[0]
            : JSON.stringify(photos.selfieUrls),
        startReceiptUrls: photos.receiptUrls as Prisma.InputJsonValue,
    } : {};

    data: { status: ReportStatus.IN_PROGRESS, ...photoData }
}
```

Hapus `start-work.ts` dan update barrel export di `actions.ts`.

---

### P-04 — `getLastCategoryIDate`: Mengambil Seluruh JSONB `items` untuk Mencari 1 Field

**File:** [app/reports/actions/queries.ts](app/reports/actions/queries.ts) — baris 120

**Masalah:**

Fungsi ini dipanggil setiap kali user memilih kode toko di form create, untuk mengecek apakah toko pernah punya laporan dengan item kategori "I" (Preventive Maintenance):

```ts
export async function getLastCategoryIDate(storeCode: string) {
    const reports = await prisma.report.findMany({
        where: { storeCode, status: { not: "DRAFT" } },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            items: true, // ← MENGAMBIL SELURUH JSONB items (bisa 10KB+ per laporan)
        },
        take: 10, // ambil 10 laporan terakhir
    });

    for (const report of reports) {
        const items = report.items as ReportItemJson[];
        const hasCategoryI = items.some((item) => item.itemId.startsWith("I")); // cek di JS
        if (hasCategoryI) return report.createdAt.toISOString();
    }
    return null;
}
```

Dengan `take: 10`, ini mengambil hingga 10 × JSONB `items` (bisa 5–20KB masing-masing) hanya untuk mengecek apakah ada `itemId` yang diawali huruf "I". Total transfer: bisa sampai 200KB per pencarian toko.

**Rekomendasi:**

Gunakan raw query untuk menghindari transfer seluruh JSONB:

```ts
// Gunakan Prisma raw query dengan jsonb operator
const result = await prisma.$queryRaw<{ created_at: Date }[]>`
    SELECT created_at FROM "Report"
    WHERE store_code = ${storeCode}
      AND status != 'DRAFT'
      AND items @> '[{"itemId": "I"}]'::jsonb -- partial match
    ORDER BY created_at DESC
    LIMIT 1
`;
```

Atau alternatif lebih sederhana: simpan flag `hasPreventiveItems: boolean` saat laporan di-submit.

---

### P-05 — Draft Restore: Fetch Semua Foto via HTTP pada Setiap Load Form

**File:** [app/reports/(bms)/create/hooks/use-draft.ts](<app/reports/(bms)/create/hooks/use-draft.ts>) — baris ~98

**Masalah:**

Ketika BMS membuka form create dan ada draft tersimpan, setiap foto item di-fetch ulang dari Supabase:

```ts
const fetchPhoto = async (item) => {
    if (!item.photoUrl) return undefined;
    const res = await fetch(item.photoUrl); // ← HTTP fetch per item
    const blob = await res.blob();
    return new File([blob], `${item.itemName}.jpg`, { type: "image/jpeg" });
};

// Semua foto di-fetch secara paralel:
const restoredFiles = await Promise.all(existingDraft.items.map(fetchPhoto));
```

Checklist memiliki ~125 item. Jika BMS mengisi 50 item dengan foto, restore draft = **50 HTTP fetch ke Supabase** secara paralel saat halaman dibuka. Ini menyebabkan:

- Waktu load form bisa 3–10 detik tergantung koneksi lapangan
- Penggunaan data seluler BMS yang boros

**Rekomendasi:**

Foto tidak perlu di-fetch saat restore — hanya URL yang perlu disimpan ke state. Tampilkan foto dari URL langsung (`<img src={photoUrl} />`), dan hanya convert ke `File` object jika user ingin menggantinya atau saat submit:

```ts
// Saat restore: simpan photoUrl ke state, jangan fetch blobnya
// Foto hanya di-fetch ulang jika user klik "Ganti Foto"
const restoredItems = existingDraft.items.map((item) => ({
    ...item,
    // photoUrl sudah ada — gunakan langsung tanpa re-fetch
    photo: null, // File object kosong, akan diisi jika user ganti foto
}));
```

---

## MEDIUM

### P-06 — `submitCompletion` vs `submitCompletionWork`: Duplikasi Parsial

**File:** [app/reports/actions/submit-completion.ts](app/reports/actions/submit-completion.ts) vs [app/reports/actions/submit-completion-work.ts](app/reports/actions/submit-completion-work.ts)

**Masalah:**

Dua action dengan boilerplate yang sama (auth, CSRF, ownership, status check) dengan perbedaan di payload:

|                      | `submitCompletion`                             | `submitCompletionWork`               |
| -------------------- | ---------------------------------------------- | ------------------------------------ |
| Digunakan oleh       | `report-detail-view.tsx` (tombol submit cepat) | `complete-form.tsx` (wizard lengkap) |
| Mutasi items JSONB   | ❌                                             | ✅ Merge completion items            |
| Upload selfie        | ❌                                             | ✅                                   |
| Status transition    | `PENDING_REVIEW`                               | `PENDING_REVIEW`                     |
| Extra revalidatePath | ❌                                             | `/reports/complete`                  |

Tidak seperti `startWork` (P-03), kedua fungsi ini **masih digunakan** jadi tidak bisa langsung dihapus. Namun ~60% kode identik adalah duplikasi yang rawan divergensi jika ada perubahan policy.

**Rekomendasi:**

Ekstrak shared logic ke helper internal, lalu dua fungsi public memanggil helper dengan payload berbeda.

---

### P-07 — Session Interceptor: Clone Setiap Response Fetch Global

**File:** [components/session-interceptor.tsx](components/session-interceptor.tsx)

**Masalah:**

`SessionInterceptor` monkey-patches `window.fetch` secara global dengan clone pada setiap response:

```ts
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const clonedResponse = response.clone(); // ← clone SETIAP response
    if (response.status === 401 || response.status === 403) {
        router.push("/login");
    }
    return clonedResponse; // ← mengembalikan clone, bukan original
};
```

Setiap `fetch()` di seluruh aplikasi — auto-save draft (tiap 2 detik), upload foto, API calls — membayar overhead clone response body, termasuk response besar seperti hasil query laporan.

**Masalah tambahan:** `response` dikembalikan tapi `clonedResponse` yang digunakan — ini berarti jika code pemanggil sudah membaca `response`, `clonedResponse` memiliki stream yang belum dibaca. Logikanya harus dibalik: kembalikan `response`, gunakan `clone()` hanya untuk pengecekan status:

```ts
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
        router.push("/login");
    }
    return response; // kembalikan response original, tidak perlu clone
};
```

---

### P-08 — `getImageOrientation` Diekspor tapi Tidak Pernah Dipanggil

**File:** [lib/pdf/generate-report-pdf.ts](lib/pdf/generate-report-pdf.ts) — baris 22

**Masalah:**

```ts
// Line 22–36 — fungsi standalone yang tidak pernah digunakan:
export async function getImageOrientation(url: string) {
    const result = await probe(url); // HTTP fetch
    if (!result) return "unknown" as const;
    const { width, height } = result;
    if (width > height) return "landscape" as const;
    if (height > width) return "portrait" as const;
    return "square" as const;
}
```

File ini memiliki **1855 baris** dan sudah ada logika probe internal di `generateReportPdf`. Fungsi ini adalah dead code yang menambah ukuran modul.

---

### P-09 — Missing Index Komposit untuk Query BMC/BNM

**File:** [prisma/schema.prisma](prisma/schema.prisma) — baris 89, 123–127

**Masalah:**

Query utama BMC (`BmcApprovalList`) memfilter berdasarkan `branchName` DAN `status` secara bersamaan:

```prisma
// Schema saat ini:
@@index([branchName])         // index terpisah
@@index([status])             // index terpisah
@@index([createdByNIK, status]) // composite untuk BMS ✓
@@index([storeCode, status])    // composite untuk storeCode ✓
// ← TIDAK ADA: @@index([branchName, status])
```

Prisma/PostgreSQL memilih satu index dan melakukan filtering manual untuk kondisi kedua, atau melakukan bitmap index scan yang lebih lambat. Untuk query `WHERE branchName IN (...) AND status IN (...)` diperlukan composite index.

**Rekomendasi:**

```prisma
model Report {
  // ... existing fields ...
  @@index([branchName, status])    // ← tambahkan ini
  @@index([branchName, updatedAt]) // ← untuk ORDER BY updatedAt
}
```

Jalankan:

```bash
npm run db:push && npm run db:generate
```

---

## LOW

### P-10 — `preview-pdf` Endpoint Memanggil `generateReportPdf` Penuh dengan Mock Data

**File:** [app/api/reports/preview-pdf/route.ts](app/api/reports/preview-pdf/route.ts)

**Masalah:**

Endpoint ini dimaksudkan sebagai preview untuk development, tetapi memanggil `generateReportPdf()` secara penuh. Karena mock data `completionSelfieUrls` dan `items[].images` kosong, overhead-nya kecil — tapi endpoint ini tidak seharusnya ada di production dan belum memiliki auth (juga teridentifikasi di audit keamanan).

**Rekomendasi:** Tambahkan guard `if (process.env.NODE_ENV !== "development") return 404;` dan auth check.

---

### P-11 — `checklist-data.ts`: 125 Item Statik Diimpor di Setiap Form Render

**File:** [lib/checklist-data.ts](lib/checklist-data.ts) — 267 baris, ~125 item

**Masalah:**

Data checklist ~125 item di 9 kategori diimpor secara statis di beberapa hooks dan components. Karena ini adalah data statis di modul level, module bundler sudah menanganinya dengan baik — ini bukan masalah besar. Namun jika checklist tumbuh ke ratusan item, pertimbangkan lazy loading per kategori.

**Saat ini:** aman, cukup dipantau saja.

---

### P-12 — Session Expiry Check: Polling 1 Request/Menit per Tab

**File:** [components/session-expiry-alert.tsx](components/session-expiry-alert.tsx) — baris 45

```ts
const initialTimeout = setTimeout(checkSession, 5000);
const interval = setInterval(checkSession, 60 * 1000); // polling tiap 60 detik
```

`checkSession` memanggil `fetch("/api/auth/session")` — 1 DB lookup (JWT decode + cookie read) per menit per tab.

**Dampak:** Pada 50 pengguna aktif bersamaan = 50 request/menit ke `/api/auth/session`. Masih wajar tapi perlu diperhatikan saat pengguna bertambah. Pertimbangkan mengganti dengan expiry detection berbasis JWT `exp` claim secara lokal tanpa DB call (JWT sudah berisi expiry time).

---

### P-13 — `use-draft.ts`: `disableAutoSave` Tidak Ada di Dependency Array

**File:** [app/reports/(bms)/create/hooks/use-draft.ts](<app/reports/(bms)/create/hooks/use-draft.ts>)

**Masalah:**

```ts
useEffect(() => {
    if (disableAutoSave) return; // ← disableAutoSave dibaca dalam effect
    // ... panggil saveDraft(...)
}, [
    debouncedChecklist,
    debouncedBmsItems,
    debouncedStoreCode /* disableAutoSave TIDAK ADA */,
]);
```

`disableAutoSave` adalah stale closure — jika nilainya berubah, effect tidak re-run. Dalam kondisi normal ini tidak menyebabkan masalah performa, tapi bisa menyebabkan auto-save berjalan ketika seharusnya dinonaktifkan (misalnya saat proses submit sedang berlangsung), menghasilkan redundant DB write.

---

## Ringkasan Temuan

| ID   | Severity    | Judul                                                       | File Terdampak                           | Status  |
| ---- | ----------- | ----------------------------------------------------------- | ---------------------------------------- | ------- |
| P-01 | 🔴 Critical | PDF: N HTTP probe + no cache + sync CPU-bound               | `generate-report-pdf.ts`, `pdf/route.ts` | Terbuka |
| P-02 | 🔴 Critical | BMC list: `findMany` tanpa limit + JS search                | `bmc-approval-list.tsx`                  | Terbuka |
| P-03 | 🟠 High     | `startWork` dead code (duplikat `startWorkWithPhotos`)      | `start-work.ts`                          | Terbuka |
| P-04 | 🟠 High     | `getLastCategoryIDate`: ambil full JSONB 10 laporan         | `queries.ts`                             | Terbuka |
| P-05 | 🟠 High     | Draft restore: fetch semua foto via HTTP                    | `use-draft.ts`                           | Terbuka |
| P-06 | 🟡 Medium   | `submitCompletion` vs `submitCompletionWork`: duplikasi 60% | 2 action files                           | Terbuka |
| P-07 | 🟡 Medium   | Session interceptor clone setiap response global            | `session-interceptor.tsx`                | Terbuka |
| P-08 | 🟡 Medium   | `getImageOrientation` diekspor tapi tidak pernah dipanggil  | `generate-report-pdf.ts`                 | Terbuka |
| P-09 | 🟡 Medium   | Missing composite index `(branchName, status)` di schema    | `schema.prisma`                          | Terbuka |
| P-10 | 🟢 Low      | `preview-pdf` endpoint di production tanpa guard            | `preview-pdf/route.ts`                   | Terbuka |
| P-11 | 🟢 Low      | `checklist-data.ts` 125 item statis di every form           | `checklist-data.ts`                      | Monitor |
| P-12 | 🟢 Low      | Session polling 1 req/menit/tab                             | `session-expiry-alert.tsx`               | Monitor |
| P-13 | 🟢 Low      | `disableAutoSave` stale closure di auto-save effect         | `use-draft.ts`                           | Terbuka |

---

## Prioritas Perbaikan

### Segera (Sebelum Go-live)

1. **P-02** — Tambahkan `take`/`skip` + DB-side search di `BmcApprovalList` _(1–2 jam)_
2. **P-09** — Tambahkan `@@index([branchName, status])` di schema _(15 menit, `db:push`)_

### Sprint Berikutnya

3. **P-01** — Cache logo base64 di module level; tambahkan `Cache-Control` pada PDF response _(2–4 jam)_
4. **P-05** — Hilangkan HTTP fetch pada restore draft; gunakan URL langsung _(2–3 jam)_
5. **P-04** — Ganti full-JSONB fetch dengan raw SQL query atau flag boolean _(1–2 jam)_

### Backlog

6. P-03 (hapus `start-work.ts`, gabungkan ke `start-work-with-photos.ts`)
7. P-06 (ekstrak shared logic `submitCompletion*`)
8. P-07 (perbaiki session interceptor clone)
9. P-08, P-10, P-12, P-13

---

_Dokumen ini dibuat berdasarkan analisis statis kode pada tanggal 9 Maret 2026._
