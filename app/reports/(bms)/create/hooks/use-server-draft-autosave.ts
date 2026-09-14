"use client";

import { useCallback, useEffect, useRef } from "react";
import { saveServerDraft } from "@/app/reports/actions";
import type { DraftData } from "@/app/reports/actions";

export const SERVER_DRAFT_IDLE_MS = 17_000;

export function shouldServerAutosave(input: {
    isSubmitting: boolean;
    hasStore: boolean;
    isDirty: boolean;
    inFlight: boolean;
}) {
    return (
        !input.isSubmitting &&
        input.hasStore &&
        input.isDirty &&
        !input.inFlight
    );
}

type ServerDraftFlushReason =
    | "store"
    | "photo"
    | "step"
    | "idle"
    | "pagehide"
    | "submit";

type ServerDraftFlushResult = { reportNumber?: string };

type UseServerDraftAutosaveParams = {
    selectedStoreCode: string;
    isSubmitting: boolean;
    buildDraftData: () => DraftData;
    setDraftReportId: (id: string) => void;
};

export function useServerDraftAutosave({
    selectedStoreCode,
    isSubmitting,
    buildDraftData,
    setDraftReportId,
}: UseServerDraftAutosaveParams) {
    const dirtyRef = useRef(false);
    const dirtyVersionRef = useRef(0);
    const inFlightRef = useRef(false);
    const inFlightPromiseRef = useRef<Promise<ServerDraftFlushResult> | null>(
        null,
    );
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedStoreCodeRef = useRef(selectedStoreCode);
    const isSubmittingRef = useRef(isSubmitting);
    const buildDraftDataRef = useRef(buildDraftData);
    const setDraftReportIdRef = useRef(setDraftReportId);

    useEffect(() => {
        selectedStoreCodeRef.current = selectedStoreCode;
        isSubmittingRef.current = isSubmitting;
        buildDraftDataRef.current = buildDraftData;
        setDraftReportIdRef.current = setDraftReportId;
    }, [buildDraftData, isSubmitting, selectedStoreCode, setDraftReportId]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const scheduleIdleFlush = useCallback(
        (flush: () => void) => {
            clearTimer();
            timerRef.current = setTimeout(flush, SERVER_DRAFT_IDLE_MS);
        },
        [clearTimer],
    );

    const flushServerDraft = useCallback(
        async (reason: ServerDraftFlushReason): Promise<ServerDraftFlushResult> => {
            void reason;
            if (inFlightPromiseRef.current) {
                return inFlightPromiseRef.current;
            }
            if (
                !shouldServerAutosave({
                    isSubmitting: isSubmittingRef.current,
                    hasStore: !!selectedStoreCodeRef.current,
                    isDirty: dirtyRef.current,
                    inFlight: inFlightRef.current,
                })
            ) {
                return {};
            }

            clearTimer();
            inFlightRef.current = true;
            const savingVersion = dirtyVersionRef.current;

            const savePromise = (async () => {
                const result = await saveServerDraft(buildDraftDataRef.current());
                if ("success" in result) {
                    if (dirtyVersionRef.current === savingVersion) {
                        dirtyRef.current = false;
                    }
                    setDraftReportIdRef.current(result.reportNumber);
                    return { reportNumber: result.reportNumber };
                }
                return {};
            })();

            inFlightPromiseRef.current = savePromise;
            try {
                return await savePromise;
            } finally {
                inFlightPromiseRef.current = null;
                inFlightRef.current = false;
                if (
                    shouldServerAutosave({
                        isSubmitting: isSubmittingRef.current,
                        hasStore: !!selectedStoreCodeRef.current,
                        isDirty: dirtyRef.current,
                        inFlight: false,
                    })
                ) {
                    scheduleIdleFlush(() => {
                        void flushServerDraft("idle");
                    });
                }
            }
        },
        [clearTimer, scheduleIdleFlush],
    );

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
        dirtyVersionRef.current += 1;
        scheduleIdleFlush(() => {
            void flushServerDraft("idle");
        });
    }, [flushServerDraft, scheduleIdleFlush]);

    useEffect(() => {
        const onPageHide = () => {
            void flushServerDraft("pagehide");
        };
        window.addEventListener("pagehide", onPageHide);
        return () => {
            window.removeEventListener("pagehide", onPageHide);
            clearTimer();
        };
    }, [clearTimer, flushServerDraft]);

    return { markDirty, flushServerDraft };
}
