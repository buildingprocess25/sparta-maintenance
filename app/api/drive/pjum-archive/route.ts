import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import {
    buildDriveFolderUrl,
    ensureBmcPjumArchiveFolder,
} from "@/lib/google-drive/archive";

export async function GET() {
    const user = await requireRole("BMC");

    const branchName = user.branchNames[0] ?? "Tanpa Cabang";
    const folderId = await ensureBmcPjumArchiveFolder({
        branchName,
    });

    return NextResponse.redirect(buildDriveFolderUrl(folderId));
}
