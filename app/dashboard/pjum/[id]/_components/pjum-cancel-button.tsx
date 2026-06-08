"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelAdminPjum } from "../../actions";

type PjumCancelButtonProps = {
    pjumExportId: string;
    reportCount: number;
};

export function PjumCancelButton({
    pjumExportId,
    reportCount,
}: PjumCancelButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleCancel() {
        startTransition(async () => {
            const result = await cancelAdminPjum(pjumExportId);

            if (result?.error) {
                toast.error(result.error);
                return;
            }

            toast.success("PJUM berhasil dicabut");
            router.push("/dashboard/pjum");
            router.refresh();
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Cabut PJUM
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <AlertTriangle />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Cabut PJUM ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                        PJUM akan dihapus, {reportCount} laporan akan kembali
                        menjadi belum PJUM, dan link PDF final laporan dari PJUM
                        ini akan dibersihkan. Aksi ini tidak menghapus laporan
                        maintenance.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={isPending}
                        onClick={handleCancel}
                    >
                        {isPending ? "Mencabut..." : "Cabut PJUM"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
