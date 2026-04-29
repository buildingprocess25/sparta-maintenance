"use client";

import { Camera, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    type ChecklistItem as ChecklistItemType,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { cn } from "@/lib/utils";

interface ChecklistItemProps {
    item: { id: string; name: string; desc?: string };
    isPreventive: boolean;
    itemData: ChecklistItemType | undefined;
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
}

export function ChecklistItemCard({
    item,
    isPreventive,
    itemData,
    onConditionChange,
    onNotesChange,
    onHandlerChange,
    onOpenCamera,
    onPreviewPhoto,
    onRemovePhoto,
}: ChecklistItemProps) {
    const condition = itemData?.condition || "";
    const handler = itemData?.handler || "";
    const photo = itemData?.photo;
    const isNotesRequired = condition === "rusak";

    return (
        <div
            id={`item-${item.id}`}
            className="space-y-3 p-3 bg-background rounded-md border transition-all duration-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20 focus-within:shadow-lg focus-within:shadow-primary/20"
        >
            <div>
                <p className="font-medium text-sm">
                    {item.id}. {item.name}
                </p>
                {item.desc && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {item.desc}
                    </p>
                )}
            </div>

            {isPreventive ? (
                /* PREVENTIVE: OK / NOT OK / TIDAK ADA */
                <div className="flex flex-wrap gap-2">
                    {(
                        ["baik", "rusak", "tidak-ada"] as ChecklistCondition[]
                    ).map((val) => {
                        const label =
                            val === "baik"
                                ? "OK"
                                : val === "rusak"
                                  ? "Not OK"
                                  : "Tidak Ada";
                        const isSelected = condition === val;
                        const selectedStyle =
                            val === "baik"
                                ? isSelected
                                    ? "bg-green-50 border-green-400 text-green-700 font-medium"
                                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                : val === "rusak"
                                  ? isSelected
                                      ? "bg-red-50 border-red-400 text-red-700 font-medium"
                                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                  : isSelected
                                    ? "bg-muted border-border text-foreground font-medium"
                                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted";
                        const dotStyle =
                            val === "baik"
                                ? isSelected
                                    ? "border-green-600 bg-green-600"
                                    : "border-muted-foreground"
                                : val === "rusak"
                                  ? isSelected
                                      ? "border-red-600 bg-red-600"
                                      : "border-muted-foreground"
                                  : isSelected
                                    ? "border-foreground bg-foreground"
                                    : "border-muted-foreground";
                        return (
                            <button
                                key={val}
                                type="button"
                                onClick={() =>
                                    onConditionChange(item.id, item.name, val)
                                }
                                className={cn(
                                    "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all",
                                    selectedStyle,
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-3 w-3 rounded-full border-2 shrink-0",
                                        dotStyle,
                                    )}
                                />
                                {label}
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* REGULAR: Baik / Rusak / Tidak Ada */
                <div className="flex flex-wrap gap-2">
                    {[
                        { val: "baik" as ChecklistCondition, label: "Baik" },
                        { val: "rusak" as ChecklistCondition, label: "Rusak" },
                        {
                            val: "tidak-ada" as ChecklistCondition,
                            label: "Tidak Ada",
                        },
                    ].map(({ val, label }) => {
                        const isSelected = condition === val;
                        const selectedStyle =
                            val === "baik"
                                ? isSelected
                                    ? "bg-green-50 border-green-400 text-green-700 font-medium"
                                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                : val === "rusak"
                                  ? isSelected
                                      ? "bg-red-50 border-red-400 text-red-700 font-medium"
                                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                  : isSelected
                                    ? "bg-muted border-border text-foreground font-medium"
                                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted";
                        const dotStyle =
                            val === "baik"
                                ? isSelected
                                    ? "border-green-600 bg-green-600"
                                    : "border-muted-foreground"
                                : val === "rusak"
                                  ? isSelected
                                      ? "border-red-600 bg-red-600"
                                      : "border-muted-foreground"
                                  : isSelected
                                    ? "border-foreground bg-foreground"
                                    : "border-muted-foreground";
                        return (
                            <button
                                key={val}
                                type="button"
                                onClick={() =>
                                    onConditionChange(item.id, item.name, val)
                                }
                                className={cn(
                                    "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all",
                                    selectedStyle,
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-3 w-3 rounded-full border-2 shrink-0",
                                        dotStyle,
                                    )}
                                />
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Notes */}
            {condition && (
                <div className="space-y-2 pt-2 border-t animate-in slide-in-from-top-2">
                    <LocalNotesTextarea
                        initialValue={itemData?.notes || ""}
                        required={isNotesRequired}
                        onCommit={(val) =>
                            onNotesChange(item.id, item.name, val)
                        }
                    />
                </div>
            )}

            {/* Photo: Baik */}
            {condition === "baik" && (
                <div className="space-y-3 pt-2 border-t animate-in slide-in-from-top-2">
                    {!photo ? (
                        <div className="flex md:flex-row gap-2">
                            <Label className="text-sm">
                                Foto Bukti{" "}
                                <span className="text-red-500">*</span>
                            </Label>

                            <Button
                                type="button"
                                variant="ghost"
                                className=" bg-blue-500/10 hover:ring-blue-500/80 text-blue-500 hover:text-blue-500/80"
                                onClick={() => onOpenCamera(item.id)}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Buka Kamera
                            </Button>
                        </div>
                    ) : (
                        <div className="gap-2">
                            <Label className="text-sm">
                                Foto Bukti{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <PhotoThumbnail
                                photo={photo}
                                onPreview={onPreviewPhoto}
                                onRemove={() => onRemovePhoto(item.id)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Photo + Handler: Rusak */}
            {condition === "rusak" && (
                <div className=" space-y-3 pt-2 border-t animate-in slide-in-from-top-2">
                    {!photo ? (
                        <div className="flex md:flex-row gap-2">
                            <Label className="text-sm">
                                Foto Kerusakan{" "}
                                <span className="text-red-500">*</span>
                            </Label>

                            <Button
                                type="button"
                                variant="ghost"
                                className=" bg-blue-500/10 hover:ring-blue-500/80 text-blue-500 hover:text-blue-500/80"
                                onClick={() => onOpenCamera(item.id)}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Buka Kamera
                            </Button>
                        </div>
                    ) : (
                        <div className="gap-2">
                            <Label className="text-sm">
                                Foto Kerusakan{" "}
                                <span className="text-red-500">*</span>
                            </Label>
                            <PhotoThumbnail
                                photo={photo}
                                onPreview={onPreviewPhoto}
                                onRemove={() => onRemovePhoto(item.id)}
                            />
                        </div>
                    )}

                    <div className="flex gap-2 w-full">
                        <Label className="text-sm">
                            Akan dikerjakan oleh{" "}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={handler}
                            onValueChange={(value) =>
                                onHandlerChange(item.id, item.name, value)
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Pilih handler" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BMS">BMS</SelectItem>
                                <SelectItem value="Rekanan">Rekanan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Photo Thumbnail (internal) ─── */
function PhotoThumbnail({
    photo,
    onPreview,
    onRemove,
}: {
    photo: File;
    onPreview: (file: File) => void;
    onRemove: () => void;
}) {
    return (
        <div className="mt-2 space-y-2">
            {/* Thumbnail Preview */}
            <div
                className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-green-200 bg-green-50"
                onClick={() => onPreview(photo)}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={URL.createObjectURL(photo)}
                    alt="Preview"
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <div className="bg-white/90 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                        Klik untuk lihat
                    </div>
                </div>
            </div>
            {/* File Info & Actions */}
            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="h-4 w-4 text-green-700 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-green-800 truncate">
                            {photo.name}
                        </p>
                        <p className="text-[10px] text-green-600">
                            {(photo.size / 1024).toFixed(0)} KB
                        </p>
                    </div>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={onRemove}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
