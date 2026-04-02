import Image from "next/image";
import { redirect } from "next/navigation";
import { getMaintenanceState } from "@/lib/maintenance";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MaintenancePage() {
    const { enabled, message } = getMaintenanceState();

    if (!enabled) {
        redirect("/");
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 md:gap-4">
                <Image
                    src="/assets/Alfamart-Emblem.png"
                    alt="Alfamart"
                    width={120}
                    height={120}
                    className="h-8 w-auto md:h-10 object-contain"
                    priority
                />

                <div className="h-6 md:h-8 w-px bg-muted" />

                <div className="flex items-center gap-2">
                    <Image
                        src="/assets/Building-Logo.png"
                        alt="SPARTA Logo"
                        width={60}
                        height={60}
                        className="h-8 w-auto md:h-10 object-contain"
                        priority
                    />
                    <div className="flex flex-col items-start leading-none">
                        <span className="font-bold text-sm md:text-base tracking-wider">
                            SPARTA
                        </span>
                        <span className="text-[10px] opacity-80 font-light">
                            Maintenance
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center text-lg font-bold">
                        Sistem Sedang dalam Perbaikan
                    </CardTitle>
                    <CardDescription className="text-center">
                        {message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground text-center">
                        Mohon tunggu hingga proses selesai, lalu cek ulang
                        status halaman ini.
                    </p>
                    <form action="/maintenance" method="get">
                        <Button type="submit" className="w-full">
                            Periksa Status Lagi
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
