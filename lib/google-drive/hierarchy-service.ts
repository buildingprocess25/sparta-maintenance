import type { DriveFolder, DriveFolderGateway } from "./folder-gateway";
import {
  buildEvidenceRelativePath,
  buildNewStoreFolderName,
  buildPjumRelativePath,
  buildReportRelativePath,
  MAINTENANCE_FOLDER,
  normalizeStoreIdentity,
  parseStoreFolderName,
  REPORT_DOCUMENT_FOLDER,
  STORE_COLLECTION_FOLDER,
  type EvidenceDestination,
  type ParsedStoreFolderName,
} from "./hierarchy-policy";

export interface DriveFolderCache {
  get(cacheKey: string): Promise<string | null>;
  upsert(cacheKey: string, folderId: string): Promise<void>;
  delete(cacheKey: string): Promise<void>;
}

export type DriveHierarchyDeps = {
  gateway: DriveFolderGateway;
  cache?: DriveFolderCache;
};

export type StoreResolutionInput = {
  rootFolderId: string;
  branchName: string;
  storeCode: string;
  storeName: string;
};

export type StoreResolution = {
  branchFolderId: string;
  tokoFolderId: string;
  storeFolderId: string;
  maintenanceFolderId: string;
  repairedStoreCode: boolean;
  createdStoreFolder: boolean;
};

export type ReportFolderInput = StoreResolutionInput & {
  reportNumber: string;
};

export type EvidenceFolderInput = ReportFolderInput & {
  evidence: EvidenceDestination;
};

export type PjumFolderInput = {
  rootFolderId: string;
  branchName: string;
  bmsNIK: string;
  bmsName: string;
  year: number;
  monthName: string;
};

export async function resolveStoreFolder(
  deps: DriveHierarchyDeps,
  input: StoreResolutionInput,
): Promise<StoreResolution> {
  const branchFolder = await findRequiredChildFolder(
    deps.gateway,
    input.rootFolderId,
    input.branchName,
    `Branch folder '${input.branchName}' not found`,
  );
  const tokoFolder = await findRequiredChildFolder(
    deps.gateway,
    branchFolder.id,
    STORE_COLLECTION_FOLDER,
    `Toko folder not found under branch '${input.branchName}'`,
  );
  const storeCacheKey = buildStoreCacheKey(input);
  const cachedStoreId = await deps.cache?.get(storeCacheKey);

  if (cachedStoreId) {
    const cachedStore = await deps.gateway.getFolder(cachedStoreId);
    if (cachedStore?.parentIds.includes(tokoFolder.id)) {
      const maintenanceFolderId = await ensureNamedChildFolder(
        deps.gateway,
        cachedStore.id,
        MAINTENANCE_FOLDER,
      );
      return {
        branchFolderId: branchFolder.id,
        tokoFolderId: tokoFolder.id,
        storeFolderId: cachedStore.id,
        maintenanceFolderId,
        repairedStoreCode: false,
        createdStoreFolder: false,
      };
    }
    await deps.cache?.delete(storeCacheKey);
  }

  const storeFolders = await deps.gateway.listChildFolders(tokoFolder.id);
  const parsedStoreFolders = storeFolders
    .map((folder) => ({ folder, parsed: parseStoreFolderName(folder.name) }))
    .filter((entry): entry is { folder: DriveFolder; parsed: ParsedStoreFolderName } =>
      entry.parsed !== null,
    );
  const normalizedStoreCode = normalizeStoreIdentity(input.storeCode);
  const normalizedStoreName = normalizeStoreIdentity(input.storeName);
  const codeMatches = parsedStoreFolders.filter(
    ({ parsed }) => normalizeStoreIdentity(parsed.storeCode) === normalizedStoreCode,
  );

  if (codeMatches.length > 1) {
    throw new Error(
      `Ambiguous Drive store folder code match for '${input.storeCode}' in branch '${input.branchName}'`,
    );
  }

  let selectedFolder: DriveFolder | null = null;
  let repairedStoreCode = false;
  let createdStoreFolder = false;

  if (codeMatches.length === 1) {
    selectedFolder = codeMatches[0]!.folder;
  } else {
    const nameMatches = parsedStoreFolders.filter(
      ({ parsed }) => normalizeStoreIdentity(parsed.storeName) === normalizedStoreName,
    );

    if (nameMatches.length > 1) {
      throw new Error(
        `Ambiguous Drive store folder name match for '${input.storeName}' in branch '${input.branchName}'`,
      );
    }

    if (nameMatches.length === 1) {
      const match = nameMatches[0]!;
      const repairedName = `${match.parsed.noUlok} - ${match.parsed.storeName} - ${input.storeCode.trim()}`;
      await deps.cache?.delete(storeCacheKey);
      await deps.gateway.renameFolder(match.folder.id, repairedName);
      selectedFolder = { ...match.folder, name: repairedName };
      repairedStoreCode = true;
    }
  }

  if (!selectedFolder) {
    selectedFolder = await deps.gateway.createFolder(
      tokoFolder.id,
      buildNewStoreFolderName({
        storeName: input.storeName,
        storeCode: input.storeCode,
      }),
    );
    createdStoreFolder = true;
  }

  const maintenanceFolderId = await ensureNamedChildFolder(
    deps.gateway,
    selectedFolder.id,
    MAINTENANCE_FOLDER,
  );

  await deps.cache?.upsert(storeCacheKey, selectedFolder.id);

  return {
    branchFolderId: branchFolder.id,
    tokoFolderId: tokoFolder.id,
    storeFolderId: selectedFolder.id,
    maintenanceFolderId,
    repairedStoreCode,
    createdStoreFolder,
  };
}

export async function ensureReportFolder(
  deps: DriveHierarchyDeps,
  input: ReportFolderInput,
): Promise<string> {
  const reportCacheKey = buildReportCacheKey(input);
  const cachedReportFolderId = await deps.cache?.get(reportCacheKey);
  if (cachedReportFolderId) {
    const cachedFolder = await deps.gateway.getFolder(cachedReportFolderId);
    if (cachedFolder) {
      return cachedFolder.id;
    }
    await deps.cache?.delete(reportCacheKey);
  }

  const storeResolution = await resolveStoreFolder(deps, input);
  const reportFolderId = await ensureFolderPath(
    deps.gateway,
    storeResolution.maintenanceFolderId,
    buildReportRelativePath(input.reportNumber),
  );

  await deps.cache?.upsert(reportCacheKey, reportFolderId);
  return reportFolderId;
}

export async function ensureEvidenceFolder(
  deps: DriveHierarchyDeps,
  input: EvidenceFolderInput,
): Promise<string> {
  const reportFolderId = await ensureReportFolder(deps, input);
  return ensureFolderPath(deps.gateway, reportFolderId, buildEvidenceRelativePath(input.evidence));
}

export async function ensureReportDocumentFolder(
  deps: DriveHierarchyDeps,
  input: ReportFolderInput,
): Promise<string> {
  const reportFolderId = await ensureReportFolder(deps, input);
  return ensureNamedChildFolder(deps.gateway, reportFolderId, REPORT_DOCUMENT_FOLDER);
}

export async function ensurePjumMonthFolder(
  deps: DriveHierarchyDeps,
  input: PjumFolderInput,
): Promise<string> {
  const pjumCacheKey = buildPjumCacheKey(input);
  const cachedPjumFolderId = await deps.cache?.get(pjumCacheKey);
  if (cachedPjumFolderId) {
    const cachedFolder = await deps.gateway.getFolder(cachedPjumFolderId);
    if (cachedFolder) {
      return cachedFolder.id;
    }
    await deps.cache?.delete(pjumCacheKey);
  }

  const branchFolder = await findRequiredChildFolder(
    deps.gateway,
    input.rootFolderId,
    input.branchName,
    `Branch folder '${input.branchName}' not found`,
  );
  const pjumFolderId = await ensureFolderPath(
    deps.gateway,
    branchFolder.id,
    buildPjumRelativePath(input),
  );

  await deps.cache?.upsert(pjumCacheKey, pjumFolderId);
  return pjumFolderId;
}

async function findRequiredChildFolder(
  gateway: DriveFolderGateway,
  parentId: string,
  name: string,
  errorMessage: string,
): Promise<DriveFolder> {
  const folders = await gateway.listChildFolders(parentId);
  const match = folders.find((folder) => folder.name === name);
  if (!match) {
    throw new Error(errorMessage);
  }
  return match;
}

async function ensureFolderPath(
  gateway: DriveFolderGateway,
  parentId: string,
  pathSegments: string[],
): Promise<string> {
  let currentParentId = parentId;
  for (const segment of pathSegments) {
    currentParentId = await ensureNamedChildFolder(gateway, currentParentId, segment);
  }
  return currentParentId;
}

async function ensureNamedChildFolder(
  gateway: DriveFolderGateway,
  parentId: string,
  name: string,
): Promise<string> {
  const existing = (await gateway.listChildFolders(parentId)).find((folder) => folder.name === name);
  if (existing) {
    return existing.id;
  }

  return (await gateway.createFolder(parentId, name)).id;
}

function buildStoreCacheKey(input: StoreResolutionInput): string {
  return [
    "DRIVE_STORE",
    input.rootFolderId,
    normalizeStoreIdentity(input.branchName),
    normalizeStoreIdentity(input.storeCode),
  ].join(":");
}

function buildReportCacheKey(input: ReportFolderInput): string {
  return [
    "DRIVE_REPORT",
    input.rootFolderId,
    normalizeStoreIdentity(input.branchName),
    normalizeStoreIdentity(input.storeCode),
    input.reportNumber,
  ].join(":");
}

function buildPjumCacheKey(input: PjumFolderInput): string {
  return [
    "DRIVE_PJUM",
    input.rootFolderId,
    normalizeStoreIdentity(input.branchName),
    normalizeStoreIdentity(input.bmsNIK),
    input.year,
    normalizeStoreIdentity(input.monthName),
  ].join(":");
}
