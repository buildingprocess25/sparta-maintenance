"use client";

import { useCallback, useState } from "react";
import { getPhotoGuideForItem, shouldGateCamera } from "@/lib/photo-guides";
import type { PhotoGuideRequest } from "./photo-guide-dialog";

/**
 * Menahan pembukaan kamera untuk item ber-contoh foto sampai BMS melihat
 * contohnya sekali. State hanya di halaman (reload = tampil lagi).
 */
export function usePhotoGuideGate() {
  const [seenItemIds, setSeenItemIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [request, setRequest] = useState<PhotoGuideRequest | null>(null);

  const requestCamera = useCallback(
    (itemId: string, openCamera: () => void) => {
      const guide = getPhotoGuideForItem(itemId);
      if (!guide || !shouldGateCamera(itemId, seenItemIds)) {
        openCamera();
        return;
      }
      setRequest({ guide, itemId, mode: "gate", onConfirm: openCamera });
    },
    [seenItemIds],
  );

  const showGuide = useCallback((itemId: string) => {
    const guide = getPhotoGuideForItem(itemId);
    if (guide) setRequest({ guide, itemId, mode: "view" });
  }, []);

  const markSeen = useCallback((itemId: string) => {
    setSeenItemIds((prev) =>
      prev.has(itemId) ? prev : new Set(prev).add(itemId),
    );
  }, []);

  const close = useCallback(() => setRequest(null), []);

  return {
    requestCamera,
    showGuide,
    dialogProps: { request, onUnlock: markSeen, onClose: close },
  };
}
