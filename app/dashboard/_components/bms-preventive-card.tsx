"use client";

import Link from "next/link";
import { ShieldCheck, ChevronRight } from "lucide-react";
import type { BmsPreventiveCoverageResult } from "../preventive/actions";

function getDynamicNarration(completionRate: number, quarterLabel: string, completedCount: number, totalCount: number) {
    const parts = quarterLabel.split(" ");
    if (parts.length !== 2) return "Ayo selesaikan target preventifmu!";
    
    const [q, yearStr] = parts;
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return "Ayo selesaikan target preventifmu!";
    
    let month = 12; // Default to Dec
    if (q === "Q1") month = 3;
    if (q === "Q2") month = 6;
    if (q === "Q3") month = 9;
    if (q === "Q4") month = 12;

    const endDate = new Date(year, month, 0); // Last day of the month
    const today = new Date();
    
    const diffTime = endDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isUrgent = remainingDays <= 30 && remainingDays >= 0;
    
    if (isUrgent) {
        if (completionRate < 50) return `Akhir kuartal udah dekat nih, masih ada sisa ${totalCount - completedCount} toko lagi. Ayo pelan-pelan dikejar, semangat pasti kekejar!`;
        if (completionRate < 100) return `Tinggal ${totalCount - completedCount} toko lagi menuju akhir kuartal. Sedikit lagi pasti bisa, semangat menyelesaikannya!`;
        return "Mantap! Tepat pada waktunya, semua target selesai dengan sempurna. Semangat kerjanya luar biasa! 🏆";
    } else {
        if (completionRate === 0) return "Belum ada progres preventif nih. Yuk mulai dicicil dari sekarang, tetap semangat ya!";
        if (completionRate < 50) return `Awal yang baik! Kamu udah preventif ${completedCount} dari ${totalCount} toko. Tetap semangat ngelanjutin sisanya!`;
        if (completionRate < 100) return "Kerja bagus, udah lebih dari setengah perjalanan. Semangat terus, targetnya udah dekat!";
        return "Luar biasa! Semua target preventif selesai lebih awal. Semangat terus pertahankan performanya! 🎉";
    }
}

export function BmsPreventiveCard({ coverage }: { coverage: BmsPreventiveCoverageResult }) {
    const { completed, total, completionRate, quarterLabel } = coverage;
    const narration = getDynamicNarration(completionRate, quarterLabel, completed.length, total);

    return (
        <Link href="/dashboard/coverage" className="block w-full py-2 group">
            <div className="text-sm font-semibold mb-2 text-foreground">Rekap Preventif</div>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Target {quarterLabel}
                </div>
                <div className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                    {completed.length} / {total} Toko ({completionRate}%)
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                </div>
            </div>
            <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {narration}
            </div>
            <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${completionRate}%` }}
                />
            </div>
        </Link>
    );
}
