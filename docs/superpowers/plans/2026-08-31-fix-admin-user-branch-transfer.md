# Fix Admin User Branch Transfer — Branch Select + Active Report Warning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki field Branch di form edit user Admin dari `<Input+datalist>` ke `<Select>` yang proper, dan tambahkan warning aktif saat user yang diedit masih punya laporan berjalan.

**Architecture:**
- Task 1 mengganti UI field Branch di `AdminUserFormDialog` dari native datalist ke `<Select>` shadcn — mengikuti pola yang sudah ada di `AdminStoreFormDialog`.
- Task 2 menambahkan server action baru `adminGetUserActiveReports` yang mengecek apakah BMS target punya laporan aktif.
- Task 3 mewire warning UI ke dalam dialog — fetch active reports saat form dibuka (edit mode), tampilkan banner kuning jika ada laporan aktif.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, shadcn/ui (`Select`, `SelectContent`, `SelectItem`).

## Global Constraints

- Hanya bekerja di `app/admin/database/` — tidak ada perubahan di BMC atau BMS pages.
- Tidak mengubah kolom DB, schema Prisma, atau logika `adminUpdateUser` backend. Hanya perubahan UI + 1 server action read-only baru.
- Ikuti pola `AdminStoreFormDialog` untuk penggunaan `<Select>` branch.
- Warning ditampilkan hanya di **edit mode**, bukan saat tambah user baru.
- Active reports yang dicek: semua status kecuali `COMPLETED`, `DRAFT`, `ESTIMATION_REJECTED`, dan status archived.

---

### Task 1: Ganti `<Input+datalist>` Branch → `<Select>` di AdminUserFormDialog

**Files:**
- Modify: `app/admin/database/_components/user-form-dialog.tsx`

**Interfaces:**
- Consumes: `allBranchNames: string[]` (prop yang sudah ada)
- Produces: state `branchInput` tetap `string` (single selected branch name), tapi sekarang dikontrol oleh `<Select>` shadcn, bukan `<Input>`.

**Context:** `AdminStoreFormDialog` (`store-form-dialog.tsx:214-228`) sudah menggunakan pola `<Select>` ini dengan benar. Ikuti persis polanya.

- [ ] **Step 1: Sesuaikan nilai default `branchInput` saat create mode**

Di [user-form-dialog.tsx](app/admin/database/_components/user-form-dialog.tsx), ubah init state `branchInput` (baris ~69):

```tsx
// SEBELUM
const [branchInput, setBranchInput] = useState(
    editUser?.branchNames.join(", ") ?? "",
);

// SESUDAH
const [branchInput, setBranchInput] = useState(
    editUser?.branchNames[0] ?? allBranchNames[0] ?? "",
);
```

Dan di fungsi `resetForm()`:
```tsx
function resetForm() {
    if (!isEdit) {
        setNik("");
        setName("");
        setEmail("");
        setRole("BMS");
        setBranchInput(allBranchNames[0] ?? "");
        setAreaNamesInput("");
    }
}
```

- [ ] **Step 2: Ganti blok UI field Branch (`<Input+datalist>`) dengan `<Select>`**

Di [user-form-dialog.tsx](app/admin/database/_components/user-form-dialog.tsx), ganti seluruh blok field Branch (baris ~248-274) dengan:

```tsx
{/* Branch — hidden for ADMIN role */}
{needsBranch && (
    <div className="space-y-2">
        <Label htmlFor="admin-user-branch">Branch</Label>
        <Select
            value={branchInput}
            onValueChange={setBranchInput}
        >
            <SelectTrigger id="admin-user-branch">
                <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
                {allBranchNames.map((b) => (
                    <SelectItem key={b} value={b}>
                        {b}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
)}
```

**Catatan:** `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` sudah diimport di baris 16-22 file ini — tidak perlu tambah import baru.

- [ ] **Step 3: Sesuaikan `parseBranchNames` di `handleSubmit`**

Fungsi `parseBranchNames` yang ada sudah benar — `"LAMPUNG"` → `["LAMPUNG"]`. Tidak perlu diubah.

- [ ] **Step 4: Verifikasi TypeScript compile**

```powershell
npx tsc --noEmit 2>&1 | Select-String "user-form-dialog"
```

Expected: tidak ada output (no errors).

- [ ] **Step 5: Manual test**

1. Buka `/admin/database`
2. Klik Edit di salah satu user (role BMS)
3. Pastikan field Branch sekarang menampilkan dropdown yang bisa diklik dan berisi daftar cabang
4. Pilih cabang berbeda → klik Simpan → pastikan berhasil

- [ ] **Step 6: Commit**

```powershell
git add "app/admin/database/_components/user-form-dialog.tsx"
git commit -m "fix(admin): ganti branch input+datalist ke Select di AdminUserFormDialog"
```

---

### Task 2: Server Action — Cek Laporan Aktif BMS

**Files:**
- Modify: `app/admin/database/actions.ts`

**Interfaces:**
- Produces:
```ts
export async function adminGetUserActiveReports(NIK: string): Promise<
    { count: number; reportNumbers: string[] } | { error: string }
>
```

- [ ] **Step 1: Tambahkan constant status dan function `adminGetUserActiveReports`**

Tambahkan di bagian bawah `app/admin/database/actions.ts` (setelah `adminUpdateUser`, sebelum `adminDeleteUser`):

```ts
const ACTIVE_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_REJECTED_REVISION",
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

export async function adminGetUserActiveReports(NIK: string): Promise<
    { count: number; reportNumbers: string[] } | { error: string }
> {
    try {
        await requireMasterDataManager();

        const reports = await prisma.report.findMany({
            where: {
                createdByNIK: NIK,
                status: { in: [...ACTIVE_REPORT_STATUSES] },
            },
            select: { reportNumber: true },
        });

        return {
            count: reports.length,
            reportNumbers: reports.map((r) => r.reportNumber),
        };
    } catch {
        return { error: "Gagal mengecek laporan aktif" };
    }
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```powershell
npx tsc --noEmit 2>&1 | Select-String "actions"
```

Expected: tidak ada output (no errors).

- [ ] **Step 3: Commit**

```powershell
git add "app/admin/database/actions.ts"
git commit -m "feat(admin): tambah adminGetUserActiveReports server action"
```

---

### Task 3: Warning Banner Laporan Aktif di AdminUserFormDialog

**Files:**
- Modify: `app/admin/database/_components/user-form-dialog.tsx`

**Interfaces:**
- Consumes: `adminGetUserActiveReports(NIK)` dari Task 2.
- Produces: banner warning kuning di dalam dialog saat `activeReports.count > 0`.

- [ ] **Step 1: Tambahkan import baru**

Di [user-form-dialog.tsx](app/admin/database/_components/user-form-dialog.tsx), tambahkan:

```tsx
// Tambah ke import lucide-react yang sudah ada (baris ~24)
import { Plus, Pencil, AlertTriangle } from "lucide-react";

// Tambah di bawah import yang ada
import { useEffect } from "react";
import { adminGetUserActiveReports } from "../actions";
```

**Catatan:** `useState` dan `useTransition` sudah diimport di baris 3.

- [ ] **Step 2: Tambahkan state untuk laporan aktif**

Di dalam function `AdminUserFormDialog`, setelah state `areaNamesInput`:

```tsx
const [activeReports, setActiveReports] = useState<{
    count: number;
    reportNumbers: string[];
} | null>(null);
const [isCheckingReports, setIsCheckingReports] = useState(false);
```

- [ ] **Step 3: Tambahkan `useEffect` untuk fetch laporan aktif**

```tsx
useEffect(() => {
    if (!open || !isEdit) return;

    setIsCheckingReports(true);
    adminGetUserActiveReports(nik).then((result) => {
        if (!("error" in result)) {
            setActiveReports(result);
        }
        setIsCheckingReports(false);
    });
}, [open, isEdit, nik]);
```

- [ ] **Step 4: Reset state saat dialog ditutup**

Di handler `onOpenChange`:

```tsx
onOpenChange={(v) => {
    setOpen(v);
    if (!v) {
        setActiveReports(null);
        setIsCheckingReports(false);
    }
    if (v && !isEdit) resetForm();
}}
```

- [ ] **Step 5: Tambahkan banner warning di dalam form**

Di dalam `<form>`, tepat sebelum blok `{/* NIK */}`:

```tsx
{/* Warning: Active Reports */}
{isEdit && isCheckingReports && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 animate-pulse">
        Memeriksa laporan aktif...
    </div>
)}
{isEdit && !isCheckingReports && activeReports && activeReports.count > 0 && (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800">
                    User ini memiliki {activeReports.count} laporan aktif
                </p>
                <p className="text-xs text-amber-700">
                    Pastikan semua laporan sudah selesai sebelum memindahkan
                    cabang. Laporan yang sedang berjalan tidak akan otomatis
                    dipindahkan ke cabang baru.
                </p>
                <p className="text-xs text-amber-600 font-mono mt-1">
                    {activeReports.reportNumbers.slice(0, 5).join(", ")}
                    {activeReports.reportNumbers.length > 5
                        ? ` +${activeReports.reportNumbers.length - 5} lainnya`
                        : ""}
                </p>
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 6: Verifikasi TypeScript compile**

```powershell
npx tsc --noEmit 2>&1 | Select-String "user-form-dialog"
```

Expected: tidak ada output (no errors).

- [ ] **Step 7: Manual test**

1. Buka `/admin/database`
2. Edit user BMS yang punya laporan `IN_PROGRESS` → banner amber muncul beserta nomor laporan
3. Edit user BMS tanpa laporan aktif → banner tidak muncul
4. Klik Simpan pada user dengan laporan aktif → simpan tetap berhasil (warning, bukan block)

- [ ] **Step 8: Commit**

```powershell
git add "app/admin/database/_components/user-form-dialog.tsx"
git commit -m "feat(admin): tambah warning laporan aktif di form edit user"
```

---

### Task 4: Agent Note

**Files:**
- Create: `docs/agent-notes/2026-08-31-HHMM-fix-admin-user-branch-transfer.md`

- [ ] **Step 1: Buat agent note dengan timestamp Asia/Jakarta**

```markdown
# Fix: Admin User Branch Transfer — Select + Active Report Warning

## Scope

- Ganti field Branch di AdminUserFormDialog dari `<Input+datalist>` ke `<Select>` shadcn.
- Tambahkan server action `adminGetUserActiveReports` untuk cek laporan berjalan.
- Tambahkan warning banner di form edit saat user target punya laporan aktif.

## Context and Sources

- `app/admin/database/_components/store-form-dialog.tsx`: referensi pola Select yang diikuti.
- Histori laporan aman saat ganti branch karena `branchName` di-snapshot per Report row, bukan FK.

## Changed Files

- `app/admin/database/_components/user-form-dialog.tsx`: fix Select + tambah warning UI.
- `app/admin/database/actions.ts`: tambah `adminGetUserActiveReports`.

## Decisions

- Warning bersifat informatif (soft warning), tidak memblokir simpan.
- Hanya laporan non-terminal yang dihitung: PENDING_ESTIMATION, ESTIMATION_APPROVED,
  ESTIMATION_REJECTED_REVISION, IN_PROGRESS, PENDING_REVIEW, APPROVED_BMC, REVIEW_REJECTED_REVISION.

## Verification

- TypeScript compile clean
- Manual test: edit user BMS dengan laporan aktif → warning muncul, simpan tetap berhasil.
```

- [ ] **Step 2: Commit agent note**

```powershell
git add "docs/agent-notes/..."
git commit -m "docs: agent note fix admin user branch transfer"
```
