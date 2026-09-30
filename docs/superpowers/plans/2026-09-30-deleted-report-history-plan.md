# Deleted Report History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur pencatatan dan tabel history (beserta ekspor XLSX) untuk laporan maintenance yang dihapus permanen.

**Architecture:** 
1. Database: Model `DeletedReport` baru di Prisma untuk menyimpan data laporan yang dihapus.
2. Fitur Hapus: Mengubah form modal hapus permanen untuk menerima "Alasan Penghapusan" dan menyimpan record ke `DeletedReport` sebelum menghapus row `Report`.
3. Tampilan: Membungkus `AdminReportsTable` di `app/dashboard/reports/page.tsx` dengan komponen `Tabs`, dan membuat `DeletedReportsTable` baru untuk tab kedua, yang juga memiliki tombol Ekspor XLSX.

**Tech Stack:** Next.js App Router, Prisma, Tailwind CSS, shadcn/ui.

## Global Constraints

- Laporan yang dihapus sebelum fitur ini rilis tidak akan muncul di history (karena sudah hard-delete).
- Komponen UI harus mengikuti styling shadcn/ui yang sudah ada.

---

### Task 1: Database Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `DeletedReport` model di database.

- [ ] **Step 1: Tambahkan model `DeletedReport` di schema.prisma**

Tambahkan kode ini di bagian bawah file `prisma/schema.prisma`:
```prisma
model DeletedReport {
  id              String   @id @default(uuid())
  reportNumber    String   @unique
  storeCode       String?
  storeName       String
  itemCount       Int
  totalEstimation Decimal  @db.Decimal(15, 2)
  totalReal       Decimal? @db.Decimal(15, 2)
  lastStatus      String
  
  deletedByNIK    String
  deletedByName   String
  deleteReason    String
  
  deletedAt       DateTime @default(now()) @db.Timestamptz(3)
  
  // Backup data laporan utuh jika sewaktu-waktu dibutuhkan
  originalData    Json 

  @@index([deletedAt])
  @@index([storeCode])
  @@index([deletedByNIK])
}
```

- [ ] **Step 2: Jalankan migrasi Prisma**

Jalankan perintah push schema ke database:
```bash
npx prisma db push
npx prisma generate
```
Harapkan sukses tanpa error.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add DeletedReport model"
```

---

### Task 2: Modifikasi Aksi Hapus Laporan (Server Action)

**Files:**
- Modify: `app/dashboard/reports/actions.ts`

**Interfaces:**
- Consumes: Prisma `DeletedReport`
- Produces: Memperbarui fungsi `deleteAdminReport(reportNumber, confirmationReportNumber, deleteReason)`

- [ ] **Step 1: Update fungsi `deleteAdminReport`**

Ubah signature parameter fungsi di `actions.ts` menjadi:
```typescript
export async function deleteAdminReport(
    reportNumber: string,
    confirmationReportNumber: string,
    deleteReason: string,
): Promise<{ success?: true; error?: string }> {
```

Lalu di dalamnya, sebelum validasi selesai (setelah validasi user dan nomor konfirmasi), cek validasi alasan:
```typescript
        if (!deleteReason || deleteReason.trim() === "") {
            return { error: "Alasan penghapusan harus diisi" };
        }
```

Lalu di dalam `prisma.$transaction`, sebelum memanggil `tx.approvalLog.deleteMany`, tambahkan logika untuk membuat `DeletedReport`:
```typescript
            // Backup full report data for history
            const fullReportForBackup = await tx.report.findUnique({
                where: { reportNumber },
            });
            if (fullReportForBackup) {
                // Determine item count from JSON items
                let itemCount = 0;
                try {
                    const parsedItems = JSON.parse(
                        typeof fullReportForBackup.items === "string"
                            ? fullReportForBackup.items
                            : JSON.stringify(fullReportForBackup.items)
                    );
                    itemCount = Array.isArray(parsedItems) ? parsedItems.length : 0;
                } catch (e) {
                    // Ignore JSON parse error, default 0
                }

                await tx.deletedReport.create({
                    data: {
                        reportNumber: fullReportForBackup.reportNumber,
                        storeCode: fullReportForBackup.storeCode,
                        storeName: fullReportForBackup.storeName,
                        itemCount,
                        totalEstimation: fullReportForBackup.totalEstimation,
                        totalReal: fullReportForBackup.totalReal,
                        lastStatus: fullReportForBackup.status,
                        deletedByNIK: user.NIK,
                        deletedByName: user.name,
                        deleteReason: deleteReason.trim(),
                        originalData: fullReportForBackup as any,
                    }
                });
            }
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/reports/actions.ts
git commit -m "feat: save to DeletedReport on delete"
```

---

### Task 3: Modifikasi UI Modal Konfirmasi Hapus Permanen

**Files:**
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`

**Interfaces:**
- Consumes: Updated `deleteAdminReport` signature.

- [ ] **Step 1: Tambahkan state dan input untuk `deleteReason`**

Di `report-detail-workbench.tsx`, tambahkan state `deleteReason`:
```tsx
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteReason, setDeleteReason] = useState("");
```

Lalu perbarui panggilan `handleDelete`:
```tsx
            const result = await deleteAdminReport(
                report.reportNumber,
                deleteConfirmation,
                deleteReason
            );
```

Perbarui juga `onOpenChange` pada `AlertDialog` hapus untuk mereset `deleteReason`:
```tsx
                onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) {
                        setDeleteConfirmation("");
                        setDeleteReason("");
                    }
                }}
```

- [ ] **Step 2: Tambahkan Textarea di dalam modal AlertDialog**

Impor Textarea di bagian atas:
```tsx
import { Textarea } from "@/components/ui/textarea";
```

Lalu pada UI modal delete, di bawah div konfirmasi nomor laporan, tambahkan:
```tsx
                    <div className="grid gap-2">
                        <label
                            htmlFor="delete-report-reason"
                            className="text-sm font-medium"
                        >
                            Alasan Penghapusan <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                            id="delete-report-reason"
                            value={deleteReason}
                            onChange={(event) => setDeleteReason(event.target.value)}
                            placeholder="Alasan laporan ini dihapus permanen..."
                            disabled={isDeleting}
                            rows={3}
                        />
                    </div>
```

Dan update properti `disabled` di tombol "Hapus permanen" agar mengecek alasan:
```tsx
                            disabled={
                                isDeleting ||
                                deleteConfirmation !== report.reportNumber ||
                                deleteReason.trim() === ""
                            }
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx
git commit -m "feat: add delete reason input to delete modal"
```

---

### Task 4: UI History Tab & Table Component

**Files:**
- Create: `app/dashboard/reports/_components/deleted-reports-table.tsx`
- Create: `app/dashboard/reports/deleted-actions.ts`

**Interfaces:**
- Produces: Komponen tabel history untuk merender laporan terhapus.

- [ ] **Step 1: Buat Server Action untuk Fetch Data**

Buat file baru `app/dashboard/reports/deleted-actions.ts`:
```typescript
"use server";

import { getAuthUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function getDeletedReports() {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }
    
    const reports = await prisma.deletedReport.findMany({
        orderBy: { deletedAt: "desc" },
        take: 100, // Batasi 100 data terbaru untuk performa awal
    });
    
    return reports;
}
```

- [ ] **Step 2: Buat komponen tabel History**

Buat file `app/dashboard/reports/_components/deleted-reports-table.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { getDeletedReports } from "../deleted-actions";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type DeletedReport = Awaited<ReturnType<typeof getDeletedReports>>[0];

export function DeletedReportsTable() {
    const [data, setData] = useState<DeletedReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getDeletedReports()
            .then((res) => {
                setData(res);
                setIsLoading(false);
            })
            .catch(() => {
                toast.error("Gagal memuat history laporan dihapus");
                setIsLoading(false);
            });
    }, []);

    const handleExport = () => {
        const rows = data.map((d) => ({
            "No Laporan": d.reportNumber,
            "Kode Toko": d.storeCode || "-",
            "Nama Toko": d.storeName,
            "Waktu Dihapus": format(new Date(d.deletedAt), "dd MMM yyyy HH:mm"),
            "Dihapus Oleh": `${d.deletedByName} (${d.deletedByNIK})`,
            "Status Laporan Terakhir": d.lastStatus,
            "Jumlah Item Terinput": d.itemCount,
            "Nominal Estimasi": Number(d.totalEstimation),
            "Nominal Realisasi": d.totalReal ? Number(d.totalReal) : 0,
            "Alasan Dihapusnya": d.deleteReason,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "History Hapus Laporan");
        XLSX.writeFile(wb, `History_Hapus_Laporan_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    if (isLoading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-muted-foreground" /></div>;
    }

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">History Laporan Dihapus (100 Terakhir)</h3>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor XLSX
                </Button>
            </div>
            
            <div className="rounded-md border flex-1 overflow-auto bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No Laporan</TableHead>
                            <TableHead>Toko</TableHead>
                            <TableHead>Waktu Dihapus</TableHead>
                            <TableHead>Dihapus Oleh</TableHead>
                            <TableHead className="w-[300px]">Alasan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Belum ada data laporan yang dihapus.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.reportNumber}</TableCell>
                                    <TableCell>{item.storeCode} - {item.storeName}</TableCell>
                                    <TableCell>{format(new Date(item.deletedAt), "dd MMM yyyy HH:mm")}</TableCell>
                                    <TableCell>{item.deletedByName}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={item.deleteReason}>
                                        {item.deleteReason}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
```

Lakukan run `npm install xlsx` jika XLSX belum ada. (Berdasarkan dependensi yang biasa, jika belum ada, asumsikan sudah ada atau install). 
*Catatan: Jika `xlsx` belum ada di package.json, jalankan `npm i xlsx`.*

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/reports/_components/deleted-reports-table.tsx app/dashboard/reports/deleted-actions.ts
git commit -m "feat: add deleted reports history table component with export"
```

---

### Task 5: Inject Tabs ke dalam Laporan Maintenance Page

**Files:**
- Modify: `app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `DeletedReportsTable`

- [ ] **Step 1: Import Tabs dan komponen baru**

Di `app/dashboard/reports/page.tsx`, tambahkan import:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeletedReportsTable } from "./_components/deleted-reports-table";
```

- [ ] **Step 2: Ubah return function render**

Ganti `return (` yang merender `<AdminDashboardShell>` menjadi:

```tsx
    return (
        <AdminDashboardShell
            user={user}
            title="Laporan Maintenance"
            breadcrumbs={[{ label: "Laporan Maintenance" }]}
            headerActions={
                <ExportReportsDialog
                    branches={branches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full flex flex-col p-0"
        >
            <Tabs defaultValue="active" className="flex flex-col h-full">
                <div className="px-6 pt-4 border-b">
                    <TabsList>
                        <TabsTrigger value="active">Laporan Aktif</TabsTrigger>
                        <TabsTrigger value="deleted">Laporan Dihapus</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="active" className="flex-1 m-0 h-full">
                    <AdminReportsTable
                        initialData={initialReports.reports}
                        initialNextCursor={initialReports.nextCursor}
                        initialTotalCount={initialReports.totalCount}
                        branches={branches}
                        areaNames={areaOptions}
                        initialStatus={initialStatus ?? "all"}
                        initialScope={initialScope ?? "all"}
                        initialPjumStatus={initialPjumStatus ?? "all"}
                        initialBranchName={initialBranchName ?? "all"}
                        initialAreaName={initialAreaName ?? "all"}
                        initialBrand={initialBrand}
                        initialFromDate={initialFromDate}
                        initialToDate={initialToDate}
                        showBrandFilter={isAdmin}
                    />
                </TabsContent>
                
                <TabsContent value="deleted" className="flex-1 m-0 h-full">
                    <DeletedReportsTable />
                </TabsContent>
            </Tabs>
        </AdminDashboardShell>
    );
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/reports/page.tsx
git commit -m "feat: add tabs for deleted reports history"
```

---
