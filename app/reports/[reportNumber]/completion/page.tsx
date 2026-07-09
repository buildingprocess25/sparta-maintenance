import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/authorization";
import { CompletionClient } from "./completion-client";
import { getReportForCompletion } from "./queries";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function CompletionByReportPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { reportNumber } = await params;

    if (user.role !== "BMS") {
        redirect(`/dashboard/reports/${reportNumber}`);
    }

    const report = await getReportForCompletion(reportNumber, user.NIK);
    if (!report) notFound();

    return (
        <CompletionClient
            report={report}
            userNIK={user.NIK}
            userName={user.name}
        />
    );
}
