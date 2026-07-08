import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MaterialEstimationJson } from "@/types/report";

type Props = {
    estimations: MaterialEstimationJson[];
    totalEstimation: number;
    formatCurrency: (n: number) => string;
};

export function EstimationsTabNew({
    estimations,
    totalEstimation,
    formatCurrency,
}: Props) {
    return (
        <div className="space-y-4 pb-6 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <Package className="h-4 w-4 text-[#0069a7]" />
                        Rincian Estimasi Biaya
                    </h3>
                    <Badge
                        variant="outline"
                        className="font-mono text-sm bg-slate-50 text-[#0069a7] border-[#0069a7]/20"
                    >
                        Total: {formatCurrency(totalEstimation)}
                    </Badge>
                </div>
            </div>
            <div>
                {estimations.length === 0 ? (
                    <div className="py-12 text-center">
                        <Package className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">
                            Tidak ada estimasi material.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {estimations.map((est, i) => (
                            <div
                                key={i}
                                className="py-3 flex flex-col gap-1.5"
                            >
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium text-slate-800">
                                        {est.materialName}
                                    </p>
                                    <p className="text-sm font-bold font-mono text-[#0069a7]">
                                        {formatCurrency(est.totalPrice)}
                                    </p>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>
                                        {est.quantity} {est.unit} x{" "}
                                        {formatCurrency(est.price)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
