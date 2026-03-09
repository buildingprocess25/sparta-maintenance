import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return (
                <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80"
                >
                    Menunggu Persetujuan Estimasi
                </Badge>
            );
        case "ESTIMATION_APPROVED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 hover:bg-green-100/80"
                >
                    Estimasi Disetujui
                </Badge>
            );
        case "ESTIMATION_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800 hover:bg-orange-100/80"
                >
                    Estimasi Ditolak (Revisi)
                </Badge>
            );
        case "ESTIMATION_REJECTED":
            return <Badge variant="destructive">Estimasi Ditolak</Badge>;
        case "IN_PROGRESS":
            return (
                <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-100/80"
                >
                    Sedang Dikerjakan
                </Badge>
            );
        case "PENDING_REVIEW":
            return (
                <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 hover:bg-purple-100/80"
                >
                    Menunggu Review Penyelesaian
                </Badge>
            );
        case "REVIEW_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800 hover:bg-orange-100/80"
                >
                    Ditolak (Revisi)
                </Badge>
            );
        case "APPROVED_BMC":
            return (
                <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-800 hover:bg-teal-100/80"
                >
                    Menunggu Persetujuan BnM Manager
                </Badge>
            );
        case "COMPLETED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 hover:bg-purple-100/80"
                >
                    Selesai
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}
