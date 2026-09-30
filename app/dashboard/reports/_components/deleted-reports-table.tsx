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
        <div className="flex flex-col h-full gap-4">
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
