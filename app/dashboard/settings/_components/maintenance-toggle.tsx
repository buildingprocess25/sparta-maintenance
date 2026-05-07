"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toggleMaintenanceMode } from "../actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { IconAlertTriangle, IconSettings } from "@tabler/icons-react";

export function MaintenanceToggle({
    initialEnabled,
}: {
    initialEnabled: boolean;
}) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        startTransition(async () => {
            const result = await toggleMaintenanceMode(checked);
            if (!result.success) {
                setEnabled(!checked); // revert
                toast.error(result.error);
            } else {
                toast.success(
                    checked
                        ? "Maintenance mode diaktifkan"
                        : "Maintenance mode dimatikan",
                );
            }
        });
    };

    return (
        <div className="grid gap-6 max-w-4xl">
            <Card className="border shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <IconSettings className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            Maintenance Mode
                        </span>
                    </div>
                    <CardDescription>
                        Kontrol akses aplikasi untuk pemeliharaan rutin atau
                        pembaruan database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                            <Label
                                htmlFor="maintenance-mode"
                                className="text-base font-medium"
                            >
                                Status Aplikasi
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {enabled
                                    ? "Mode Maintenance AKTIF. Hanya admin yang dapat mengakses sistem."
                                    : "Mode Maintenance NONAKTIF. Sistem dapat diakses oleh semua user."}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-center">
                            <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded border ${enabled ? "bg-amber-500/10 border-amber-500/50 text-amber-600" : "bg-muted border-border text-muted-foreground"}`}
                            >
                                {enabled ? "ON" : "OFF"}
                            </span>
                            <Switch
                                id="maintenance-mode"
                                checked={enabled}
                                onCheckedChange={handleToggle}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/10 bg-primary/5">
                        <IconAlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground leading-relaxed">
                            <p className="font-semibold text-primary/80 mb-0.5">
                                Informasi Penting:
                            </p>
                            Saat mode ini aktif, semua pengguna (BMS, BMC, BnM
                            Manager) akan dialihkan ke halaman maintenance.
                            Admin tetap dapat mengakses dashboard untuk
                            melakukan perbaikan atau pemantauan data.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
