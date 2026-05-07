"use client";

import { useRouter } from "next/navigation";
import {
    FileText,
    CheckCircle,
    Users,
    Wallet,
    ArrowRight,
    TrendingUp,
} from "lucide-react";

function formatRp(n: number): string {
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

type CardDef = {
    id: string;
    title: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    gradient: string;
    iconBg: string;
    iconColor: string;
    badge?: string;
    badgeColor?: string;
    clickable: boolean;
    action?: "nav-reports" | "nav-reports-completed" | "open-realisasi";
};

type Props = {
    totalReports: number;
    completed: number;
    activeUsers: number;
    avgRealisasi: number;
};

export function AdminStatCards({
    totalReports,
    completed,
    activeUsers,
    avgRealisasi,
}: Props) {
    const router = useRouter();

    const year = new Date().getFullYear();

    const cards: CardDef[] = [
        {
            id: "total-laporan",
            title: "Total Laporan",
            value: totalReports.toLocaleString("id-ID"),
            sub: `Semua laporan non-draft ${year}`,
            icon: FileText,
            gradient: "from-blue-500 to-blue-600",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            clickable: true,
            action: "nav-reports",
        },
        {
            id: "laporan-selesai",
            title: "Laporan Selesai",
            value: completed.toLocaleString("id-ID"),
            sub: `Disetujui BnM Manager (${year})`,
            icon: CheckCircle,
            gradient: "from-emerald-500 to-emerald-600",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            badge:
                totalReports > 0
                    ? `${Math.round((completed / totalReports) * 100)}%`
                    : "0%",
            badgeColor: "bg-white/20 text-white",
            clickable: true,
            action: "nav-reports-completed",
        },
        {
            id: "user-aktif",
            title: "User Sedang Aktif",
            value: activeUsers.toLocaleString("id-ID"),
            sub: "Aktivitas 5 menit terakhir",
            icon: Users,
            gradient: "from-amber-500 to-orange-500",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            clickable: false,
        },
        {
            id: "rata-realisasi",
            title: "Rata-rata Realisasi",
            value: formatRp(avgRealisasi),
            sub: `Per pekerjaan selesai (${year})`,
            icon: Wallet,
            gradient: "from-violet-500 to-purple-600",
            iconBg: "bg-white/20",
            iconColor: "text-white",
            clickable: true,
            action: "open-realisasi",
        },
    ];

    function handleCardClick(card: CardDef) {
        if (!card.clickable || !card.action) return;
        if (card.action === "nav-reports") {
            router.push("/dashboard/reports");
        } else if (card.action === "nav-reports-completed") {
            router.push("/dashboard/reports?status=COMPLETED");
        } else if (card.action === "open-realisasi") {
            router.push("/dashboard/realisasi");
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        className={`
                                relative overflow-hidden rounded-xl p-5
                                bg-gradient-to-br ${card.gradient}
                                text-white shadow-lg
                                transition-all duration-200
                                ${
                                    card.clickable
                                        ? "cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                                        : ""
                                }
                            `}
                    >
                        {/* Background decoration */}
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                        <div className="absolute -right-2 -bottom-6 h-20 w-20 rounded-full bg-white/5" />

                        {/* Header row */}
                        <div className="relative flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${card.iconBg}`}>
                                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                            </div>
                            <div className="flex items-center gap-2">
                                {card.badge && (
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}
                                    >
                                        {card.badge}
                                    </span>
                                )}
                                {card.clickable && (
                                    <ArrowRight className="h-4 w-4 text-white/60" />
                                )}
                            </div>
                        </div>

                        {/* Value */}
                        <div className="relative">
                            <p className="text-3xl font-bold tracking-tight leading-none mb-1">
                                {card.value}
                            </p>
                            <p className="text-sm font-semibold text-white/90 mb-0.5">
                                {card.title}
                            </p>
                            <p className="text-xs text-white/60">{card.sub}</p>
                        </div>

                        {/* Hover hint for clickable cards */}
                        {card.action === "open-realisasi" && (
                            <div className="relative mt-3 flex items-center gap-1 text-[11px] text-white/70 font-medium">
                                <TrendingUp className="h-3 w-3" />
                                Lihat detail per cabang &amp; bulan
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
