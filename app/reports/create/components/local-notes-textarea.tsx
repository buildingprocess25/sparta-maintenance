"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Textarea dengan local state supaya setiap karakter tidak memicu
 * update ke global checklist Map (dan re-render semua item).
 * Sync ke parent hanya saat focus keluar (onBlur).
 */
export function LocalNotesTextarea({
    initialValue,
    onCommit,
}: {
    initialValue: string;
    onCommit: (value: string) => void;
}) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [prevInitial, setPrevInitial] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(!!initialValue);

    // Sync initialValue jika berubah dari luar (misal dari draft)
    if (initialValue !== prevInitial) {
        setLocalValue(initialValue);
        setPrevInitial(initialValue);
        if (initialValue) setIsEditing(true);
    }

    if (!isEditing) {
        return (
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed text-muted-foreground bg-transparent hover:bg-muted/50 justify-start h-9"
                onClick={() => setIsEditing(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Catatan (opsional)
            </Button>
        );
    }

    return (
        <Textarea
            autoFocus
            placeholder="Tambahkan catatan..."
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                onCommit(localValue);
                if (!localValue.trim()) {
                    setIsEditing(false);
                }
            }}
            className="resize-none"
            rows={2}
        />
    );
}
