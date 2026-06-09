import { notFound, redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { getAuthUser } from "@/lib/authorization";
import { getScopedBmsProfile } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ nik: string }>;
};

export default async function BmsPerformanceDetailPage({ params }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["BMC", "BNM_MANAGER"].includes(user.role)) redirect("/dashboard");

    const { nik } = await params;
    const bms = await getScopedBmsProfile(decodeURIComponent(nik));
    if (!bms) notFound();

    return (
        <AdminDashboardShell
            user={user}
            title={bms.name}
            breadcrumbs={[
                {
                    label: "Performa BMS",
                    href: "/dashboard/bms-performance",
                },
                { label: bms.name },
            ]}
            contentClassName="h-full"
        >
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <UserRound />
                    </EmptyMedia>
                    <EmptyTitle>Sedang dalam pengembangan</EmptyTitle>
                    <EmptyDescription>
                        Detail performa BMS {bms.name} ({bms.NIK}) akan
                        ditambahkan pada tahap berikutnya.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        </AdminDashboardShell>
    );
}
