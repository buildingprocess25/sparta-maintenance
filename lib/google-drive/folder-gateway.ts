import type { drive_v3 } from "googleapis";

export type DriveFolder = {
  id: string;
  name: string;
  parentIds: string[];
};

export interface DriveFolderGateway {
  listChildFolders(parentId: string): Promise<DriveFolder[]>;
  getFolder(folderId: string): Promise<DriveFolder | null>;
  createFolder(parentId: string, name: string): Promise<DriveFolder>;
  renameFolder(folderId: string, name: string): Promise<void>;
}

export function createGoogleFolderGateway(drive: drive_v3.Drive): DriveFolderGateway {
  return {
    async listChildFolders(parentId) {
      const folders: DriveFolder[] = [];
      let pageToken: string | undefined;

      do {
        const response = await drive.files.list({
          q: `'${escapeDriveQueryValue(parentId)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "nextPageToken,files(id,name,parents)",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          pageSize: 1000,
          pageToken,
        });

        for (const file of response.data.files ?? []) {
          if (file.id && file.name) {
            folders.push({
              id: file.id,
              name: file.name,
              parentIds: file.parents ?? [],
            });
          }
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      return folders;
    },

    async getFolder(folderId) {
      try {
        const response = await drive.files.get({
          fileId: folderId,
          fields: "id,name,parents,mimeType,trashed",
          supportsAllDrives: true,
        });

        if (
          !response.data.id ||
          !response.data.name ||
          response.data.mimeType !== "application/vnd.google-apps.folder" ||
          response.data.trashed
        ) {
          return null;
        }

        return {
          id: response.data.id,
          name: response.data.name,
          parentIds: response.data.parents ?? [],
        };
      } catch {
        return null;
      }
    },

    async createFolder(parentId, name) {
      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id,name,parents",
        supportsAllDrives: true,
      });

      if (!response.data.id || !response.data.name) {
        throw new Error(`Failed to create Drive folder '${name}'`);
      }

      return {
        id: response.data.id,
        name: response.data.name,
        parentIds: response.data.parents ?? [parentId],
      };
    },

    async renameFolder(folderId, name) {
      await drive.files.update({
        fileId: folderId,
        requestBody: { name },
        fields: "id,name",
        supportsAllDrives: true,
      });
    },
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}
