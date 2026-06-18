"use client";

import { useRouter } from "next/navigation";
import { FilePenLine, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function ReportInterventionAction({
    reportNumber,
}: {
    reportNumber: string;
}) {
    const router = useRouter();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <FilePenLine data-icon="inline-start" />
                    Intervensi
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-amber-50 text-amber-700">
                        <ShieldAlert />
                    </AlertDialogMedia>
                    <AlertDialogTitle>
                        Intervensi laporan final?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Fitur ini hanya untuk koreksi laporan yang sudah
                        selesai. Admin wajib menyiapkan BAP PDF, mengisi alasan
                        intervensi, dan sistem akan membuat PDF revisi sebagai
                        jejak audit.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            router.push(
                                `/dashboard/reports/${encodeURIComponent(
                                    reportNumber,
                                )}/intervensi`,
                            );
                        }}
                    >
                        Lanjutkan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
