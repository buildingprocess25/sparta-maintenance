"use client";

import { useState, useTransition } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { updateMaintenanceSetting } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function MaintenanceSettingCard({
    initialEnabled,
}: {
    initialEnabled: boolean;
}) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateMaintenanceSetting(enabled);
            if (result.success) {
                toast.success("Pengaturan maintenance berhasil disimpan");
                router.refresh();
            } else {
                toast.error(result.error);
                setEnabled(initialEnabled); // restore back if failed
            }
        });
    };

    return (
        <Card className={enabled ? "border-destructive/20 border-2" : ""}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert
                            className={
                                enabled
                                    ? "h-5 w-5 text-destructive"
                                    : "h-5 w-5 text-muted-foreground"
                            }
                        />
                        <CardTitle className="text-lg">
                            Maintenance Mode
                        </CardTitle>
                    </div>
                    <Badge variant={enabled ? "destructive" : "secondary"}>
                        {enabled ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                </div>
                <CardDescription>
                    Mengaktifkan mode ini akan memblokir akses ke semua halaman
                    aplikasi.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4 space-x-4">
                    <div className="space-y-0.5">
                        <Label
                            className="text-base cursor-pointer"
                            htmlFor="maintenance-mode"
                        >
                            Aktifkan Maintenance
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Aplikasi tidak bisa diakses sementara waktu oleh
                            seluruh pengguna (kecuali Admin Head Office).
                        </p>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={enabled}
                        onCheckedChange={setEnabled}
                        disabled={isPending}
                        aria-label="Toggle maintenance mode"
                    />
                </div>

                {enabled && (
                    <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>
                            <strong>Info:</strong> Fitur maintenance sedang
                            menyala. Semua akses user biasa akan diblokir, namun{" "}
                            <strong>
                                Anda (Admin) tetap bisa menjelajahi aplikasi
                            </strong>{" "}
                            secara normal.
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-muted/50 border-t p-4 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isPending || enabled === initialEnabled}
                    variant={
                        enabled && enabled !== initialEnabled
                            ? "destructive"
                            : "default"
                    }
                >
                    {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
            </CardFooter>
        </Card>
    );
}
