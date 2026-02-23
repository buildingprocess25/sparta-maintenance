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

export interface CreateReportFormProps {
    stores: StoreOption[];
    userBranchName: string;
    existingDraft?: SerializedDraft | null;
    userInfo: {
        name: string;
        nik: string;
        role: string;
        branch: string;
    };
}
