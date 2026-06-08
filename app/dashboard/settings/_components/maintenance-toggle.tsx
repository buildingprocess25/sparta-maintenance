"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toggleMaintenanceMode } from "../actions";
import { AlertTriangle, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MaintenanceToggle({
    initialEnabled,
}: {
    initialEnabled: boolean;
}) {
    const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();
    const hasChanges = enabled !== savedEnabled;

    const handleSave = () => {
        startTransition(async () => {
            const result = await toggleMaintenanceMode(enabled);
            if (!result.success) {
                toast.error(result.error);
            } else {
                setSavedEnabled(enabled);
                toast.success(
                    enabled
                        ? "Maintenance mode diaktifkan"
                        : "Maintenance mode dimatikan",
                );
            }
        });
    };

    return (
        <section className="mx-auto max-w-5xl overflow-hidden rounded-md border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Settings className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold">
                            Maintenance Mode
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Kontrol akses aplikasi untuk pemeliharaan rutin atau
                            pembaruan database.
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 justify-start md:justify-end">
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isPending || !hasChanges}
                        onClick={handleSave}
                    >
                        <Save data-icon="inline-start" />
                        Simpan Sistem
                    </Button>
                </div>
            </div>

            <div className="divide-y">
                <div className="grid gap-3 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)_140px] md:items-center">
                    <div>
                        <Label
                            htmlFor="maintenance-mode"
                            className="text-xs font-semibold"
                        >
                            Status Aplikasi
                        </Label>
                        <div
                            className={`mt-1 inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold ${enabled ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                        >
                            {enabled ? "AKTIF" : "NONAKTIF"}
                        </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        {enabled
                            ? "Hanya ADMIN yang dapat mengakses sistem. User lain diarahkan ke halaman maintenance."
                            : "Sistem dapat diakses oleh semua role sesuai hak akses masing-masing."}
                    </p>
                    <div className="flex items-center justify-start gap-2 md:justify-end">
                        <span className="text-xs text-muted-foreground">
                            {enabled ? "ON" : "OFF"}
                        </span>
                        <Switch
                            id="maintenance-mode"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            disabled={isPending}
                        />
                    </div>
                </div>

                <div className="grid gap-3 bg-primary/5 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <AlertTriangle className="h-4 w-4" />
                        Dampak ke User
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Saat aktif, BMS, BMC, dan BnM Manager tidak bisa masuk
                        ke aplikasi. Admin tetap dapat mengakses dashboard untuk
                        perbaikan atau pemantauan data.
                    </p>
                </div>
            </div>
        </section>
    );
}
