import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { createGoogleFolderGateway } from "@/lib/google-drive/folder-gateway";
import { ensureEvidenceFolder } from "@/lib/google-drive/hierarchy-service";
import { uploadPhotoToDriveCdn } from "@/lib/storage/drive-photo-service";
import { createPhotoUploadPostHandler } from "./handler";

export const POST = createPhotoUploadPostHandler({
  async getSession() {
    const session = await import("@/lib/session");
    return session.getSession();
  },
  async loadReport(reportNumber) {
    const { default: prisma } = await import("@/lib/prisma");
    return prisma.report.findUnique({
      where: { reportNumber },
      select: {
        reportNumber: true,
        createdByNIK: true,
        status: true,
        branchName: true,
        storeCode: true,
        storeName: true,
        store: {
          select: {
            code: true,
            name: true,
            branchName: true,
          },
        },
      },
    });
  },
  get rootFolderId() {
    return getDriveCdnClient().config.rootFolderId;
  },
  async ensureEvidenceFolder(input) {
    const { default: prisma } = await import("@/lib/prisma");
    const { createPrismaDriveFolderCache } = await import("@/lib/google-drive/folder-cache");
    const { drive } = getDriveCdnClient();
    return ensureEvidenceFolder(
      {
        gateway: createGoogleFolderGateway(drive),
        cache: createPrismaDriveFolderCache(prisma),
      },
      input,
    );
  },
  uploadPhoto: uploadPhotoToDriveCdn,
});
