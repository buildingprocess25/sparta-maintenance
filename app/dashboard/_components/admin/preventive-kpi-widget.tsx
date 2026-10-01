"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminPreventiveKpiData, getPreventiveBranchOptions, type PreventiveKpiData, type PreventiveQuarter } from "../../preventive/actions";
import { getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";

export function PreventiveKpiWidget() {
    const [quarter, setQuarter] = useState<PreventiveQuarter | "all">(getJakartaCurrentQuarter());
    const [branchName, setBranchName] = useState<string>("all");
    const [data, setData] = useState<PreventiveKpiData | null>(null);
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [branchSort, setBranchSort] = useState<"asc" | "desc">("asc");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        getPreventiveBranchOptions().then((branches) => {
            setAvailableBranches(branches);
            if (branches.length === 1) {
                setBranchName(branches[0]);
            }
        });
    }, []);

    useEffect(() => {
        startTransition(() => {
            getAdminPreventiveKpiData(getJakartaYear(), quarter, branchName).then(setData);
        });
    }, [quarter, branchName]);

    const pieData = data ? [
        { name: "Tercapai", value: data.capaianNasional, color: "#10b981" }, // emerald-500
        { name: "Belum", value: 100 - data.capaianNasional, color: "#f43f5e" } // rose-500
    ] : [];

    const displayedBranchItems = (() => {
        if (!data?.allBranchItems?.length) return data?.listItems ?? [];
        const items = [...data.allBranchItems].sort((a, b) =>
            branchSort === "asc"
                ? a.percentage - b.percentage
                : b.percentage - a.percentage
        );
        return items.slice(0, 5);
    })();

    const branchListTitle = branchSort === "asc"
        ? "5 Cabang Preventif Terendah"
        : "5 Cabang Preventif Tertinggi";

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Checklist Preventif</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Capaian checklist preventif per cabang dan triwulan</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={branchName} onValueChange={setBranchName} disabled={!data || availableBranches.length <= 1}>
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Semua Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableBranches.length !== 1 && (
                                <SelectItem value="all">Semua Cabang</SelectItem>
                            )}
                            {availableBranches.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
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

                    <Link href="/dashboard/preventive" className="text-xs text-primary hover:underline flex items-center ml-2">
                        Detail Preventif <ArrowUpRight className="h-3 w-3 ml-0.5" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-sm font-medium mb-4 text-center">
                        {branchName === "all" ? "Capaian Nasional" : `Capaian Cabang ${branchName}`}
                    </div>
                    {data ? (
                        <>
                            <div className="relative h-48 w-48 mx-auto flex items-center justify-center">
                                <PieChart width={192} height={192} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Tooltip 
                                        formatter={(value: any) => [`${value}%`, "Total"]}
                                        contentStyle={{ 
                                            borderRadius: '8px', 
                                            border: '1px solid hsl(var(--border))',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            fontSize: '12px',
                                            padding: '8px 12px'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                                    />
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="hsl(var(--background))"
                                        strokeWidth={3}
                                        isAnimationActive={true}
                                        animationDuration={800}
                                        animationBegin={100}
                                        paddingAngle={2}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color} 
                                                className="hover:opacity-80 transition-opacity duration-200 outline-none" 
                                                style={{ outline: 'none' }}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none mt-1">
                                    <span className="text-2xl font-bold leading-none">
                                        {Number(data.capaianNasional).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">capaian</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 mt-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span>Tercapai {Number(data.capaianNasional).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    <span>Belum {Number(100 - data.capaianNasional).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-48 w-48 flex items-center justify-center text-sm text-muted-foreground">Memuat...</div>
                    )}
                </div>

                {/* List Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium">
                            {branchName === "all"
                                ? branchListTitle
                                : (data ? data.listTitle : "Memuat...")}
                        </div>
                        <div className="flex items-center gap-2">
                            {branchName === "all" && (
                                <button
                                    onClick={() => setBranchSort(prev => prev === "asc" ? "desc" : "asc")}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    title={branchSort === "asc" ? "Tampilkan tertinggi" : "Tampilkan terendah"}
                                >
                                    <ArrowDownUp className="h-3 w-3" />
                                    {branchSort === "asc" ? "Terendah" : "Tertinggi"}
                                </button>
                            )}
                            {branchName === "all" && (
                                <Link
                                    href={`/dashboard/preventive?tab=branches&sort=${branchSort}`}
                                    className="text-xs text-primary hover:underline flex items-center"
                                >
                                    Lihat semua <ArrowUpRight className="h-3 w-3 ml-0.5" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {data ? displayedBranchItems.map((item, i) => {
                            let barColor = "bg-rose-500";
                            let textColor = "text-rose-600 dark:text-rose-400";
                            
                            if (branchName !== "all" && quarter !== "all") {
                                // For Monthly pacing, Target per month is ~33%
                                if (item.percentage >= 30) {
                                    barColor = "bg-emerald-500";
                                    textColor = "text-emerald-600 dark:text-emerald-400";
                                } else if (item.percentage >= 15) {
                                    barColor = "bg-amber-500";
                                    textColor = "text-amber-600 dark:text-amber-400";
                                }
                            } else {
                                // For overall compliance
                                if (item.percentage >= 60) {
                                    barColor = "bg-amber-500";
                                    textColor = "text-amber-600 dark:text-amber-400";
                                }
                                if (item.percentage >= 80) {
                                    barColor = "bg-emerald-500";
                                    textColor = "text-emerald-600 dark:text-emerald-400";
                                }
                            }

                            return (
                                <div key={item.label} className="group flex flex-col gap-2 p-2.5 -mx-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            {branchName === "all" && (
                                                <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                                                    {i + 1}
                                                </span>
                                            )}
                                            <span className="font-medium text-foreground/90">{item.label}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`font-semibold font-mono ${textColor}`}>
                                                {Number(item.percentage).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                ({item.completed}/{item.total} Toko)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden ml-8 max-w-[calc(100%-2rem)]">
                                        <div className={`h-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-sm text-muted-foreground">Memuat data...</div>
                        )}
                        {data?.listItems.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">Data tidak tersedia.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
