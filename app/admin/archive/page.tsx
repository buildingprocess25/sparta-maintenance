import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";

export default async function AdminArchivePage() {
    await requireRole("ADMIN");

    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (folderId) {
        redirect(`https://drive.google.com/drive/folders/${folderId}`);
    }

    // Fallback: env var not configured
    redirect("https://drive.google.com/drive/my-drive");
}
