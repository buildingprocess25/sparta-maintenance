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
