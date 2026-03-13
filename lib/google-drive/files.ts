import { Readable } from "stream";
import { getGoogleDriveClient } from "@/lib/google-drive/client";

const folderPathCache = new Map<string, string>();
const folderLookupCache = new Map<string, string>();

function escapeDriveQueryValue(value: string): string {
    return value.replace(/'/g, "\\'");
}

export type DriveFileResult = {
    fileId: string;
    webViewLink: string | null;
    webContentLink: string | null;
    name: string;
};

async function findFolderByName(parentId: string, folderName: string) {
    const { drive } = getGoogleDriveClient();

    const safeFolderName = escapeDriveQueryValue(folderName);
    const response = await drive.files.list({
        q: `'${parentId}' in parents and name='${safeFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id,name)",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 1,
    });

    return response.data.files?.[0] ?? null;
}

async function createFolder(parentId: string, folderName: string) {
    const { drive } = getGoogleDriveClient();

    const response = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id,name",
        supportsAllDrives: true,
    });

    return response.data;
}

export async function ensureDriveFolderPath(
    pathSegments: string[],
): Promise<string> {
    if (pathSegments.length === 0) {
        throw new Error("pathSegments must have at least one segment");
    }

    const { config } = getGoogleDriveClient();
    const normalizedSegments = pathSegments
        .map((segment) => segment.trim())
        .filter(Boolean);

    const pathCacheKey = `${config.rootFolderId}/${normalizedSegments.join("/")}`;
    const cachedPathFolderId = folderPathCache.get(pathCacheKey);
    if (cachedPathFolderId) {
        return cachedPathFolderId;
    }

    let currentParentId = config.rootFolderId;

    for (const segment of normalizedSegments) {
        const lookupKey = `${currentParentId}::${segment}`;
        const cachedFolderId = folderLookupCache.get(lookupKey);
        if (cachedFolderId) {
            currentParentId = cachedFolderId;
            continue;
        }

        const existing = await findFolderByName(currentParentId, segment);
        if (existing?.id) {
            folderLookupCache.set(lookupKey, existing.id);
            currentParentId = existing.id;
            continue;
        }

        const created = await createFolder(currentParentId, segment);
        if (!created.id) {
            throw new Error(`Failed to create folder '${segment}'`);
        }
        folderLookupCache.set(lookupKey, created.id);
        currentParentId = created.id;
    }

    folderPathCache.set(pathCacheKey, currentParentId);

    return currentParentId;
}

export async function uploadPdfToDrive(params: {
    fileName: string;
    folderId: string;
    buffer: Buffer;
    overwriteIfExists?: boolean;
}): Promise<DriveFileResult> {
    const { drive } = getGoogleDriveClient();
    const { fileName, folderId, buffer, overwriteIfExists = true } = params;

    const safeFileName = escapeDriveQueryValue(fileName);

    let existingId: string | undefined;
    if (overwriteIfExists) {
        const existing = await drive.files.list({
            q: `'${folderId}' in parents and name='${safeFileName}' and trashed=false`,
            fields: "files(id,name)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 1,
        });
        existingId = existing.data.files?.[0]?.id ?? undefined;
    }

    const media = {
        mimeType: "application/pdf",
        body: Readable.from(buffer),
    };

    if (existingId) {
        const updated = await drive.files.update({
            fileId: existingId,
            media,
            fields: "id,name,webViewLink,webContentLink",
            supportsAllDrives: true,
        });

        if (!updated.data.id || !updated.data.name) {
            throw new Error("Google Drive update returned empty file metadata");
        }

        return {
            fileId: updated.data.id,
            name: updated.data.name,
            webViewLink: updated.data.webViewLink ?? null,
            webContentLink: updated.data.webContentLink ?? null,
        };
    }

    const created = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
            mimeType: "application/pdf",
        },
        media,
        fields: "id,name,webViewLink,webContentLink",
        supportsAllDrives: true,
    });

    if (!created.data.id || !created.data.name) {
        throw new Error("Google Drive create returned empty file metadata");
    }

    return {
        fileId: created.data.id,
        name: created.data.name,
        webViewLink: created.data.webViewLink ?? null,
        webContentLink: created.data.webContentLink ?? null,
    };
}
