"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type ReviewGateContextValue = {
    enabled: boolean;
    requiredPhotoCount: number;
    openedPhotoCount: number;
    hasOpenedReceiptComparison: boolean;
    isReviewComplete: boolean;
    missingReviewText: string;
    isPhotoOpened: (photoId: string) => boolean;
    markReceiptComparisonOpened: () => void;
    markPhotoOpened: (photoId: string) => void;
};

const fallbackReviewGate: ReviewGateContextValue = {
    enabled: false,
    requiredPhotoCount: 0,
    openedPhotoCount: 0,
    hasOpenedReceiptComparison: true,
    isReviewComplete: true,
    missingReviewText: "",
    isPhotoOpened: () => true,
    markReceiptComparisonOpened: () => {},
    markPhotoOpened: () => {},
};

const ReportApprovalReviewGateContext =
    createContext<ReviewGateContextValue>(fallbackReviewGate);

type ReportApprovalReviewGateProviderProps = {
    enabled: boolean;
    requiredPhotoIds: string[];
    children: ReactNode;
};

export function ReportApprovalReviewGateProvider({
    enabled,
    requiredPhotoIds,
    children,
}: ReportApprovalReviewGateProviderProps) {
    const requiredPhotoIdSet = useMemo(
        () => new Set(requiredPhotoIds),
        [requiredPhotoIds],
    );
    const [openedPhotoIds, setOpenedPhotoIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [hasOpenedReceiptComparison, setHasOpenedReceiptComparison] =
        useState(false);

    const openedPhotoCount = useMemo(() => {
        let count = 0;
        for (const photoId of openedPhotoIds) {
            if (requiredPhotoIdSet.has(photoId)) count += 1;
        }
        return count;
    }, [openedPhotoIds, requiredPhotoIdSet]);

    const hasOpenedAllPhotos = openedPhotoCount >= requiredPhotoIdSet.size;
    const isReviewComplete =
        !enabled || (hasOpenedReceiptComparison && hasOpenedAllPhotos);
    const missingReviewText = getMissingReviewText({
        enabled,
        hasOpenedReceiptComparison,
        hasOpenedAllPhotos,
        openedPhotoCount,
        requiredPhotoCount: requiredPhotoIdSet.size,
    });

    const value = useMemo<ReviewGateContextValue>(
        () => ({
            enabled,
            requiredPhotoCount: requiredPhotoIdSet.size,
            openedPhotoCount,
            hasOpenedReceiptComparison,
            isReviewComplete,
            missingReviewText,
            isPhotoOpened: (photoId: string) =>
                !requiredPhotoIdSet.has(photoId) ||
                openedPhotoIds.has(photoId),
            markReceiptComparisonOpened: () => {
                setHasOpenedReceiptComparison(true);
            },
            markPhotoOpened: (photoId: string) => {
                if (!requiredPhotoIdSet.has(photoId)) return;
                setOpenedPhotoIds((current) => {
                    const next = new Set(current);
                    next.add(photoId);
                    return next;
                });
            },
        }),
        [
            enabled,
            hasOpenedReceiptComparison,
            isReviewComplete,
            missingReviewText,
            openedPhotoCount,
            openedPhotoIds,
            requiredPhotoIdSet,
        ],
    );

    return (
        <ReportApprovalReviewGateContext.Provider value={value}>
            {children}
        </ReportApprovalReviewGateContext.Provider>
    );
}

export function useReportApprovalReviewGate() {
    return useContext(ReportApprovalReviewGateContext);
}

function getMissingReviewText({
    enabled,
    hasOpenedReceiptComparison,
    hasOpenedAllPhotos,
    openedPhotoCount,
    requiredPhotoCount,
}: {
    enabled: boolean;
    hasOpenedReceiptComparison: boolean;
    hasOpenedAllPhotos: boolean;
    openedPhotoCount: number;
    requiredPhotoCount: number;
}) {
    if (!enabled) return "";

    if (!hasOpenedReceiptComparison && !hasOpenedAllPhotos) {
        return `Buka fitur Bandingkan dengan Nota dan semua foto pekerjaan (${openedPhotoCount}/${requiredPhotoCount}) sebelum menyetujui.`;
    }

    if (!hasOpenedReceiptComparison) {
        return "Buka fitur Bandingkan dengan Nota sebelum menyetujui.";
    }

    if (!hasOpenedAllPhotos) {
        return `Buka semua foto pekerjaan (${openedPhotoCount}/${requiredPhotoCount}) sebelum menyetujui.`;
    }

    return "";
}
