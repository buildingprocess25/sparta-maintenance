# BMC and BNM Preventive KPI Widget BMS Ranking Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Menampilkan peringkat 5 BMS dengan persentase preventif terbaik/terburuk (bisa di-toggle) pada widget Checklist Preventif di dashboard BMC dan BNM.

**Architecture:** Modifikasi `getAdminPreventiveKpiData` di server action agar mengenali role manajerial cabang (`BMC` & `BNM_MANAGER`) dan mengelompokkan capaian preventif berdasarkan BMS cabang tersebut (hanya BMS dengan target toko > 0). Pada frontend widget `PreventiveKpiWidget`, tambahkan dukungan ranking BMS dengan toggle sort "Terbaik" (persentase tertinggi) ↔ "Terburuk" (persentase terendah) dan judul dinamis "BMS Preventif Terbaik / Terburuk".

**Tech Stack:** Next.js (App Router, Server Actions), Prisma ORM, React (TypeScript, hooks), Tailwind CSS, Lucide icons.

---

### Task 1: Update Server Action Data Contract and Logic (`getAdminPreventiveKpiData`)

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Step 1: Inspect dan Tambah `bmsNIK` pada Store Query & User Profile**
Pastikan `prisma.store.findMany` mengambil `bmsNIK: true` dan lakukan query nama BMS dari tabel `User` untuk memetakan nama lengkap BMS.

**Step 2: Implementasi Agregasi Capaian per BMS untuk Role BMC & BNM**
- Jika `user.role === "BMC" || user.role === "BNM_MANAGER"`:
  - Kelompokkan store per `bmsNIK`.
  - Hitung `total` toko aktif target coverage dan `completed` toko yang sudah selesai checklist dalam periode window terkait (`quarter` atau `year`).
  - Abaikan BMS yang `total === 0` atau toko tanpa BMS.
  - Urutkan list berdasarkan persentase capaian.
  - Kembalikan `viewMode: "BMS"`, `allBmsItems`, dan `listTitle: "BMS Preventif Terbaik"`.

**Step 3: Verifikasi Type Definition `PreventiveKpiData`**
Perbarui interface `PreventiveKpiData` di `actions.ts`:
```ts
export type PreventiveKpiData = {
    capaianNasional: number;
    tercapai: number;
    belum: number;
    listTitle: string;
    listItems: PreventiveKpiListItem[];
    branchNames: string[];
    allBranchItems?: PreventiveKpiListItem[];
    allBmsItems?: PreventiveKpiListItem[];
    viewMode?: "BRANCH" | "BMS" | "MONTHLY";
};
```

---

### Task 2: Update Widget UI di `PreventiveKpiWidget`

**Files:**
- Modify: `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

**Step 1: Tambahkan State dan Logic Sort untuk Ranking BMS**
- State `bmsSort`: `"desc"` (Terbaik) | `"asc"` (Terburuk). Default: `"desc"`.
- Jika `data.viewMode === "BMS"` atau terdapat `data.allBmsItems`:
  - Gunakan `bmsSort` untuk mengurutkan `allBmsItems`:
    - `"desc"`: dari persentase tertinggi ke terendah (Terbaik).
    - `"asc"`: dari persentase terendah ke tertinggi (Terburuk).
  - Ambil top 5 item (`slice(0, 5)`).
  - Tampilkan judul:
    - `"desc"`: "BMS Preventif Terbaik"
    - `"asc"`: "BMS Preventif Terburuk"

**Step 2: Tambahkan Tombol Toggle Sort BMS**
- Tampilkan tombol toggle sort persis di header list sebelah kanan:
  ```tsx
  <button
      onClick={() => setBmsSort(prev => prev === "desc" ? "asc" : "desc")}
      className="flex items-center gap-1 text-xs text-primary hover:underline"
      title={bmsSort === "desc" ? "Tampilkan terburuk" : "Tampilkan terbaik"}
  >
      <ArrowDownUp className="h-3 w-3" />
      {bmsSort === "desc" ? "Terbaik" : "Terburuk"}
  </button>
  ```

**Step 3: Sesuaikan Link "Lihat semua"**
- Link "Lihat semua" tetap diarahkan ke `/dashboard/preventive?tab=coverage-bms&branch=${branch}&quarter=${quarter}`.

---

### Task 3: Verifikasi dan Pengujian

**Files:**
- Verifikasi: `app/dashboard/preventive/actions.ts`
- Verifikasi: `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

**Step 1: Run TypeScript Compilation Check**
Jalankan kompilasi TypeScript untuk memastikan tidak ada kesalahan tipe:
```powershell
node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit
```

**Step 2: Manual Check / Code Review**
- Pastikan dashboard Admin tetap menampilkan cabang nasional saat `all`.
- Pastikan dashboard BMC dan BNM menampilkan 5 BMS terbaik dengan toggle ke terburuk.
- Pastikan tidak ada BMS dengan target 0 yang muncul di daftar.
- Pastikan aturan "gausah dulu distaging dan dicommit" tetap ditaati sampai ada instruksi lebih lanjut.
