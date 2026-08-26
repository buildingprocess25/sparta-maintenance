import type { Prisma } from "@prisma/client";

export type DraftStoreIdentity = {
  code: string;
  name: string;
  branchName: string;
};

export type ReservedDriveDraft = {
  reportNumber: string;
  bmsNIK: string;
  branchName: string;
  storeCode: string;
  storeName: string;
};

export type ReserveDriveDraftInput = {
  bmsNIK: string;
  branchName: string;
  storeCode: string;
};

export type PromoteDriveDraftInput = {
  reportNumber: string;
  bmsNIK: string;
  status: string;
  items: Prisma.InputJsonValue;
  estimations: Prisma.InputJsonValue;
  totalEstimation: number;
  drivePhotoFileIds: Prisma.InputJsonValue;
  createdAt?: Date;
};

export interface DriveDraftRepository {
  findStore(storeCode: string): Promise<DraftStoreIdentity | null>;
  findDraftByUser(bmsNIK: string): Promise<ReservedDriveDraft | null>;
  findDraftForPromotion(reportNumber: string, bmsNIK: string): Promise<ReservedDriveDraft | null>;
  generateReportNumber(storeCode: string): Promise<string>;
  createDraft(input: {
    reportNumber: string;
    bmsNIK: string;
    branchName: string;
    storeCode: string;
    storeName: string;
  }): Promise<void>;
  deleteDraft(reportNumber: string, bmsNIK: string): Promise<void>;
  promoteDraft(input: PromoteDriveDraftInput): Promise<void>;
}

export async function reserveDriveDraft(
  repository: DriveDraftRepository,
  input: ReserveDriveDraftInput,
): Promise<{ reportNumber: string }> {
  const store = await repository.findStore(input.storeCode);
  if (!store) {
    throw new Error(`Toko '${input.storeCode}' tidak ditemukan`);
  }
  if (store.branchName !== input.branchName) {
    throw new Error(`Toko '${input.storeCode}' tidak berada di cabang ${input.branchName}`);
  }

  const existingDraft = await repository.findDraftByUser(input.bmsNIK);
  if (existingDraft?.storeCode === store.code) {
    return { reportNumber: existingDraft.reportNumber };
  }
  if (existingDraft) {
    await repository.deleteDraft(existingDraft.reportNumber, input.bmsNIK);
  }

  const reportNumber = await repository.generateReportNumber(store.code);
  await repository.createDraft({
    reportNumber,
    bmsNIK: input.bmsNIK,
    branchName: store.branchName,
    storeCode: store.code,
    storeName: store.name,
  });

  return { reportNumber };
}

export async function promoteDriveDraft(
  repository: DriveDraftRepository,
  input: PromoteDriveDraftInput,
): Promise<void> {
  const draft = await repository.findDraftForPromotion(input.reportNumber, input.bmsNIK);
  if (!draft) {
    throw new Error("Draft laporan tidak ditemukan atau bukan milik user ini");
  }

  await repository.promoteDraft(input);
}
