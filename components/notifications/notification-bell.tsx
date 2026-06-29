"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePushSubscription } from "./use-push-subscription";

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    href: string;
    readAt: string | null;
    createdAt: string;
};

export function NotificationBell() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPending, startTransition] = useTransition();
    const push = usePushSubscription();

    const load = useCallback(() => {
        fetch("/api/notifications")
            .then((r) => (r.ok ? (r.json() as Promise<{ items: NotificationItem[]; unreadCount: number }>) : null))
            .then((data) => {
                if (!data) return;
                setItems(data.items);
                setUnreadCount(data.unreadCount);
            });
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markRead = (id?: string) => {
        startTransition(async () => {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(id ? { id } : { all: true }),
            });
            load();
        });
    };

    return (
        <DropdownMenu onOpenChange={(open) => open && load()}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="relative rounded-full"
                    aria-label="Notifikasi"
                >
                    <Bell />
                    {unreadCount > 0 ? (
                        <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifikasi</span>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            className="text-xs text-primary"
                            disabled={isPending}
                            onClick={() => markRead()}
                        >
                            Tandai semua dibaca
                        </button>
                    ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem disabled>
                        {push.state === "active"
                            ? "Perangkat aktif menerima notifikasi"
                            : push.state === "unsupported"
                              ? "Notifikasi perangkat tidak didukung"
                              : "Notifikasi wajib diaktifkan"}
                    </DropdownMenuItem>
                    {push.state !== "active" && push.state !== "unsupported" ? (
                        <DropdownMenuItem
                            onSelect={(event) => {
                                event.preventDefault();
                                push.subscribe();
                            }}
                        >
                            Aktifkan notifikasi perangkat
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {items.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Belum ada notifikasi</EmptyTitle>
                            <EmptyDescription>
                                Notifikasi proses bisnis akan muncul di sini.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ScrollArea className="max-h-80">
                        {items.map((item) => (
                            <DropdownMenuItem key={item.id} asChild>
                                <Link
                                    href={item.href}
                                    className="flex flex-col items-start"
                                    onClick={() => markRead(item.id)}
                                >
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {item.body}
                                    </span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
