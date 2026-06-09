"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    CheckCircle2,
    type LucideIcon,
    RotateCcw,
    XCircle,
} from "lucide-react";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveFinal } from "@/app/reports/actions/approve-final";
import { reviewCompletion } from "@/app/reports/actions/review-completion";
import { reviewEstimation } from "@/app/reports/actions/approve-estimation";
import { useReportApprovalReviewGate } from "./report-approval-review-gate";

type ApprovalDecision = "approve" | "reject_revision" | "reject";
type ApprovalType = "estimation" | "completion" | "final";

type ApprovalAction = {
    decision: ApprovalDecision;
    label: string;
    dialogTitle: string;
    dialogDescription: string;
    notesLabel?: string;
    notesPlaceholder?: string;
    requiresNotes: boolean;
    variant: "default" | "outline" | "destructive";
    icon: LucideIcon;
};

type ApprovalConfig = {
    type: ApprovalType;
    actions: ApprovalAction[];
    successLabels: Record<string, string>;
};

type ReportApprovalActionsProps = {
    reportNumber: string;
    status: string;
    viewerRole: string;
};

export function ReportApprovalActions({
    reportNumber,
    status,
    viewerRole,
}: ReportApprovalActionsProps) {
    const router = useRouter();
    const [selectedAction, setSelectedAction] =
        useState<ApprovalAction | null>(null);
    const [notes, setNotes] = useState("");
    const [isPending, startTransition] = useTransition();
    const config = getApprovalConfig(viewerRole, status);
    const reviewGate = useReportApprovalReviewGate();

    if (!config) return null;
    const approvalConfig = config;

    function closeDialog(open: boolean) {
        if (open) return;
        if (isPending) return;
        setSelectedAction(null);
        setNotes("");
    }

    function handleConfirm() {
        if (!selectedAction) return;

        if (selectedAction.requiresNotes && !notes.trim()) {
            toast.warning("Catatan wajib diisi", {
                description: "Isi alasan sebelum melanjutkan keputusan ini.",
            });
            return;
        }

        startTransition(async () => {
            const result = await runApprovalAction(
                reportNumber,
                approvalConfig.type,
                selectedAction.decision,
                notes.trim() || undefined,
            );

            if (result.error) {
                toast.error("Gagal memproses approval", {
                    description: result.error,
                });
                return;
            }

            toast.success(
                approvalConfig.successLabels[selectedAction.decision] ??
                    "Berhasil",
            );
            setSelectedAction(null);
            setNotes("");
            router.refresh();
        });
    }

    const DialogIcon = selectedAction?.icon ?? CheckCircle2;
    const ConfirmIcon = selectedAction?.icon;

    return (
        <>
            <div
                data-tour="approval-decision-actions"
                className="flex flex-wrap items-center justify-end gap-2"
            >
                {approvalConfig.actions.map((action) => {
                    const Icon = action.icon;
                    const isApprovalBlocked =
                        action.decision === "approve" &&
                        reviewGate.enabled &&
                        !reviewGate.isReviewComplete;

                    return (
                        <Button
                            key={action.decision}
                            type="button"
                            size="sm"
                            variant={action.variant}
                            disabled={isApprovalBlocked}
                            title={
                                isApprovalBlocked
                                    ? reviewGate.missingReviewText
                                    : undefined
                            }
                            onClick={() => setSelectedAction(action)}
                        >
                            <Icon data-icon="inline-start" />
                            {action.label}
                        </Button>
                    );
                })}
            </div>

            <AlertDialog
                open={Boolean(selectedAction)}
                onOpenChange={closeDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <DialogIcon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                            {selectedAction?.dialogTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedAction?.dialogDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {selectedAction?.requiresNotes ? (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {selectedAction.notesLabel ?? "Catatan"}
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                placeholder={
                                    selectedAction.notesPlaceholder ??
                                    "Tulis catatan keputusan"
                                }
                                disabled={isPending}
                                className="min-h-24 text-sm"
                            />
                        </div>
                    ) : null}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                            Batal
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant={selectedAction?.variant ?? "default"}
                            disabled={isPending}
                            onClick={handleConfirm}
                        >
                            {ConfirmIcon ? (
                                <ConfirmIcon data-icon="inline-start" />
                            ) : null}
                            {isPending ? "Memproses..." : "Konfirmasi"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function getApprovalConfig(
    viewerRole: string,
    status: string,
): ApprovalConfig | null {
    if (viewerRole === "BMC" && status === "PENDING_ESTIMATION") {
        return {
            type: "estimation",
            successLabels: {
                approve: "Estimasi disetujui",
                reject_revision: "Estimasi dikembalikan untuk revisi",
                reject: "Estimasi ditolak",
            },
            actions: [
                {
                    decision: "reject",
                    label: "Tolak",
                    dialogTitle: "Tolak estimasi laporan?",
                    dialogDescription:
                        "Laporan akan ditutup pada tahap estimasi dan tidak dilanjutkan ke pekerjaan.",
                    notesLabel: "Alasan penolakan",
                    notesPlaceholder:
                        "Contoh: estimasi tidak sesuai kebutuhan atau data tidak valid.",
                    requiresNotes: true,
                    variant: "destructive",
                    icon: XCircle,
                },
                {
                    decision: "reject_revision",
                    label: "Minta revisi",
                    dialogTitle: "Kembalikan estimasi untuk revisi?",
                    dialogDescription:
                        "BMS harus memperbaiki estimasi sebelum laporan dapat diproses lagi.",
                    notesLabel: "Catatan revisi",
                    notesPlaceholder:
                        "Tulis bagian estimasi yang perlu diperbaiki.",
                    requiresNotes: true,
                    variant: "outline",
                    icon: RotateCcw,
                },
                {
                    decision: "approve",
                    label: "Setujui estimasi",
                    dialogTitle: "Setujui estimasi laporan?",
                    dialogDescription:
                        "BMS dapat melanjutkan proses pekerjaan setelah estimasi disetujui.",
                    requiresNotes: false,
                    variant: "default",
                    icon: CheckCircle2,
                },
            ],
        };
    }

    if (viewerRole === "BMC" && status === "PENDING_REVIEW") {
        return {
            type: "completion",
            successLabels: {
                approve: "Pekerjaan disetujui BMC",
                reject_revision: "Pekerjaan dikembalikan untuk revisi",
            },
            actions: [
                {
                    decision: "reject_revision",
                    label: "Minta revisi",
                    dialogTitle: "Kembalikan pekerjaan untuk revisi?",
                    dialogDescription:
                        "BMS harus memperbaiki hasil pekerjaan atau realisasi sebelum dikirim ulang.",
                    notesLabel: "Catatan revisi",
                    notesPlaceholder:
                        "Tulis item pekerjaan/realisasi yang perlu diperbaiki.",
                    requiresNotes: true,
                    variant: "outline",
                    icon: RotateCcw,
                },
                {
                    decision: "approve",
                    label: "Setujui pekerjaan",
                    dialogTitle: "Setujui pekerjaan laporan?",
                    dialogDescription:
                        "Laporan akan diteruskan ke BNM untuk final approval.",
                    requiresNotes: false,
                    variant: "default",
                    icon: CheckCircle2,
                },
            ],
        };
    }

    if (viewerRole === "BNM_MANAGER" && status === "APPROVED_BMC") {
        return {
            type: "final",
            successLabels: {
                approve: "Laporan disetujui final BNM",
                reject_revision: "Laporan dikembalikan untuk revisi",
            },
            actions: [
                {
                    decision: "reject_revision",
                    label: "Minta revisi",
                    dialogTitle: "Kembalikan laporan untuk revisi?",
                    dialogDescription:
                        "Laporan akan kembali ke status revisi pekerjaan dan belum dianggap selesai.",
                    notesLabel: "Catatan revisi",
                    notesPlaceholder:
                        "Tulis alasan laporan belum dapat disetujui final.",
                    requiresNotes: true,
                    variant: "outline",
                    icon: RotateCcw,
                },
                {
                    decision: "approve",
                    label: "Setujui final",
                    dialogTitle: "Setujui final laporan?",
                    dialogDescription:
                        "Laporan akan berstatus selesai dan waktu selesai final BNM akan dicatat.",
                    requiresNotes: false,
                    variant: "default",
                    icon: CheckCircle2,
                },
            ],
        };
    }

    return null;
}

async function runApprovalAction(
    reportNumber: string,
    type: ApprovalType,
    decision: ApprovalDecision,
    notes?: string,
) {
    if (type === "estimation") {
        return reviewEstimation(reportNumber, decision, notes);
    }

    if (type === "completion") {
        if (decision === "reject") {
            return { error: "Keputusan tidak valid untuk review pekerjaan" };
        }
        return reviewCompletion(reportNumber, decision, notes);
    }

    if (decision === "reject") {
        return { error: "Keputusan tidak valid untuk final approval" };
    }
    return approveFinal(reportNumber, decision, notes);
}
