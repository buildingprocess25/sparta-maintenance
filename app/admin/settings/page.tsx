import { requireRole } from "@/lib/authorization";
import { MaintenanceSettingCard } from "./_components/maintenance-setting-card";
import {
    getAppSetting,
    SETTING_KEYS,
    setSettingOverride,
} from "@/lib/app-settings";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Construction } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata = {
    title: "Pengaturan Sistem | Admin SPARTA",
};

export default async function AdminSettingsPage() {
    await requireRole("ADMIN");

    // Fetch dari DB saat halaman load (sekaligus me-restore state jika server baru direstart)
    const dbValue = await getAppSetting(SETTING_KEYS.MAINTENANCE_ENABLED);
    const isMaintenanceEnabled = dbValue === "true";

    // Seed ulang on load memastikan `globalThis` sinkron dengan DB (mengantisipasi hilangnya memory)
    if (dbValue !== null) {
        setSettingOverride(SETTING_KEYS.MAINTENANCE_ENABLED, dbValue);
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Pengaturan Sistem"
                description="Konfigurasi sistem, maintenance, dan fungsi lanjutan."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-3xl space-y-6">
                <MaintenanceSettingCard initialEnabled={isMaintenanceEnabled} />

                {/* <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Construction className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Dalam Pengembangan</CardTitle>
                            <Badge variant="outline" className="ml-auto">
                                Backlog
                            </Badge>
                        </div>
                        <CardDescription>
                            Fitur pengaturan sistem lain akan diimplementasikan pada fase berikutnya.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-sm font-medium flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                Item yang direncanakan:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                                <li>
                                    <span className="font-medium text-foreground">
                                        Checklist Dinamis
                                    </span>{" "}
                                    — Pindahkan item checklist dari{" "}
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                        lib/checklist-data.ts
                                    </code>{" "}
                                    ke database. Admin dapat tambah / edit / hapus
                                    item checklist via UI.
                                </li>
                                <li>
                                    Perlu migration schema Prisma (tabel{" "}
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                        ChecklistTemplate
                                    </code>
                                    ).
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card> */}
            </main>

            <Footer />
        </div>
    );
}
