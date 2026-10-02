"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminProcessDurationData, type ProcessDurationData } from "../../preventive/actions";
import { getJakartaYear } from "@/lib/time";

export function ProcessDurationWidget() {
    const [period, setPeriod] = useState<string>("ytd");
    const [data, setData] = useState<ProcessDurationData | null>(null);
    const [isPending, startTransition] = useTransition();
    const currentYear = getJakartaYear();

    useEffect(() => {
        startTransition(() => {
            getAdminProcessDurationData(period).then(setData);
        });
    }, [period]);

    const renderCard = (title: string, subtitle: string, items: { label: string; formattedDuration: string }[] | undefined) => (
        <div className="rounded-xl border bg-card/50 p-0 flex flex-col h-full shadow-sm overflow-hidden">
            <div className="p-5 pb-4 border-b bg-card/40">
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>
            
            <div className="flex-grow flex flex-col">
                {!items ? (
                    <div className="p-5 text-sm text-muted-foreground animate-pulse flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        Memuat data...
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground flex flex-col items-center justify-center text-center h-full gap-2 opacity-60">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-lg">✨</span>
                        </div>
                        <p>Tidak ada keterlambatan signifikan.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {items.map((item, i) => (
                            <div 
                                key={item.label} 
                                className="flex justify-between items-center px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                                        i === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                        i === 1 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                                        i === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    <span className="font-medium text-sm text-foreground/90">{item.label}</span>
                                </div>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-mono font-medium ${
                                    i === 0 ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' : 
                                    'text-muted-foreground'
                                }`}>
                                    {item.formattedDuration}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 mt-auto border-t bg-muted/10">
                <Link 
                    href="/dashboard/branches?tab=sla" 
                    className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 w-full"
                >
                    Lihat Analisis Lengkap <ArrowUpRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    );

    return (
        <div className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold tracking-tight">Durasi Proses per Tahapan</h3>
                    <p className="text-sm font-semibold text-muted-foreground">
                        *Data dihitung berdasarkan semua status laporan (In progress, ditolak, selesai).
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                        {data?.viewMode === "BMS" 
                            ? "5 teknisi dengan rata-rata durasi tertinggi (satuan: jam dan menit)" 
                            : "5 cabang dengan rata-rata durasi tertinggi (satuan: jam dan menit)"}
                    </span>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Tahun Berjalan (YTD)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ytd">Tahun Berjalan (YTD)</SelectItem>
                            <SelectItem value={`01-${currentYear}`}>Januari {currentYear}</SelectItem>
                            <SelectItem value={`02-${currentYear}`}>Februari {currentYear}</SelectItem>
                            <SelectItem value={`03-${currentYear}`}>Maret {currentYear}</SelectItem>
                            <SelectItem value={`04-${currentYear}`}>April {currentYear}</SelectItem>
                            <SelectItem value={`05-${currentYear}`}>Mei {currentYear}</SelectItem>
                            <SelectItem value={`06-${currentYear}`}>Juni {currentYear}</SelectItem>
                            <SelectItem value={`07-${currentYear}`}>Juli {currentYear}</SelectItem>
                            <SelectItem value={`08-${currentYear}`}>Agustus {currentYear}</SelectItem>
                            <SelectItem value={`09-${currentYear}`}>September {currentYear}</SelectItem>
                            <SelectItem value={`10-${currentYear}`}>Oktober {currentYear}</SelectItem>
                            <SelectItem value={`11-${currentYear}`}>November {currentYear}</SelectItem>
                            <SelectItem value={`12-${currentYear}`}>Desember {currentYear}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderCard(
                    "Estimasi → Approval BMC", 
                    "Durasi sejak BMS selesai estimasi hingga BMC approve", 
                    data?.estimasiToBmc
                )}
                {renderCard(
                    "Approval BMC → Approval Manager", 
                    "Durasi sejak approval BMC hingga manager approve", 
                    data?.bmcToManager
                )}
                {renderCard(
                    "Durasi Pengerjaan BMS", 
                    "Rata-rata waktu BMS menyelesaikan pekerjaan", 
                    data?.bmsWork
                )}
            </div>
        </div>
    );
}
