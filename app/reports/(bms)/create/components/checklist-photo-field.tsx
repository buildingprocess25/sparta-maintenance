"use client";

import { useMemo } from "react";
import { Camera, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolvePhotoUrl } from "@/lib/storage/photo-url";

export function ChecklistPhotoField({
  itemId,
  photo,
  photoUrl,
  onOpenCamera,
  onPreviewPhoto,
  onRemovePhoto,
}: {
  itemId: string;
  photo?: File;
  photoUrl?: string;
  onOpenCamera: (itemId: string) => void;
  onPreviewPhoto: (photo: File | string) => void;
  onRemovePhoto: (itemId: string) => void;
}) {
  const hasPhoto = !!photo || !!photoUrl;

  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-photo">
      <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        Foto Bukti <span className="text-destructive">*</span>
      </p>
      {!hasPhoto ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 border-dashed"
          onClick={() => onOpenCamera(itemId)}
        >
          <Camera data-icon="inline-start" className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      ) : (
        <PhotoThumbnail
          photo={photo}
          photoUrl={photoUrl}
          onPreview={onPreviewPhoto}
          onRemove={() => onRemovePhoto(itemId)}
        />
      )}
    </div>
  );
}

function PhotoThumbnail({
  photo,
  photoUrl,
  onPreview,
  onRemove,
}: {
  photo?: File;
  photoUrl?: string;
  onPreview: (photo: File | string) => void;
  onRemove: () => void;
}) {
  const displayPhotoUrl = photoUrl ? resolvePhotoUrl(photoUrl) : undefined;
  const localPhotoUrl = useMemo(
    () => (!displayPhotoUrl && photo ? URL.createObjectURL(photo) : ""),
    [displayPhotoUrl, photo],
  );
  const previewSrc = displayPhotoUrl || localPhotoUrl;

  if (!previewSrc) return null;

  return (
    <div className="space-y-2">
      <div
        className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-primary/20 bg-muted"
        onClick={() => onPreview(displayPhotoUrl ?? photo ?? previewSrc)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt="Preview"
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          <CheckCircle2 className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {photo?.name ?? "Foto tersimpan"}
            </p>
          </div>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
