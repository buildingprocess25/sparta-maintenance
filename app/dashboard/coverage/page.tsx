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

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">
                            Belum ({coverage.pending.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            Sudah ({coverage.completed.length})
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pending" className="space-y-3 mt-4">
                        {coverage.pending.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Luar biasa! Semua toko sudah dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.pending.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shrink-0">
                                            Belum Preventif
                                        </Badge>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="w-full mt-1 border-primary/50 text-primary hover:bg-primary/5">
                                        <Link href={`/reports/create?storeCode=${store.storeCode}`}>
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Buat Laporan Preventif
                                        </Link>
                                    </Button>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-3 mt-4">
                        {coverage.completed.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Belum ada toko yang selesai dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.completed.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0">
                                            Sudah Preventif
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex flex-col mt-1">
                                        <span>No: {store.reportNumber}</span>
                                        <span>Selesai: {store.doneAt ? formatJakartaDate(store.doneAt) : '-'}</span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </BmsMobilePage>
    );
}
