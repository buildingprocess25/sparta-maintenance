import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import {
    buildDriveFolderUrl,
    ensureBmcReportArchiveFolder,
} from "@/lib/google-drive/archive";

export async function GET() {
    const user = await requireRole("BMC");

    const branchName = user.branchNames[0] ?? "Tanpa Cabang";
    const folderId = await ensureBmcReportArchiveFolder({
        branchName,
    });

    return NextResponse.redirect(buildDriveFolderUrl(folderId));
}
