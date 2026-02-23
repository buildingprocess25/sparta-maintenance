"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Store,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    CalendarClock,
} from "lucide-react";
import {
    type ChecklistItem,
    type ChecklistCondition,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import { ChecklistItemCard } from "./checklist-item";

interface ChecklistStepProps {
    storeCode: string;
    storeName: string;
    activeCategories: ChecklistCategory[];
    openCategories: Set<string>;
    checklist: Map<string, ChecklistItem>;
    isCategoryICoolingDown: boolean;
    categoryIAvailableDate: Date | null;
    onToggleCategory: (categoryId: string) => void;
    onConditionChange: (
        itemId: string,
        itemName: string,
        value: ChecklistCondition,
    ) => void;
    onNotesChange: (itemId: string, itemName: string, value: string) => void;
    onHandlerChange: (itemId: string, itemName: string, value: string) => void;
    onOpenCamera: (itemId: string) => void;
    onPreviewPhoto: (file: File) => void;
    onRemovePhoto: (itemId: string) => void;
    onBack: () => void;
    onNext: () => void;
}

export function ChecklistStep({
    storeCode,
    storeName,
    activeCategories,
    openCategories,
    checklist,
    isCategoryICoolingDown,
    categoryIAvailableDate,
    onToggleCategory,
    onConditionChange,
    onNotesChange,
    onHandlerChange,
    onOpenCamera,
    onPreviewPhoto,
    onRemovePhoto,
    onBack,
    onNext,
}: ChecklistStepProps) {
    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full gap-4 md:gap-8">
            {/* Checklist */}
            <div className="w-full">
                <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-1 md:px-6 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                {storeCode} - {storeName}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                <span className="text-red-500">*</span>
                                Semua item wajib diisi
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-1 md:px-6 pb-0 md:pb-6">
                        {activeCategories.map((category) => {
                            const isOpen = openCategories.has(category.id);
                            const categoryItems = category.items.map(
                                (item) => ({
                                    ...item,
                                    ...checklist.get(item.id),
                                }),
                            );
                            const completedCount = categoryItems.filter(
                                (item) => item.condition,
                            ).length;
                            const totalCount = category.items.length;
                            const isCompleted = completedCount === totalCount;

                            return (
                                <Collapsible
                                    key={category.id}
                                    open={isOpen}
                                    onOpenChange={() =>
                                        onToggleCategory(category.id)
                                    }
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                {isCompleted ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                )}
                                                <span className="font-medium">
                                                    {category.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({completedCount}/
                                                    {totalCount})
                                                </span>
                                            </div>
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                            />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2">
                                        <div className="space-y-4 md:p-4 md:border-l-0 md:border md:rounded-lg bg-transparent md:bg-muted/30">
                                            {category.items.map((item) => (
                                                <ChecklistItemCard
                                                    key={item.id}
                                                    item={item}
                                                    isPreventive={
                                                        !!category.isPreventive
                                                    }
                                                    itemData={checklist.get(
                                                        item.id,
                                                    )}
                                                    onConditionChange={
                                                        onConditionChange
                                                    }
                                                    onNotesChange={
                                                        onNotesChange
                                                    }
                                                    onHandlerChange={
                                                        onHandlerChange
                                                    }
                                                    onOpenCamera={onOpenCamera}
                                                    onPreviewPhoto={
                                                        onPreviewPhoto
                                                    }
                                                    onRemovePhoto={
                                                        onRemovePhoto
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                        {/* Cooldown badge untuk Category I */}
                        {isCategoryICoolingDown && categoryIAvailableDate && (
                            <div className="flex items-center gap-2 py-2 px-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                                <CalendarClock className="h-4 w-4 shrink-0" />
                                <div className="text-sm">
                                    <span className="font-medium">
                                        I. Preventif Equipment Toko (setiap 3
                                        bulan)
                                    </span>{" "}
                                    — Laporkan lagi pada{" "}
                                    <Badge
                                        variant="outline"
                                        className="ml-1 text-amber-700 border-amber-300"
                                    >
                                        {categoryIAvailableDate.toLocaleDateString(
                                            "id-ID",
                                            {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            },
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {/* Action Buttons */}
            <div className="w-full mt-4 md:mt-0">
                <ButtonGroup className="w-full" orientation="horizontal">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onBack}
                    >
                        Batal
                    </Button>
                    <Button type="button" className="flex-1" onClick={onNext}>
                        Lanjut ke Estimasi BMS
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
}
