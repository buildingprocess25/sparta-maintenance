import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { checklistCategories } from "@/lib/checklist-data";
import { normalizePhotoUrl, resolvePhotoUrl } from "@/lib/storage/photo-url";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

type Props = {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    formatCurrency: (n: number) => string;
    onPhotoClick: (src: string) => void;
};

function getItemBadge(
    condition: string | null | undefined,
    preventive: string | null | undefined,
    isPreventiveCategory: boolean,
) {
    if (preventive === "OK" || (isPreventiveCategory && condition === "BAIK"))
        return (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none shrink-0">
                OK
            </Badge>
        );
    if (preventive === "NOT_OK" || (isPreventiveCategory && condition === "RUSAK"))
        return (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none shrink-0">
                NOT OK
            </Badge>
        );
    if (preventive === "TIDAK_ADA" || condition === "TIDAK_ADA")
        return (
            <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-600 border-none shrink-0"
            >
                Tidak Ada
            </Badge>
        );
    if (condition === "BAIK")
        return (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none shrink-0">
                Baik
            </Badge>
        );
    if (condition === "RUSAK")
        return (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none shrink-0">
                Rusak
            </Badge>
        );
    return (
        <Badge variant="outline" className="text-slate-400 border-slate-200 shrink-0">
            -
        </Badge>
    );
}

export function ChecklistTabNew({
    items,
    estimations,
    formatCurrency,
    onPhotoClick,
}: Props) {
    if (checklistCategories.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-100">
                Tidak ada data checklist.
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            {checklistCategories.map((category) => {
                const categoryItems = items.filter((i) =>
                    i.itemId.startsWith(category.id),
                );
                
                const totalItems = category.isPreventive
                    ? category.items.filter((ci) =>
                          categoryItems.some(
                              (ri) =>
                                  ri.itemId === ci.id &&
                                  (ri.condition || ri.preventiveCondition),
                          ),
                      ).length
                    : category.items.length;
                    
                const filledItems = categoryItems.filter(
                    (i) => i.condition || i.preventiveCondition,
                ).length;

                const damagedItems = categoryItems.filter(
                    (i) =>
                        i.condition === "RUSAK" ||
                        i.preventiveCondition === "NOT_OK",
                );
                const damagedCount = damagedItems.length;
                const isAllOk = damagedCount === 0;

                if (category.isPreventive && totalItems === 0) return null;

                return (
                    <Collapsible
                        key={category.id}
                        defaultOpen={false}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
                    >
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full justify-between p-4 h-auto rounded-none hover:bg-slate-50"
                            >
                                <div className="flex items-center flex-wrap gap-2 text-left w-full pr-2">
                                    {isAllOk ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                    )}
                                    <span className="font-semibold text-slate-800 text-sm">
                                        {category.title}
                                    </span>
                                    <span className="text-xs text-slate-400 shrink-0">
                                        ({filledItems}/{totalItems})
                                    </span>
                                    {!isAllOk && (
                                        <Badge
                                            className="ml-auto shrink-0 bg-amber-100 text-amber-800 border-none px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide"
                                        >
                                            {damagedCount} Perlu Perbaikan
                                        </Badge>
                                    )}
                                </div>
                                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 in-data-[state=open]:rotate-180" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t border-slate-100 bg-slate-50/50">
                            <div className="divide-y divide-slate-100">
                                {category.items.map((checklistItem) => {
                                    const reportItem = items.find(
                                        (i) => i.itemId === checklistItem.id,
                                    );
                                    const condition = reportItem?.condition;
                                    const preventive = reportItem?.preventiveCondition;

                                    if (category.isPreventive && !condition && !preventive) {
                                        return null;
                                    }

                                    const isDamaged = condition === "RUSAK" || preventive === "NOT_OK";

                                    return (
                                        <div
                                            key={checklistItem.id}
                                            id={`checklistItem-${checklistItem.id}`}
                                            className="p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800 leading-snug">
                                                        {checklistItem.name}
                                                    </p>
                                                    {checklistItem.desc && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {checklistItem.desc}
                                                        </p>
                                                    )}
                                                </div>
                                                {getItemBadge(condition, preventive, !!category.isPreventive)}
                                            </div>

                                            {reportItem?.notes && (
                                                <div className="mb-3 text-xs text-slate-600 bg-white p-2 rounded-md border border-slate-200">
                                                    <span className="font-semibold text-slate-700">Catatan:</span> {reportItem.notes}
                                                </div>
                                            )}

                                            {isDamaged && (
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {(reportItem?.images || (reportItem?.photoUrl ? [reportItem.photoUrl] : []))?.map((url: string, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => onPhotoClick(resolvePhotoUrl(normalizePhotoUrl(url)))}
                                                            className="relative h-14 w-14 rounded-md border border-slate-200 overflow-hidden bg-white shadow-sm hover:ring-2 hover:ring-[#0069a7] transition-all"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={resolvePhotoUrl(normalizePhotoUrl(url))}
                                                                alt="Foto Temuan"
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        </button>
                                                    ))}
                                                    {(!reportItem?.images?.length && !reportItem?.photoUrl) && (
                                                        <div className="h-14 w-14 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <ImageIcon className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}
