"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    FileText,
    Clock,
    ArrowRight,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import {
    getPendingPjumExports,
    type PjumExportListItem,
} from "../actions";

export function PjumApprovalList() {
    const [items, setItems] = useState<PjumExportListItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await getPendingPjumExports();
            if (result.error) {
                setError(result.error);
            } else {
                setItems(result.data ?? []);
            }
        });
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Approval PJUM"
                description={`Tinjau dan setujui PJUM yang dibuat BMC`}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-2 py-4">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive">{error}</span>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && items.length === 0 && (
                    <Empty>
                        <EmptyMedia>
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>
                                Tidak ada PJUM menunggu approval
                            </EmptyTitle>
                            <EmptyDescription>
                                PJUM yang dibuat BMC akan muncul di sini.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                {!isLoading && items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                Menunggu Approval ({items.length})
                            </CardTitle>
                            <CardDescription>
                                Klik detail untuk meninjau dan menyetujui PJUM
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>BMS</TableHead>
                                        <TableHead>Cabang</TableHead>
                                        <TableHead>Minggu ke</TableHead>
                                        <TableHead>Periode</TableHead>
                                        <TableHead>Jml Laporan</TableHead>
                                        <TableHead>Dibuat</TableHead>
                                        <TableHead className="text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.bmsName}
                                            </TableCell>
                                            <TableCell>
                                                {item.branchName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    Minggu {item.weekNumber}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(
                                                    new Date(item.fromDate),
                                                    "d MMM",
                                                    { locale: localeId },
                                                )}{" "}
                                                –{" "}
                                                {format(
                                                    new Date(item.toDate),
                                                    "d MMM yyyy",
                                                    { locale: localeId },
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.reportCount} laporan
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(
                                                    new Date(item.createdAt),
                                                    "d MMM yyyy",
                                                    { locale: localeId },
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/reports/pjum/approval/${item.id}`}
                                                    >
                                                        Detail
                                                        <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}
