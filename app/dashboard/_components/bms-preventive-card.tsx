"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronRight } from "lucide-react";
import type { BmsPreventiveCoverageResult } from "../preventive/actions";

export function BmsPreventiveCard({ coverage }: { coverage: BmsPreventiveCoverageResult }) {
    const { completed, total, completionRate, quarterLabel } = coverage;

    return (
        <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        Target Preventif {quarterLabel}
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                        {completed.length} <span className="text-sm font-normal text-muted-foreground">/ {total} Toko</span>
                    </div>
                    <div className="w-full bg-primary/20 rounded-full h-2 mt-2 overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>
                
                <div className="flex flex-col items-center justify-center">
                    <div className="text-xl font-bold text-primary">{completionRate}%</div>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 mt-1 text-xs text-primary hover:bg-primary/10">
                        <Link href="/dashboard/coverage">
                            Lihat Detail
                            <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
