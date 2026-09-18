import { cn } from "@/lib/utils";
import Image from "next/image";

export function BrandLogo({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-1.5 backdrop-blur-sm md:gap-4 md:px-4 md:py-2",
                className
            )}
        >
            <Image
                src="/assets/Alfamart-Emblem.png"
                alt="Alfamart"
                width={120}
                height={120}
                className="h-6 w-auto object-contain drop-shadow-md md:h-8"
                priority
            />

            <div className="h-4 w-px rounded-full bg-white/20 md:h-5" />

            <div className="flex items-center gap-2">
                <Image
                    src="/assets/Building-Logo.png"
                    alt="SPARTA Logo"
                    width={60}
                    height={60}
                    className="h-6 w-auto object-contain drop-shadow-md md:h-8"
                    priority
                />
                <div className="flex flex-col items-end leading-none text-white">
                    <span className="text-sm font-bold tracking-wider">
                        SPARTA
                    </span>
                    <span className="text-[10px] text-white/90">
                        Maintenance
                    </span>
                </div>
            </div>
        </div>
    );
}
