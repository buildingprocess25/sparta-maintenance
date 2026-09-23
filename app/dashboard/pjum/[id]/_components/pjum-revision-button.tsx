"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rejectPjumExport } from "@/app/reports/pjum/approval-actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageSquareX } from "lucide-react";

export function PjumRevisionButton({
    pjumExportId,
}: {
    pjumExportId: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!notes.trim()) {
            toast.error("Alasan revisi wajib diisi");
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await rejectPjumExport({
                pjumExportId,
                notes,
            });

            if (error) {
                toast.error(error);
                return;
            }

            toast.success("PJUM dikembalikan untuk direvisi");
            setIsOpen(false);
            router.refresh();
        } catch (error) {
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-orange-700 border-orange-200 hover:bg-orange-50 hover:text-orange-800">
                    <MessageSquareX className="h-3.5 w-3.5" />
                    Minta Revisi
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Minta Revisi PJUM</DialogTitle>
                    <DialogDescription>
                        PJUM ini akan dikembalikan ke BMC untuk diperbaiki. BMS juga akan diizinkan kembali membuat laporan sementara waktu.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3 py-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Alasan Revisi <span className="text-destructive">*</span></label>
                        <Textarea
                            placeholder="Tuliskan catatan detail mengenai apa yang harus diperbaiki..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="resize-none text-sm"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isSubmitting}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="default"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !notes.trim()}
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Kirim Permintaan Revisi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
