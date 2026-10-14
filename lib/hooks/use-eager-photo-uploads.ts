"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";

import type { PhotoUploadStatusValue } from "@/components/photo-upload-status";
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
    createLocalStorageUploadedPhotoStore,
    EagerUploadRegistry,
    type EagerUploadState,
} from "@/lib/photo-upload/eager-upload-registry";
import { describePhotoUploadFailure } from "@/lib/photo-upload/upload-failure";
import { uploadPhotoRequest } from "@/lib/photo-upload/upload-photo-request";

const EMPTY_STATES: Readonly<Record<string, EagerUploadState>> = Object.freeze(
    {},
);
const getServerSnapshot = () => EMPTY_STATES;

/**
 * Uploads photos as soon as they are captured and tracks their status per
 * report. Uploaded records survive reloads via localStorage; failed photos stay
 * in IndexedDB and are uploaded again on submit through `registry.ensureUploaded`.
 */
export function useEagerPhotoUploads(reportNumber: string) {
    const registry = useMemo(
        () =>
            new EagerUploadRegistry(
                (file, context) => uploadPhotoRequest(file, context),
                createLocalStorageUploadedPhotoStore(
                    `sparta-eager-uploads-${reportNumber}`,
                ),
            ),
        [reportNumber],
    );

    const states = useSyncExternalStore(
        registry.subscribe,
        registry.getSnapshot,
        getServerSnapshot,
    );

    const startUpload = useCallback(
        (photoId: string, file: File, context: PhotoUploadContext) => {
            void registry.start(photoId, file, context).then((outcome) => {
                if (outcome.ok || !registry.getSnapshot()[photoId]) return;
                toast.error("Foto belum terunggah", {
                    description: `${describePhotoUploadFailure(outcome.failure)} Foto tetap tersimpan dan akan dicoba lagi saat dikirim.`,
                });
            });
        },
        [registry],
    );

    const retryUpload = useCallback(
        (photoId: string) => {
            const retry = registry.retry(photoId);
            if (!retry) {
                toast.error("Foto tidak bisa diunggah ulang", {
                    description: "Hapus foto ini lalu ambil ulang.",
                });
                return;
            }
            void retry.then((outcome) => {
                if (outcome.ok) {
                    toast.success("Foto berhasil diunggah");
                    return;
                }
                toast.error("Upload ulang gagal", {
                    description: describePhotoUploadFailure(outcome.failure),
                });
            });
        },
        [registry],
    );

    const statusValue = useMemo<PhotoUploadStatusValue>(
        () => ({ states, onRetry: retryUpload }),
        [states, retryUpload],
    );

    return { registry, states, startUpload, retryUpload, statusValue };
}
