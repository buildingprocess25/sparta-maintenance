"use client";

import { useEffect, useState } from "react";
import { Camera, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PHOTO_GUIDE_COUNTDOWN_SECONDS,
  type PhotoGuide,
} from "@/lib/photo-guides";

export type PhotoGuideRequest = {
  guide: PhotoGuide;
  itemId: string;
  mode: "gate" | "view";
  onConfirm?: () => void;
};

export function PhotoGuideDialog({
  request,
  onUnlock,
  onClose,
}: {
  request: PhotoGuideRequest | null;
  onUnlock: (itemId: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {request ? (
        <PhotoGuideDialogBody
          key={`${request.itemId}-${request.mode}`}
          request={request}
          onUnlock={onUnlock}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function PhotoGuideDialogBody({
  request,
  onUnlock,
  onClose,
}: {
  request: PhotoGuideRequest;
  onUnlock: (itemId: string) => void;
  onClose: () => void;
}) {
  const isGate = request.mode === "gate";
  const [imageStatus, setImageStatus] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const [secondsLeft, setSecondsLeft] = useState(
    isGate ? PHOTO_GUIDE_COUNTDOWN_SECONDS : 0,
  );
  // Gambar gagal dimuat tidak boleh memblokir BMS.
  const isLocked = isGate && imageStatus !== "error" && secondsLeft > 0;

  // Hitung mundur baru berjalan setelah gambar tampil.
  useEffect(() => {
    if (!isGate || imageStatus !== "loaded" || secondsLeft <= 0) return;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [isGate, imageStatus, secondsLeft]);

  useEffect(() => {
    if (isGate && !isLocked) onUnlock(request.itemId);
  }, [isGate, isLocked, onUnlock, request.itemId]);

  const preventCloseWhileLocked = (event: Event) => {
    if (isLocked) event.preventDefault();
  };

  return (
    <DialogContent
      showCloseButton={!isLocked}
      onEscapeKeyDown={preventCloseWhileLocked}
      onInteractOutside={preventCloseWhileLocked}
      className="sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>{request.guide.title}</DialogTitle>
        <DialogDescription>
          {isGate
            ? "Perhatikan contoh foto berikut sebelum mengambil foto."
            : "Gunakan contoh ini sebagai acuan saat mengambil foto."}
        </DialogDescription>
      </DialogHeader>

      {imageStatus === "error" ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <ImageOff className="size-6" />
          Gambar contoh gagal dimuat.
        </div>
      ) : (
        <a
          href={request.guide.src}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.guide.src}
            alt={request.guide.alt}
            className="max-h-[65vh] w-full object-contain"
            onLoad={() => setImageStatus("loaded")}
            onError={() => setImageStatus("error")}
          />
        </a>
      )}

      {isGate ? (
        <DialogFooter>
          {!isLocked ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={isLocked}
            onClick={() => {
              onClose();
              request.onConfirm?.();
            }}
          >
            <Camera data-icon="inline-start" />
            {isLocked
              ? `Tunggu ${secondsLeft} detik…`
              : "Saya mengerti, ambil foto"}
          </Button>
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}
