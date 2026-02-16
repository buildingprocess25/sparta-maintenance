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
import { FileText, Trash2, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
                                    <span className="font-semibold text-foreground flex items-center gap-2">
                                        {draftTicketNumber}
                                    </span>
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
                        onClick={onCreateNew}
                        className="w-full sm:w-auto mt-2 sm:mt-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus & Buat Baru
                    </AlertDialogCancel>

                    {/* Primary Action (Right on Desktop) */}
                    <AlertDialogAction
                        onClick={onContinueDraft}
                        className="w-full sm:w-auto"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Lanjutkan Draft
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
