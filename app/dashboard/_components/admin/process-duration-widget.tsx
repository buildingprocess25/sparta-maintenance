"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminProcessDurationData, type ProcessDurationData, type PreventiveQuarter } from "../../preventive/actions";
import { getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";

export function ProcessDurationWidget() {
    const [quarter, setQuarter] = useState<PreventiveQuarter | "all">(getJakartaCurrentQuarter());
    const [data, setData] = useState<ProcessDurationData | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {
            getAdminProcessDurationData(getJakartaYear(), quarter).then(setData);
        });
    }, [quarter]);

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
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold tracking-tight">Durasi Proses per Tahapan</h3>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                        {data?.viewMode === "BMS" 
                            ? "5 teknisi dengan rata-rata durasi tertinggi (satuan: jam dan menit)" 
                            : "5 cabang dengan rata-rata durasi tertinggi (satuan: jam dan menit)"}
                    </span>
                    <Select value={quarter.toString()} onValueChange={(val) => setQuarter(val === "all" ? "all" : parseInt(val) as PreventiveQuarter)}>
                        <SelectTrigger className="w-[150px] h-9 text-xs">
                            <SelectValue placeholder="Semua Triwulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Triwulan</SelectItem>
                            <SelectItem value="1">Triwulan 1</SelectItem>
                            <SelectItem value="2">Triwulan 2</SelectItem>
                            <SelectItem value="3">Triwulan 3</SelectItem>
                            <SelectItem value="4">Triwulan 4</SelectItem>
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
