import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/authorization";
import { getReportForStartWork } from "./queries";
import { StartWorkClient } from "./start-work-client";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function StartWorkByReportPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { reportNumber } = await params;

    if (user.role !== "BMS") {
        redirect(`/dashboard/reports/${reportNumber}`);
    }

    const report = await getReportForStartWork(reportNumber, user.NIK);
    if (!report) notFound();

    return (
        <StartWorkClient
            report={report}
            userNIK={user.NIK}
            userName={user.name}
        />
    );
}
