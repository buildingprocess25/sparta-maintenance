import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { MaterialEstimationJson } from "@/types/report";

type Props = {
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    formatCurrency: (n: number) => string;
};

export function EstimationsTab({
    estimations,
    totalEstimation,
    formatCurrency,
}: Props) {
    return (
        <Card className="shadow-sm border-border/60">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Rincian Estimasi Biaya BMS
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className="font-mono text-sm bg-background"
                    >
                        Total: {formatCurrency(totalEstimation)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {estimations.length === 0 ? (
                    <div className="py-12 text-center">
                        <Package className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-muted-foreground">
                            Tidak ada estimasi material.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent text-xs uppercase bg-muted/30">
                                        <TableHead className="h-9">
                                            Nama Material
                                        </TableHead>
                                        <TableHead className="text-right h-9 w-24">
                                            Qty
                                        </TableHead>
                                        <TableHead className="text-right h-9 w-36">
                                            Harga Satuan
                                        </TableHead>
                                        <TableHead className="text-right h-9 w-40">
                                            Subtotal
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {estimations.map((est, i) => (
                                        <TableRow
                                            key={i}
                                            className="hover:bg-muted/10"
                                        >
                                            <TableCell className="text-sm font-medium py-3">
                                                {est.materialName}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground py-3">
                                                {est.quantity} {est.unit}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-mono text-muted-foreground py-3">
                                                {formatCurrency(est.price)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-mono font-medium py-3">
                                                {formatCurrency(est.totalPrice)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-2 border-dashed">
                                        <TableCell
                                            colSpan={3}
                                            className="text-right font-semibold text-sm"
                                        >
                                            Total Estimasi
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono text-base text-primary">
                                            {formatCurrency(totalEstimation)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile list */}
                        <div className="md:hidden divide-y">
                            {estimations.map((est, i) => (
                                <div
                                    key={i}
                                    className="p-4 flex flex-col gap-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium">
                                            {est.materialName}
                                        </p>
                                        <p className="text-sm font-bold font-mono text-primary">
                                            {formatCurrency(est.totalPrice)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>
                                            {est.quantity} {est.unit} x{" "}
                                            {formatCurrency(est.price)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
