"use client";

import {
    useMemo,
    useState,
    useTransition,
    type ElementType,
    type ReactNode,
} from "react";
import {
    AlertTriangle,
    ReceiptText,
    Save,
    SlidersHorizontal,
    Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    getReportStatusLabel,
    type ReportStatusKey,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";
import { updateOperationalSettings } from "../actions";
import { MaintenanceToggle } from "./maintenance-toggle";

const REPORT_SLA_FORM_FIELDS = [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const satisfies readonly ReportStatusKey[];

type PjumPolicyForm = {
    pendingStaleDays: string;
    weeklyAdvanceAmount: string;
    periodDays: string;
};

type SettingsWorkbenchProps = {
    initialMaintenanceEnabled: boolean;
    isEnvOverridden: boolean;
    initialReportSlaDays: Partial<Record<ReportStatusKey, number>>;
    initialPjumPolicy: {
        pendingStaleDays: number;
        weeklyAdvanceAmount: number;
        periodDays: number;
        bmsInitialBalance: number;
    };
};

function formatRp(value: string) {
    const amount = Number.parseInt(value || "0", 10);
    if (!Number.isFinite(amount) || amount <= 0) return "Rp 0";
    return `Rp ${amount.toLocaleString("id-ID")}`;
}

function toNumberRecord(values: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
            key,
            Number.parseInt(value, 10),
        ]),
    ) as Record<string, number>;
}

export function SettingsWorkbench({
    initialMaintenanceEnabled,
    isEnvOverridden,
    initialReportSlaDays,
    initialPjumPolicy,
}: SettingsWorkbenchProps) {
    const [isPending, startTransition] = useTransition();
    const [reportSlaDays, setReportSlaDays] = useState<Record<string, string>>(
        () =>
            Object.fromEntries(
                REPORT_SLA_FORM_FIELDS.map((status) => [
                    status,
                    String(initialReportSlaDays[status] ?? 1),
                ]),
            ),
    );
    const [pjumPolicy, setPjumPolicy] = useState<PjumPolicyForm>(() => ({
        pendingStaleDays: String(initialPjumPolicy.pendingStaleDays),
        weeklyAdvanceAmount: String(initialPjumPolicy.weeklyAdvanceAmount),
        periodDays: String(initialPjumPolicy.periodDays),
    }));

    const reportSlaRows = useMemo(
        () =>
            REPORT_SLA_FORM_FIELDS.map((status) => ({
                status,
                label: getReportStatusLabel(status),
                helper: getSlaHelper(status),
            })),
        [],
    );

    const handleSaveOperationalSettings = () => {
        startTransition(async () => {
            const result = await updateOperationalSettings({
                reportSlaDays: toNumberRecord(reportSlaDays),
                pjumPendingStaleDays: Number.parseInt(
                    pjumPolicy.pendingStaleDays,
                    10,
                ),
                pjumWeeklyAdvanceAmount: Number.parseInt(
                    pjumPolicy.weeklyAdvanceAmount,
                    10,
                ),
                pjumPeriodDays: Number.parseInt(pjumPolicy.periodDays, 10),
            });

            if (result.success) {
                toast.success("Pengaturan operasional berhasil disimpan");
                return;
            }

            toast.error(result.error);
        });
    };

    return (
        <Tabs defaultValue="system" className="gap-4">
            <TabsList
                variant="line"
                className="h-9 w-full justify-start overflow-x-auto overflow-y-hidden rounded-none border-b p-0"
            >
                <TabsTrigger
                    value="system"
                    className="h-9 flex-none px-3 text-xs"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Sistem
                </TabsTrigger>
                <TabsTrigger
                    value="workflow"
                    className="h-9 flex-none px-3 text-xs"
                >
                    <Workflow className="h-3.5 w-3.5" />
                    Workflow SLA
                </TabsTrigger>
                <TabsTrigger
                    value="pjum"
                    className="h-9 flex-none px-3 text-xs"
                >
                    <ReceiptText className="h-3.5 w-3.5" />
                    PJUM
                </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="mt-10">
                <div className="space-y-4">
                    {isEnvOverridden ? (
                        <div className="mx-auto flex max-w-5xl items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="font-semibold">
                                    Maintenance mode dipaksa aktif oleh server
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                                    Nilai dari panel tetap tersimpan, tetapi
                                    tidak berpengaruh sampai environment
                                    variable
                                    <code className="mx-1 rounded bg-amber-100 px-1">
                                        MAINTENANCE_MODE
                                    </code>
                                    dimatikan.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    <MaintenanceToggle
                        initialEnabled={initialMaintenanceEnabled}
                    />
                </div>
            </TabsContent>

            <TabsContent value="workflow" className="mt-10">
                <SettingsSection
                    icon={Workflow}
                    title="Batas SLA per Status Laporan"
                    description="Dipakai oleh dashboard utama, filter Lewat SLA, dan badge SLA di tabel laporan."
                    action={
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={isPending}
                            onClick={handleSaveOperationalSettings}
                        >
                            <Save data-icon="inline-start" />
                            Simpan Workflow
                        </Button>
                    }
                >
                    <div className="divide-y">
                        {reportSlaRows.map((row) => (
                            <SettingsRow
                                key={row.status}
                                label={
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {row.label}
                                    </Badge>
                                }
                                helper={row.helper}
                                control={
                                    <NumberControl
                                        value={reportSlaDays[row.status] ?? ""}
                                        suffix="hari"
                                        onChange={(value) =>
                                            setReportSlaDays((current) => ({
                                                ...current,
                                                [row.status]: value,
                                            }))
                                        }
                                    />
                                }
                            />
                        ))}
                    </div>
                </SettingsSection>
            </TabsContent>

            <TabsContent value="pjum" className="mt-10">
                <SettingsSection
                    icon={ReceiptText}
                    title="Aturan PJUM Mingguan"
                    description="Membantu admin membaca dokumen PJUM yang perlu dicek dan menjelaskan nominal uang muka BMS."
                    action={
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={isPending}
                            onClick={handleSaveOperationalSettings}
                        >
                            <Save data-icon="inline-start" />
                            Simpan PJUM
                        </Button>
                    }
                >
                    <div className="divide-y">
                        <SettingsRow
                            label="Pending terlalu lama"
                            helper="PJUM pending melewati batas ini akan ditandai perlu dicek."
                            control={
                                <NumberControl
                                    value={pjumPolicy.pendingStaleDays}
                                    suffix="hari"
                                    onChange={(value) =>
                                        setPjumPolicy((current) => ({
                                            ...current,
                                            pendingStaleDays: value,
                                        }))
                                    }
                                />
                            }
                        />
                        <SettingsRow
                            label="Uang muka mingguan"
                            helper={`Preview: ${formatRp(
                                pjumPolicy.weeklyAdvanceAmount,
                            )}`}
                            control={
                                <NumberControl
                                    value={pjumPolicy.weeklyAdvanceAmount}
                                    suffix="rupiah"
                                    wide
                                    onChange={(value) =>
                                        setPjumPolicy((current) => ({
                                            ...current,
                                            weeklyAdvanceAmount: value,
                                        }))
                                    }
                                />
                            }
                        />

                        <SettingsRow
                            label="Periode PJUM"
                            helper="Default periode kerja yang dibaca sebagai satu siklus PJUM."
                            control={
                                <NumberControl
                                    value={pjumPolicy.periodDays}
                                    suffix="hari"
                                    onChange={(value) =>
                                        setPjumPolicy((current) => ({
                                            ...current,
                                            periodDays: value,
                                        }))
                                    }
                                />
                            }
                        />
                    </div>
                </SettingsSection>
            </TabsContent>
        </Tabs>
    );
}

function SettingsSection({
    icon: Icon,
    title,
    description,
    action,
    children,
}: {
    icon: ElementType;
    title: string;
    description: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="mx-auto max-w-5xl overflow-hidden rounded-md border bg-background">
            <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold">{title}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>
                {action ? (
                    <div className="flex shrink-0 justify-start md:justify-end">
                        {action}
                    </div>
                ) : null}
            </div>
            {children}
        </section>
    );
}

function SettingsRow({
    label,
    helper,
    control,
}: {
    label: ReactNode;
    helper: string;
    control: ReactNode;
}) {
    return (
        <div className="grid gap-3 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)_170px] md:items-center">
            <div className="flex items-center text-xs font-semibold">
                {label}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
                {helper}
            </p>
            <div className="flex md:justify-end">{control}</div>
        </div>
    );
}

function NumberControl({
    value,
    suffix,
    onChange,
    wide = false,
}: {
    value: string;
    suffix: string;
    onChange: (value: string) => void;
    wide?: boolean;
}) {
    return (
        <div className="flex w-full items-center gap-2 md:w-auto">
            <Input
                type="number"
                min={1}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={cn("h-8 text-xs", wide ? "md:w-28" : "md:w-20")}
            />
            <span className="w-14 text-xs text-muted-foreground">{suffix}</span>
        </div>
    );
}

function getSlaHelper(status: ReportStatusKey) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return "Batas waktu BMC meninjau estimasi awal setelah laporan dibuat.";
        case "PENDING_CHECKLIST_REVIEW":
            return "Batas waktu BMC meninjau checklist laporan.";
        case "ESTIMATION_APPROVED":
            return "Batas waktu BMS mulai mengerjakan laporan setelah estimasi disetujui.";
        case "ESTIMATION_REJECTED_REVISION":
            return "Batas waktu BMS memperbaiki estimasi yang diminta revisi.";
        case "IN_PROGRESS":
            return "Batas utama pekerjaan BMS. Cocok mengikuti siklus uang muka mingguan.";
        case "PENDING_REVIEW":
            return "Batas waktu BMC meninjau hasil pekerjaan BMS.";
        case "APPROVED_BMC":
            return "Batas waktu BNM melakukan approval final.";
        case "REVIEW_REJECTED_REVISION":
            return "Batas waktu BMS memperbaiki pekerjaan yang diminta revisi.";
        default:
            return "Batas maksimal laporan berada pada status ini.";
    }
}
