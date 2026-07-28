"use client";

import { Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type InfoPopoverProps = {
  /** Konten yang ditampilkan di dalam popover */
  children: React.ReactNode;
  /** Teks hint kecil di sebelah ikon (opsional) */
  hint?: string;
  className?: string;
};

/**
 * Komponen ikon ⓘ yang dapat diklik untuk menampilkan konten informasi
 * dalam sebuah popover/panel yang dapat ditutup secara eksplisit.
 *
 * Cocok digunakan di mana saja untuk memberikan penjelasan kontekstual
 * tanpa mengotori layout utama.
 */
export function InfoPopover({ children, hint, className }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {/* Trigger row: icon + optional hint */}
      <div className="flex items-center gap-1">
        {hint && !open && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Tampilkan informasi"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors",
            open
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Info className="size-3.5" />
        </button>
      </div>

      {/* Popover panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-4 text-[12px] leading-relaxed text-popover-foreground shadow-lg">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup informasi"
            className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>

          <div className="pr-4">{children}</div>
        </div>
      )}
    </div>
  );
}
