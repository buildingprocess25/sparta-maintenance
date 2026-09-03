"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { approvePjumExport } from "@/app/reports/pjum/approval-actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PjumApprovalButtonProps = {
    pjumExportId: string;
    status: string;
    viewerRole: string;
    expiringHangingCount: number;
    expiringHangingTotal: number;
    expiringHangingReportNumbers: string[];
};

export function PjumApprovalButton({
    pjumExportId,
    status,
    viewerRole,
    expiringHangingCount,
    expiringHangingTotal,
    expiringHangingReportNumbers,
}: PjumApprovalButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (viewerRole !== "BNM_MANAGER" || status !== "PENDING_APPROVAL") {
        return null;
    }

    function handleApprove(confirmHangingExpiry: boolean) {
        startTransition(async () => {
            const result = await approvePjumExport({
                pjumExportId,
                confirmHangingExpiry,
            });

            if (result.error) {
                toast.error("Gagal menyetujui PJUM", {
                    description: result.error,
                });
                return;
            }

            toast.success("PJUM disetujui");
            router.refresh();
        });
    }

    const approvalButton = (
        <Button
            type="button"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={
                expiringHangingCount === 0
                    ? () => handleApprove(false)
                    : undefined
            }
            disabled={isPending}
        >
            {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isPending ? "Menyetujui..." : "Setujui PJUM"}
        </Button>
    );

    if (expiringHangingCount === 0) {
        return approvalButton;
    }

    const formattedTotal = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(expiringHangingTotal);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{approvalButton}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Laporan menggantung akan kedaluwarsa
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        PJUM ini tidak menyertakan {expiringHangingCount} laporan
                        menggantung senilai {formattedTotal}. Jika disetujui,
                        laporan tersebut tidak dapat dimasukkan ke PJUM lagi dan
                        tidak akan membebani saldo periode berikutnya.
                        {expiringHangingReportNumbers.length > 0
                            ? ` Laporan: ${expiringHangingReportNumbers.join(", ")}.`
                            : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        Periksa Kembali
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isPending}
                        onClick={() => handleApprove(true)}
                    >
                        {isPending ? "Menyetujui..." : "Pahami dan Setujui"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
