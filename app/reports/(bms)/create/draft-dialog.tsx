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
import { FileText, Trash2, Clock, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DraftDialogProps {
    open: boolean;
    draftStoreName?: string;
    draftUpdatedAt: string;
    isLoading?: boolean;
    isDeleting?: boolean;
    onContinueDraft: () => void;
    onCreateNew: () => void;
}

export function DraftDialog({
    open,
    draftStoreName,
    draftUpdatedAt,
    isLoading = false,
    isDeleting = false,
    onContinueDraft,
    onCreateNew,
}: DraftDialogProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-137.5 gap-6">
                <AlertDialogHeader className="flex flex-col sm:flex-row sm:items-start gap-4 space-y-0">
                    {/* Icon Section */}
                    <div className="mx-auto sm:mx-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>

                    {/* Text Section */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <AlertDialogTitle className="text-xl">
                            Draft Laporan Ditemukan
                        </AlertDialogTitle>

                        <AlertDialogDescription className="text-muted-foreground">
                            Anda memiliki laporan yang belum selesai disimpan.
                            Apakah Anda ingin melanjutkan pengisian?
                        </AlertDialogDescription>

                        {/* Detail Box */}
                        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-normal"
                                    >
                                        Draft
                                    </Badge>
                                </div>

                                {draftStoreName && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="truncate max-w-70">
                                            {draftStoreName}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-muted-foreground text-xs pt-1 border-t mt-1 text-left">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        Disimpan otomatis: {draftUpdatedAt}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </AlertDialogHeader>

                <AlertDialogFooter className="sm:justify-between sm:gap-2">
                    {/* Secondary Action (Left on Desktop) */}
                    <AlertDialogCancel
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isDeleting && !isLoading) onCreateNew();
                        }}
                        disabled={isLoading || isDeleting}
                        className="w-full sm:w-auto mt-2 sm:mt-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menghapus...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus & Buat Baru
                            </>
                        )}
                    </AlertDialogCancel>

                    {/* Primary Action (Right on Desktop) */}
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isDeleting && !isLoading) onContinueDraft();
                        }}
                        disabled={isLoading || isDeleting}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memuat Draft...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Lanjutkan Draft
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
