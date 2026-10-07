-- CreateTable
CREATE TABLE "BmsStoreAssignment" (
    "id" TEXT NOT NULL,
    "bmsNIK" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByNIK" TEXT,
    "unassignedAt" TIMESTAMPTZ(3),
    "unassignedByNIK" TEXT,
    "notes" TEXT,

    CONSTRAINT "BmsStoreAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BmsStoreAssignment_storeCode_isActive_idx" ON "BmsStoreAssignment"("storeCode", "isActive");

-- CreateIndex
CREATE INDEX "BmsStoreAssignment_bmsNIK_isActive_idx" ON "BmsStoreAssignment"("bmsNIK", "isActive");

-- CreateIndex
CREATE INDEX "BmsStoreAssignment_bmsNIK_storeCode_idx" ON "BmsStoreAssignment"("bmsNIK", "storeCode");

-- AddForeignKey
ALTER TABLE "BmsStoreAssignment" ADD CONSTRAINT "BmsStoreAssignment_bmsNIK_fkey" FOREIGN KEY ("bmsNIK") REFERENCES "User"("NIK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BmsStoreAssignment" ADD CONSTRAINT "BmsStoreAssignment_storeCode_fkey" FOREIGN KEY ("storeCode") REFERENCES "Store"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial Unique Index: Memastikan 1 toko HANYA boleh dipegang oleh 1 BMS aktif pada satu waktu
CREATE UNIQUE INDEX "unique_active_store_assignment" ON "BmsStoreAssignment"("storeCode") WHERE "isActive" = true;