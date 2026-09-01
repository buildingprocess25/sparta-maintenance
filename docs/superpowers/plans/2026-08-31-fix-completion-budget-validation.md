# Fix: Completion Work Budget Validation & Unexpected Cost Input

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki dua bug pada halaman "Kirim Penyelesaian" — salah hitung `isOverBudget` di frontend dan tidak adanya input textarea untuk `unexpectedCostNotes`.

**Architecture:**
- Bug 1 ada di `completion-client.tsx`: nilai `maxAvailableBudget` yang diteruskan ke hook salah (tidak menjumlahkan estimasi laporan saat ini). Perlu diteruskan `availableBalance + reportTotalEstimation` (bukan hanya `availableBalance`).
- Bug 2 ada di `completion-client.tsx`: hook sudah me-return `unexpectedCostNotes` & `setUnexpectedCostNotes` tapi tidak ada elemen UI untuk mengisinya. Perlu menambahkan section textarea yang muncul secara kondisional hanya ketika `isOverBudget === true`.

**Tech Stack:** Next.js App Router, React (hooks), TypeScript, Tailwind CSS.

## Global Constraints

- Jangan ubah logika di `use-completion-work-form.ts` hook parameter — cukup perbaiki nilai yang diteruskan dari `completion-client.tsx`.
- Textarea muncul hanya saat `isOverBudget === true`, tidak perlu visible jika realisasi di bawah batas.
- Pesan validasi di `use-completion-work-form.ts` (baris 479) tetap ada dan dipertahankan.
- Logika backend di `submit-completion-work.ts` sudah benar — jangan diubah.

---

### Task 1: Fix `maxAvailableBudget` di CompletionClient

**Files:**
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx:88`

**Interfaces:**
- Consumes: `bmsBalanceInfo.availableBalance` (number) dan `report.totalEstimation` (number) dari props.
- Produces: nilai `maxAvailableBudget` yang benar diteruskan ke `useCompletionWorkForm`.

- [ ] **Step 1: Ubah argumen `maxAvailableBudget` yang diteruskan ke hook**

Di [completion-client.tsx:88](app/reports/[reportNumber]/completion/completion-client.tsx), ubah:
```tsx
// SEBELUM
} = useCompletionWorkForm(report, bmsBalanceInfo.availableBalance);

// SESUDAH
} = useCompletionWorkForm(
  report,
  bmsBalanceInfo.availableBalance + report.totalEstimation,
);
```

**Penjelasan:** `availableBalance` dihitung dengan sudah mengurangi estimasi laporan berjalan (termasuk laporan ini). Saat submit realisasi, estimasi laporan ini harus dikembalikan ke pool — karena itu max budget = `availableBalance + estimasi laporan ini`. Ini persis sama dengan logika backend di `submit-completion-work.ts:203`.

- [ ] **Step 2: Verifikasi TypeScript compile**

```powershell
npx tsc --noEmit
```

Expected: tidak ada error baru pada file yang diubah.

- [ ] **Step 3: Manual test — skenario normal (realisasi ≤ estimasi)**

1. Login sebagai BMS
2. Buka laporan AH02-2608-001 (estimasi 300k, saldo sisa 100k)
3. Pastikan `isOverBudget` sekarang `false` (realisasi 300k ≤ maxBudget 400k)
4. Klik "Kirim Hasil Pekerjaan" → harusnya tidak muncul toast error "Biaya Tak Terduga"

- [ ] **Step 4: Commit**

```powershell
git add app/reports/[reportNumber]/completion/completion-client.tsx
git commit -m "fix(completion): use estimasi laporan saat hitung maxAvailableBudget"
```

---

### Task 2: Tambah Textarea Input `unexpectedCostNotes` di UI

**Files:**
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx:259-273` (antara `AdditionalDocumentationSection` dan penutup `</main>`)

**Interfaces:**
- Consumes: `isOverBudget` (boolean), `unexpectedCostNotes` (string), `setUnexpectedCostNotes` (setter) — semua sudah tersedia dari hook di baris 85-88.
- Produces: Section UI yang muncul kondisional saat `isOverBudget === true`, berisi textarea dengan id `"unexpected-cost-notes"`.

- [ ] **Step 1: Tambahkan section textarea setelah `AdditionalDocumentationSection`**

Di [completion-client.tsx](app/reports/[reportNumber]/completion/completion-client.tsx), setelah blok `<AdditionalDocumentationSection .../>` (baris ~272), tambahkan:

```tsx
{isOverBudget && (
  <section
    id="unexpected-cost-notes"
    className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
  >
    <div className="flex items-start gap-2 mb-3">
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-destructive">
          Realisasi Melebihi Sisa Saldo
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total realisasi melebihi sisa saldo operasional. Wajib isi catatan biaya tak terduga untuk melanjutkan.
        </p>
      </div>
    </div>
    <label
      htmlFor="unexpected-cost-notes-input"
      className="text-xs font-medium text-foreground mb-1.5 block"
    >
      Catatan Biaya Tak Terduga <span className="text-destructive">*</span>
    </label>
    <textarea
      id="unexpected-cost-notes-input"
      className="w-full min-h-[96px] rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      placeholder="Jelaskan penyebab dan rincian biaya yang melebihi saldo..."
      value={unexpectedCostNotes}
      onChange={(e) => setUnexpectedCostNotes(e.target.value)}
    />
  </section>
)}
```

**Catatan:** `AlertCircle` sudah diimport di baris 3 file ini.

- [ ] **Step 2: Verifikasi TypeScript compile**

```powershell
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 3: Manual test — skenario over budget**

Untuk simulasi: sementara tambahkan laporan dengan estimasi besar sehingga realisasi melebihi `maxBudget`, atau langsung manipulasi `bmsBalanceInfo.availableBalance` menjadi 0 di page.tsx sementara.
1. Saat `isOverBudget === true`, section merah harus tampil di bawah "Additional Documentation"
2. Klik "Kirim Hasil Pekerjaan" tanpa mengisi textarea → toast error + scroll ke section
3. Isi textarea → klik "Kirim Hasil Pekerjaan" → submit berhasil

- [ ] **Step 4: Commit**

```powershell
git add app/reports/[reportNumber]/completion/completion-client.tsx
git commit -m "feat(completion): tambah textarea catatan biaya tak terduga saat over budget"
```

---

### Task 3: Agent Note & Verifikasi Akhir

**Files:**
- Create: `docs/agent-notes/2026-08-31-1532-fix-completion-budget-validation.md`

- [ ] **Step 1: Buat agent note**

```markdown
# Fix: Completion Budget Validation & Unexpected Cost Input

## Scope

Memperbaiki dua bug pada halaman "Kirim Penyelesaian" (BMS completion flow):
1. `isOverBudget` salah hitung (false positive) karena tidak memperhitungkan estimasi laporan itu sendiri.
2. Textarea input untuk `unexpectedCostNotes` tidak di-render di UI.

## Context and Sources

- `lib/balance.ts`: dokumentasi aturan bisnis saldo BMS
- `app/reports/actions/submit-completion-work.ts:203`: referensi rumus maxAvailableBudget yang benar di backend

## Changed Files

- `app/reports/[reportNumber]/completion/completion-client.tsx`: fix argumen maxAvailableBudget + tambah textarea UI

## Decisions

- maxAvailableBudget = availableBalance + report.totalEstimation karena saat ini estimasi laporan sudah ikut mengurangi availableBalance, sehingga harus dikembalikan saat menghitung batas realisasi.
- Textarea ditampilkan kondisional (hanya saat isOverBudget) agar tidak mengganggu UX normal flow.

## Verification

- TypeScript compile clean (npx tsc --noEmit)
- Manual test: realisasi = estimasi (300k) dengan saldo sisa 100k → tidak over budget lagi

## Remaining Work and Risks

None
```

- [ ] **Step 2: Final commit**

```powershell
git add docs/agent-notes/2026-08-31-1532-fix-completion-budget-validation.md
git commit -m "docs: agent note fix completion budget validation"
```
