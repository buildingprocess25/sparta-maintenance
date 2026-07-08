import Image from "next/image";
import { cn } from "@/lib/utils";

type BmsWelcomeCardProps = {
  name: string;
  balance?: number;
  className?: string;
};

export function BmsWelcomeCard({
  name,
  balance = 2500000,
  className,
}: BmsWelcomeCardProps) {
  const formattedBalance = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg",
        className,
      )}
    >
      <div className="relative z-10 flex w-[65%] flex-col p-4 sm:p-5">
        <h3
          className="truncate font-heading text-lg font-bold leading-tight tracking-tight sm:text-xl"
          title={`Welcome ${name}`}
        >
          Welcome {name}
        </h3>
        <p className="mt-1 text-xs leading-snug text-primary-foreground/90">
          Sisa saldo anda minggu ini:
        </p>

        <div className="mt-4 inline-flex self-start rounded-xl bg-black/10 px-4 py-2.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/90">
            Fitur Segera Hadir
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-24 -right-16 top-1 h-[150%] w-[80%] max-w-[280px]">
        <Image
          src="/assets/dashboard.png"
          alt="Dashboard Character"
          fill
          className="object-contain object-top drop-shadow-xl"
          priority
        />
      </div>
    </div>
  );
}
