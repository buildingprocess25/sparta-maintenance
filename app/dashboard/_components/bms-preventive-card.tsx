"use client";

import Link from "next/link";
import { ShieldCheck, ChevronRight } from "lucide-react";
import type { BmsPreventiveCoverageResult } from "../preventive/actions";

export function BmsPreventiveCard({ coverage }: { coverage: BmsPreventiveCoverageResult }) {
    const { completed, total, completionRate, quarterLabel } = coverage;

    return (
        <Link href="/dashboard/coverage" className="block w-full py-2 group">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Target {quarterLabel}
                </div>
                <div className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                    {completed.length} / {total} Toko ({completionRate}%)
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                </div>
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
