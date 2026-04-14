"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Props = {
    /** The descriptive label shown in confirmation, e.g. "user JOHN" */
    itemLabel: string;
    /** Async action that performs the actual delete */
    onDelete: () => Promise<{
        success?: boolean;
        error?: string;
        detail?: string;
    }>;
    trigger?: React.ReactNode;
};

export function DeleteDialog({ itemLabel, onDelete, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        setOpen(false);
        startTransition(async () => {
            const result = await onDelete();

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success(`${itemLabel} berhasil dihapus`);
        });
    }

    return (
        <>
            <LoadingOverlay isOpen={isPending} message="Menghapus..." />

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    {trigger ?? (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Konfirmasi Hapus
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus{" "}
                            <span className="font-medium text-foreground">
                                {itemLabel}
                            </span>
                            ? Tindakan ini tidak bisa dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
