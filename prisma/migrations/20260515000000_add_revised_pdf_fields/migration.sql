-- Migration: add_revised_pdf_fields
-- Tambah field revisedPdfDriveUrl dan revisedPdfFolderUrl ke tabel Report
-- Tambah nilai ADMIN_REALISASI_REVISED ke enum ActivityAction

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "revisedPdfDriveUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "revisedPdfFolderUrl" TEXT;

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ADMIN_REALISASI_REVISED';
