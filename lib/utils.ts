import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function capitalizeEachWord(str: string): string {
    return str
        .toLowerCase()
        .split(" ")
        .map((w) =>
            w.length === 0 ? "" : w.charAt(0).toUpperCase() + w.slice(1),
        )
        .join(" ");
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}
