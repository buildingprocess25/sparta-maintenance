# PJUM Create Confirmation Checkbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan konfirmasi *explicit checkbox summary* tepat di atas tombol "Buat PJUM" yang menampilkan ringkasan pilihan periode (BMS, Dari, Sampai, Minggu, Bulan) dan harus dicentang sebelum tombol "Buat PJUM" aktif.

**Architecture:** Semua perubahan terpusat di satu file: `create-pjum-dialog.tsx`. Kita tambahkan state baru `isConfirmed: boolean`, satu blok UI konfirmasi yang hanya muncul ketika `canCreate` menjadi `true`, dan modifikasi kondisi `disabled` pada tombol. State `isConfirmed` di-reset ke `false` setiap kali user mengubah hasil pencarian (Cek Laporan), mengubah pilihan laporan, atau menutup dialog.

**Tech Stack:** React (useState), shadcn Checkbox, Tailwind CSS.

## Global Constraints

- Tidak ada perubahan pada backend/server actions (`actions.ts`).
- Tidak ada komponen baru di file terpisah — semua inline di `create-pjum-dialog.tsx`.
- Teks label Bahasa Indonesia, konsisten dengan teks yang sudah ada.
- Reset `isConfirmed` setiap kali data berubah (search baru, toggle laporan, atau tutup dialog).

---

### Task 1: Tambah state `isConfirmed` dan integrasikan ke reset lifecycle

**Files:**
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: state `result`, `selectedReports`, `setOpen`
- Produces: state `isConfirmed: boolean`, setter `setIsConfirmed`

- [ ] **Step 1: Tambah state `isConfirmed` di bawah baris `useTransition` untuk isCreating**

Di file `create-pjum-dialog.tsx`, temukan baris:
```tsx
const [isCreating, startCreateTransition] = useTransition();
```
Tambahkan baris berikut tepat di bawahnya:
```tsx
const [isConfirmed, setIsConfirmed] = useState(false);
```

- [ ] **Step 2: Reset `isConfirmed` saat hasil pencarian baru di-load**

Di dalam fungsi `handleSearch`, tepat setelah `setSelectedReports(...)`:
```tsx
setResult(nextResult);
setSelectedReports(
    nextResult.rows
        .filter((row) => row.isValid)
        .map((row) => row.reportNumber),
);
setIsConfirmed(false); // tambahkan ini
```

- [ ] **Step 3: Reset `isConfirmed` saat user toggle satu laporan**

Di fungsi `toggleReport`, tambahkan `setIsConfirmed(false)` setelah `setSelectedReports(...)`:
```tsx
function toggleReport(row: DashboardPjumCandidateRow) {
    if (!row.isValid) return;

    setSelectedReports((current) =>
        current.includes(row.reportNumber)
            ? current.filter((item) => item !== row.reportNumber)
            : [...current, row.reportNumber],
    );
    setIsConfirmed(false);
}
```

- [ ] **Step 4: Reset `isConfirmed` saat user toggle semua valid**

Di fungsi `toggleAllValid`, tambahkan reset di kedua branch:
```tsx
function toggleAllValid() {
    if (allValidSelected) {
        setSelectedReports([]);
        setIsConfirmed(false);
        return;
    }

    setSelectedReports(validRows.map((row) => row.reportNumber));
    setIsConfirmed(false);
}
```

- [ ] **Step 5: Reset `isConfirmed` saat dialog ditutup**

Cari baris `<Dialog open={open} onOpenChange={setOpen}>` (sekitar line 293) dan ubah menjadi:
```tsx
<Dialog
    open={open}
    onOpenChange={(v) => {
        setOpen(v);
        if (!v) setIsConfirmed(false);
    }}
>
```

- [ ] **Step 6: Verifikasi TypeScript clean**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/pjum/_components/create-pjum-dialog.tsx
git commit -m "feat(pjum): add isConfirmed state with lifecycle resets"
```

---

### Task 2: Tambah UI blok konfirmasi dan hubungkan ke tombol

**Files:**
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: `isConfirmed`, `setIsConfirmed`, `canCreate`, `bmsNIK`, `bmsUsers`, `from`, `to`, `weekNumber`, `monthName`, `selectedReports`, `selectedTotal`
- Produces: Blok UI amber di atas DialogFooter; tombol "Buat PJUM" aktif hanya bila `canCreate && isConfirmed`

- [ ] **Step 1: Tambah derived value `selectedBmsName` di bawah deklarasi `canCreate`**

Tepat di bawah blok `const canCreate = ...` (sekitar line 210–215), tambahkan:
```tsx
const selectedBmsName = bmsUsers.find((u) => u.NIK === bmsNIK)?.name ?? bmsNIK;
```

- [ ] **Step 2: Ubah kondisi `disabled` pada tombol "Buat PJUM"**

Cari baris di `<DialogFooter>`:
```tsx
disabled={!canCreate}
```
Ubah menjadi:
```tsx
disabled={!canCreate || !isConfirmed}
```

- [ ] **Step 3: Tambah blok konfirmasi amber antara konten scrollable dan DialogFooter**

Tepat di atas tag `<DialogFooter ...>` (sekitar line 607), tambahkan blok berikut:
```tsx
{canCreate && (
    <div className="shrink-0 border-t bg-amber-50 px-4 py-3">
        <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
                id="pjum-confirm-checkbox"
                checked={isConfirmed}
                onCheckedChange={(checked) =>
                    setIsConfirmed(checked === true)
                }
                className="mt-0.5"
                aria-label="Konfirmasi data PJUM"
            />
            <div className="space-y-1 text-sm">
                <p className="font-semibold text-amber-900">
                    Konfirmasi sebelum membuat PJUM
                </p>
                <p className="text-amber-800 leading-relaxed">
                    Saya yakin akan membuat PJUM untuk{" "}
                    <span className="font-semibold">{selectedBmsName}</span>
                    {" "}periode{" "}
                    <span className="font-semibold">
                        {from
                            ? format(from, "dd MMM yyyy", { locale: localeId })
                            : "-"}
                    </span>
                    {" "}–{" "}
                    <span className="font-semibold">
                        {to
                            ? format(to, "dd MMM yyyy", { locale: localeId })
                            : "-"}
                    </span>
                    , Minggu{" "}
                    <span className="font-semibold">{weekNumber}</span>
                    , Bulan{" "}
                    <span className="font-semibold">{monthName}</span>
                    {" "}dengan{" "}
                    <span className="font-semibold">
                        {selectedReports.length} laporan
                    </span>
                    {" "}({formatCurrency(selectedTotal)}).
                </p>
            </div>
        </label>
    </div>
)}
```

> **Catatan import:** `format` dari `date-fns`, `localeId` dari `date-fns/locale`, `formatCurrency` dan `Checkbox` sudah tersedia di file ini. Tidak perlu import baru.

- [ ] **Step 4: Verifikasi TypeScript clean**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Manual test**

1. Buka dialog "Buat PJUM".
2. Isi semua field, pilih BMS, tanggal, minggu, bulan, lalu klik "Cek Laporan".
3. Pastikan blok kuning konfirmasi **muncul** di antara tabel laporan dan footer; tombol "Buat PJUM" **disabled**.
4. Baca ringkasan dan centang checkbox → tombol "Buat PJUM" **aktif**.
5. Uncheck checkbox → tombol kembali **disabled**.
6. Toggle satu laporan → checkbox kembali unchecked otomatis → tombol kembali disabled.
7. Klik "Cek Laporan" lagi → checkbox kembali unchecked otomatis.
8. Tutup dialog dan buka lagi → checkbox unchecked.
9. Isi ulang dan konfirmasi → klik "Buat PJUM" → PJUM berhasil dibuat.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/pjum/_components/create-pjum-dialog.tsx
git commit -m "feat(pjum): add explicit checkbox confirmation before creating PJUM"
```

---

### Task 3: Agent note

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-confirmation-checkbox.md` (ganti dengan waktu Jakarta saat commit)

- [ ] **Step 1: Buat agent note**

```markdown
# PJUM Confirmation Checkbox

## Scope

Menambahkan explicit checkbox summary di dialog "Buat PJUM" yang wajib dicentang
sebelum tombol submit aktif. Tidak ada perubahan backend.

## Context and Sources

- User feedback: banyak user BMC salah pilih periode (minggu/bulan) karena tidak
  ada konfirmasi sebelum proses jalan.
- Desain terpilih: Opsi 2 (Explicit Checkbox Summary) — memutus muscle memory
  tanpa modal bertumpuk.

## Changed Files

- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: tambah state
  `isConfirmed`, blok UI konfirmasi amber, reset lifecycle, dan modifikasi
  `disabled` pada tombol.

## Decisions

- State `isConfirmed` di-reset setiap kali: hasil search berubah, laporan
  di-toggle, atau dialog ditutup. Ini memastikan user selalu membaca ulang data
  terbaru sebelum submit.
- Blok konfirmasi hanya muncul ketika `canCreate === true` (minimal 1 laporan
  dipilih dan bulan sudah diisi) agar tidak mengotori UI saat form belum siap.
- Background amber dipilih untuk menarik perhatian secara visual (soft warning).

## Verification

- `npx tsc --noEmit` lulus tanpa error.
- Manual test: checkbox reset otomatis saat toggle laporan dan saat dialog
  ditutup/cek laporan ulang.

## Remaining Work and Risks

None.
```

- [ ] **Step 2: Commit**

```bash
git add docs/agent-notes/
git commit -m "docs: add agent note for pjum confirmation checkbox"
```
