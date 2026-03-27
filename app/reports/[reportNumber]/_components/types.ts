import type {
    ReportItemJson,
    MaterialEstimationJson,
    MaterialStoreJson,
} from "@/types/report";

export type ActivityEntry = {
    action: string;
    notes: string | null;
    actorName: string;
    createdAt: Date;
};

export type ReportData = {
    reportNumber: string;
    storeName: string;
    storeCode: string;
    branchName: string;
    status: string;
    totalEstimation: number;
    createdAt: Date;
    updatedAt: Date;
    submittedBy: string;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    activities: ActivityEntry[];
    startSelfieUrls: string[];
    startReceiptUrls: string[];
    startMaterialStores: MaterialStoreJson[];
};

export type Viewer = { role: string; nik: string };

/** Shared action state passed to sidebar + mobile CTA bar */
export type ActionState = {
    isPending: boolean;
    notesInput: string;
    setNotesInput: (v: string) => void;
    activeDialog: string | null;
    setActiveDialog: (v: string | null) => void;
    handleSubmitCompletion: () => void;
    handleReviewEstimation: (
        decision: "approve" | "reject_revision" | "reject",
    ) => void;
    handleReviewCompletion: (decision: "approve" | "reject_revision") => void;
    handleApproveFinal: () => void;
};
