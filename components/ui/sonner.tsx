"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            className="toaster group top-6!"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:shadow-lg group-[.toaster]:border data-[type=success]:!bg-green-50 data-[type=success]:!text-green-800 data-[type=success]:!border-green-200 data-[type=error]:!bg-red-50 data-[type=error]:!text-red-800 data-[type=error]:!border-red-200 data-[type=warning]:!bg-amber-50 data-[type=warning]:!text-amber-800 data-[type=warning]:!border-amber-200 data-[type=info]:!bg-blue-50 data-[type=info]:!text-blue-800 data-[type=info]:!border-blue-200",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    icon: "group-data-[type=success]:text-green-600 group-data-[type=error]:text-red-600 group-data-[type=warning]:text-amber-600 group-data-[type=info]:text-blue-600",
                },
            }}
            style={{
                fontFamily: "var(--font-sans)",
            }}
            {...props}
        />
    );
};

export { Toaster };
