import type { ChecklistItem } from "@/lib/checklist-data";

export type BmsItemEntry = {
    id: string;
    categoryId: string;
    categoryTitle: string;
    itemName: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
};

export type BmsItemGroup = {
    checklistItem: ChecklistItem;
    categoryTitle: string;
    entries: BmsItemEntry[];
};

export type StoreOption = {
    code: string;
    name: string;
    brand?: string | null;
    type?: string;
    hasPreventiveChecklist?: boolean;
};

export type SerializedDraft = {
    reportNumber: string;
    storeName: string;
    storeCode: string;
    branchName: string;
    totalEstimation: number;
    updatedAt: string;
    items: {
        itemId: string;
        itemName: string;
        categoryName: string;
        condition: string | null;
        preventiveCondition: string | null;
        handler: string | null;
        photoUrl: string | null;
        images?: string[];
        notes?: string | null;
        ahoTicketNumber?: string | null;
    }[];
    estimations: {
        itemId: string;
        materialName: string;
        quantity: number;
        unit: string;
        price: number;
        totalPrice: number;
    }[];
};

import type { BmsBalanceInfo } from "@/lib/balance";

export interface CreateReportFormProps {
    stores: StoreOption[];
    materialNames: string[];
    userBranchName: string;
    existingDraft?: SerializedDraft | null;
    userInfo: {
        name: string;
        nik: string;
        role: string;
        branch: string;
    };
    /** When set, the form operates in edit mode for the given REJECTED report. */
    editMode?: { reportNumber: string };
    /** Auto-restore the existingDraft on mount without showing the dialog (used for draft edit). */
    autoRestoreOnMount?: boolean;
    balanceInfo?: BmsBalanceInfo;
}
