"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus } from "lucide-react";

interface DraftDialogProps {
    open: boolean;
    draftTicketNumber: string;
    draftStoreName?: string;
    draftUpdatedAt: string;
    onContinueDraft: () => void;
    onCreateNew: () => void;
}

export function DraftDialog({
    open,
    draftTicketNumber,
    draftStoreName,
    draftUpdatedAt,
    onContinueDraft,
    onCreateNew,
}: DraftDialogProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-center">
                        Draft Laporan Ditemukan
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center space-y-2">
                        <span className="block">
                            Anda memiliki draft laporan yang belum dikirim.
                        </span>
                        <span className="block text-sm font-medium text-foreground">
                            {draftTicketNumber}
                            {draftStoreName && ` — ${draftStoreName}`}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                            Terakhir disimpan: {draftUpdatedAt}
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                    <AlertDialogAction
                        onClick={onContinueDraft}
                        className="w-full"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Lanjutkan Draft
                    </AlertDialogAction>
                    <AlertDialogCancel
                        onClick={onCreateNew}
                        className="w-full mt-0"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Baru (Hapus Draft)
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
