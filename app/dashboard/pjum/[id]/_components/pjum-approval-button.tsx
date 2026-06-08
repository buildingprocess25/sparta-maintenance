"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { approvePjumExport } from "@/app/reports/pjum/approval-actions";

type PjumApprovalButtonProps = {
    pjumExportId: string;
    status: string;
    viewerRole: string;
};

export function PjumApprovalButton({
    pjumExportId,
    status,
    viewerRole,
}: PjumApprovalButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (viewerRole !== "BNM_MANAGER" || status !== "PENDING_APPROVAL") {
        return null;
    }

    function handleApprove() {
        startTransition(async () => {
            const result = await approvePjumExport({ pjumExportId });

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

    return (
        <Button
            type="button"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleApprove}
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
}
