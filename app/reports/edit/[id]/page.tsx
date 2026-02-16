import { redirect } from "next/navigation";

export default async function EditReportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // TODO: Implement edit report page
    // For now, redirect to reports list
    redirect(`/reports`);
}
