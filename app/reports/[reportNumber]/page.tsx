import { redirect } from "next/navigation";

type Props = {
    params: Promise<{ reportNumber: string }>;
};

export default async function ReportDetailRedirectPage({ params }: Props) {
    const { reportNumber } = await params;
    redirect(`/dashboard/reports/${reportNumber}`);
}
