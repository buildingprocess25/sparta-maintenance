import { requireAuth } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { getBmsPreventiveCoverage } from "../preventive/actions";
import { BmsMobilePage } from "@/components/bms-mobile/bms-mobile-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import { formatJakartaDate } from "@/lib/time";
import { CoverageClient } from "./components/coverage-client";

export const dynamic = "force-dynamic";

export default async function BmsCoveragePage() {
    const user = await requireAuth();
    if (user.role !== "BMS") {
        redirect("/dashboard");
    }

    const coverage = await getBmsPreventiveCoverage(user);

    return (
        <BmsMobilePage
            navItem="coverage"
            userInitials={user.name
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0]?.toUpperCase() ?? "")
                .join("")}
        >
            <div className="space-y-4">
                <div>
                    <h1 className="font-heading text-xl font-bold tracking-tight">Coverage Preventif</h1>
                    <p className="text-sm text-muted-foreground">Target {coverage.quarterLabel}: {coverage.completionRate}% Selesai</p>
                </div>

                <CoverageClient coverage={coverage} />
            </div>
        </BmsMobilePage>
    );
}
