# Export SLA Cabang to XLSX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur ekspor data SLA Proses SPARTA ke format XLSX di halaman Performa Cabang (menggunakan format *flat* tabel rata).

**Architecture:** Karena komponen `AdminSLATable` sudah memiliki seluruh data SLA dalam *props* (`data: SLADurationBranch[]`), kita cukup menambahkan fungsionalitas ekspor di sisi klien (Client-Side) menggunakan *library* `xlsx`. Kita akan melakukan *flattening* data hierarkis (Cabang -> BMS) menjadi baris-baris berurut di Excel, di mana baris rata-rata cabang ditandai dengan `[RATA-RATA CABANG]`.

**Tech Stack:** React (Client Component), `xlsx`, TailwindCSS, `lucide-react`, `shadcn/ui`.

## Global Constraints

- Wajib mempertahankan fungsionalitas *table* yang sudah ada.
- Jangan mengubah struktur data *server action*.
- Menggunakan pendekatan *Client-Side Export*.

---

### Task 1: Membuat Logika Ekspor XLSX dan Tombol UI di Komponen Tabel

**Files:**
- Modify: `app/dashboard/branches/_components/admin-sla-table.tsx`

**Interfaces:**
- Consumes: `data` prop yang sudah ada.
- Produces: File download XLSX saat tombol ditekan.

- [ ] **Step 1: Tambahkan _import_ untuk _library_ XLSX, komponen Button, dan _icon_**

```tsx
// Di bagian atas file app/dashboard/branches/_components/admin-sla-table.tsx, tambahkan:
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 2: Buat fungsi _handler_ ekspor XLSX di dalam komponen**

```tsx
// Di dalam komponen AdminSLATable, sebelum return statement:

    const handleExport = () => {
        const rows: Record<string, string>[] = [];

        data.forEach(branch => {
            // Tambahkan baris untuk rata-rata cabang
            rows.push({
                "Nama Cabang": branch.branchName,
                "Nama BMS": "[RATA-RATA CABANG]",
                "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(branch.estimasiToAppvBMC),
                "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(branch.estimasiToRevisiBMC),
                "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(branch.appvBMCToWorkStart),
                "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(branch.workStartToRealisasi),
                "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(branch.realisasiToRevisiBMC),
                "REALISASI DIAJUKAN - APPV BMC": formatDuration(branch.realisasiToAppvBMC),
                "APPV BMC - APPV MGR": formatDuration(branch.appvBMCToAppvMGR),
            });

            // Tambahkan baris untuk tiap BMS di bawahnya
            branch.bmsList.forEach(bms => {
                rows.push({
                    "Nama Cabang": branch.branchName,
                    "Nama BMS": bms.bmsName,
                    "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(bms.estimasiToAppvBMC),
                    "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(bms.estimasiToRevisiBMC),
                    "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(bms.appvBMCToWorkStart),
                    "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(bms.workStartToRealisasi),
                    "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(bms.realisasiToRevisiBMC),
                    "REALISASI DIAJUKAN - APPV BMC": formatDuration(bms.realisasiToAppvBMC),
                    "APPV BMC - APPV MGR": formatDuration(bms.appvBMCToAppvMGR),
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SLA Proses");
        XLSX.writeFile(workbook, "SLA_Proses_SPARTA.xlsx");
    };
```

- [ ] **Step 3: Tambahkan tombol Ekspor di header tabel**

Ubah bagian header ini:
```tsx
            <div className="border-b pb-2">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
            </div>
```
Menjadi:
```tsx
            <div className="border-b pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    disabled={data.length === 0}
                    className="shrink-0"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor XLSX
                </Button>
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/branches/_components/admin-sla-table.tsx
git commit -m "feat(dashboard): add xlsx export to admin sla table"
```
