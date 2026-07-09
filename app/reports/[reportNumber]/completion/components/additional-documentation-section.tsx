import { useState } from "react";
import { Camera, ChevronDown, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LocalPhoto } from "../types";
import { PhotoStrip } from "./photo-strip";

export function AdditionalDocumentationSection({
    photos,
    note,
    onOpenCamera,
    onRemovePhoto,
    onNoteChange,
    onPreview,
}: {
    photos: LocalPhoto[];
    note: string;
    onOpenCamera: () => void;
    onRemovePhoto: (id: string) => void;
    onNoteChange: (value: string) => void;
    onPreview: (url: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section className="border-b border-border/40 py-4">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex w-full items-start gap-3 cursor-pointer select-none">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 text-left">
                                    <h2 className="text-sm font-semibold">
                                        Dokumentasi tambahan
                                    </h2>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                        Tambahkan foto atau catatan bila
                                        diperlukan.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                        Opsional
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                    <div className="mt-5">
                        <PhotoStrip
                            photos={photos}
                            emptyText="Belum ada dokumentasi tambahan."
                            onRemove={onRemovePhoto}
                            onPreview={onPreview}
                        />
                    </div>
                    <div className="mt-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onOpenCamera}
                        >
                            <Camera data-icon="inline-start" />
                            Tambah Foto
                        </Button>
                    </div>

                    <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">
                            Catatan untuk foto tambahan
                        </Label>
                        <Textarea
                            value={note}
                            placeholder="Catatan untuk dokumentasi tambahan..."
                            className="mt-2 min-h-20 resize-none"
                            onChange={(event) =>
                                onNoteChange(event.target.value)
                            }
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </section>
    );
}
