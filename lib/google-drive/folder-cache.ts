import "server-only";

import type { PrismaTx } from "@/lib/report-helpers";
import type { DriveFolderCache } from "./hierarchy-service";

export function createPrismaDriveFolderCache(client: PrismaTx): DriveFolderCache {
  return {
    async get(cacheKey) {
      const row = await client.googleDriveFolderCache.findUnique({
        where: { cacheKey },
        select: { folderId: true },
      });
      return row?.folderId ?? null;
    },

    async upsert(cacheKey, folderId) {
      await client.googleDriveFolderCache.upsert({
        where: { cacheKey },
        create: { cacheKey, folderId },
        update: { folderId },
      });
    },

    async delete(cacheKey) {
      await client.googleDriveFolderCache.deleteMany({
        where: { cacheKey },
      });
    },
  };
}
