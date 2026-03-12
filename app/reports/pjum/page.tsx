import { requireRole } from "@/lib/authorization";
import { getPjumBmsUsers } from "./actions";
import { PjumView } from "./_components/pjum-view";

export const metadata = {
    title: "Buat PJUM — SPARTA Maintenance",
};

export default async function PjumPage() {
    const user = await requireRole("BMC");
    const bmsUsers = await getPjumBmsUsers(user.branchNames);

    return <PjumView bmsUsers={bmsUsers} />;
}
